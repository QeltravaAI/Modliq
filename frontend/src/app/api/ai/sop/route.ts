import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { callLLM } from '@/lib/ai/llm-client';
import { buildWorkspaceAIContext } from '@/lib/ai/context-builder';
import { getSystemPrompt, sopPrompt } from '@/lib/ai/prompt-templates';

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
    const context = await buildWorkspaceAIContext(userId);

    if (!context.optimizationResult) {
      return NextResponse.json({
        success: false,
        message: 'No active optimization result found to generate SOP for.'
      }, { status: 400 });
    }

    const systemPrompt = getSystemPrompt(true);
    const userPrompt = sopPrompt(
      context.activeDatasetFilename || 'Active Dataset',
      context.goal,
      context.optimizationResult,
      context.datasetHealth
    );

    const rawResponse = await callLLM({
      systemPrompt,
      userPrompt,
      model: process.env.AI_MODEL_REASONING || undefined,
      jsonMode: true
    });

    let parsed = JSON.parse(rawResponse);
    if (parsed.code === 'AI_NOT_CONFIGURED' || parsed.code === 'AI_DISABLED') {
      return NextResponse.json(parsed);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error generating AI SOP:', error);
    return NextResponse.json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'AI SOP generation failed. Calculations are still functional.'
    }, { status: 500 });
  }
}
