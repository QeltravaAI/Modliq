import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { callLLM } from '@/lib/ai/llm-client';
import { buildWorkspaceAIContext } from '@/lib/ai/context-builder';
import * as templates from '@/lib/ai/prompt-templates';

const prisma = new PrismaClient();

// Memory rate limit tracker (in-memory, resets every minute)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 10) {
    return false; // Limit exceeded (10 requests per minute)
  }

  limit.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('modliq_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;
    if (!checkRateLimit(userId)) {
      return NextResponse.json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please limit AI requests to 10 per minute.'
      }, { status: 429 });
    }

    const body = await request.json();
    const { module, intent = 'general' } = body;

    if (!module) {
      return NextResponse.json({ error: 'Missing module name' }, { status: 400 });
    }

    // Build context
    const context = await buildWorkspaceAIContext(userId);

    // Simple context hashing for caching
    // Convert context properties into a simple hash string to compare changes
    const contextStr = JSON.stringify({
      activeDatasetId: context.activeDatasetId,
      datasetHealthScore: context.datasetHealth?.score,
      goalTarget: context.goal?.target,
      optSuccess: context.optimizationResult?.success,
      recordsCount: context.operations?.recordsCount,
      lotsCount: context.supplyChain?.lotsCount,
      openKaizenCount: context.lean?.openKaizenCount
    });

    const contextHash = `${module}_${intent}_${Buffer.from(contextStr).toString('base64').substring(0, 40)}`;

    // Check Cache (valid for 5 minutes)
    const cacheExpiry = new Date(Date.now() - 5 * 60 * 1000);
    const cached = await prisma.aiInsight.findFirst({
      where: {
        userId,
        module: contextHash,
        createdAt: { gte: cacheExpiry }
      }
    });

    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached.payload));
      } catch (e) {
        // Fall back to generating new insight if parsing cache fails
      }
    }

    // Select system and user prompts
    const systemPrompt = templates.getSystemPrompt(true);
    let userPrompt = '';

    switch (module) {
      case 'dashboard':
        userPrompt = templates.dashboardSummaryPrompt(context);
        break;
      case 'dataset-health':
        userPrompt = templates.datasetHealthPrompt(context.datasetHealth || context);
        break;
      case 'optimization':
        userPrompt = templates.optimizationPrompt(context.optimizationResult || context);
        break;
      case 'quality':
        userPrompt = templates.qualityPrompt(context.datasetPreviewSummary || context);
        break;
      case 'operations':
        userPrompt = templates.operationsPrompt(context.operations || context);
        break;
      case 'supply-chain':
        userPrompt = templates.supplyChainPrompt(context.supplyChain || context);
        break;
      case 'lean':
        userPrompt = templates.leanPrompt(context.lean || context);
        break;
      case 'goal':
        userPrompt = templates.goalCoachPrompt(body.rawGoal || '', context.datasetPreviewSummary?.columns || []);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported module' }, { status: 400 });
    }

    // Call LLM
    const rawResponse = await callLLM({
      systemPrompt,
      userPrompt,
      jsonMode: true
    });

    // Verify response is valid JSON
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch (e) {
      // If LLM returned unformatted error or plain text, wrap it
      parsedResponse = {
        success: false,
        title: 'Error Parsing AI Output',
        summary: 'The AI model returned an invalid JSON response structure.',
        keyFindings: [],
        risks: [],
        recommendations: [rawResponse || 'No details available.'],
        nextActions: [],
        disclaimer: 'AI-generated recommendation. Validate before production use.'
      };
    }

    // If API key is missing or failed, return the message directly
    if (parsedResponse.code === 'AI_NOT_CONFIGURED' || parsedResponse.code === 'AI_DISABLED') {
      return NextResponse.json(parsedResponse);
    }

    // Save to Cache
    await prisma.aiInsight.create({
      data: {
        userId,
        module: contextHash,
        title: parsedResponse.title || 'AI Analysis',
        summary: parsedResponse.summary || 'Summary',
        payload: JSON.stringify(parsedResponse)
      }
    });

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error generating general AI insight:', error);
    return NextResponse.json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'AI insight could not be generated right now. Your calculated Modliq results are still available.'
    }, { status: 500 });
  }
}
