import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { callLLM } from '@/lib/ai/llm-client';
import { buildWorkspaceAIContext } from '@/lib/ai/context-builder';
import { getSystemPrompt, rootCausePrompt } from '@/lib/ai/prompt-templates';

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
    const body = await request.json();
    const { issue } = body;

    if (!issue) {
      return NextResponse.json({ error: 'Missing issue statement' }, { status: 400 });
    }

    const context = await buildWorkspaceAIContext(userId);
    const systemPrompt = getSystemPrompt(true);
    const userPrompt = rootCausePrompt(issue, context);

    const rawResponse = await callLLM({
      systemPrompt,
      userPrompt,
      model: process.env.AI_MODEL_REASONING || undefined, // Use reasoning model (Nemotron/70B)
      jsonMode: true
    });

    let parsed = JSON.parse(rawResponse);
    if (parsed.code === 'AI_NOT_CONFIGURED' || parsed.code === 'AI_DISABLED') {
      return NextResponse.json(parsed);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error generating AI root cause analysis:', error);
    return NextResponse.json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'AI root cause analysis failed. Your calculations remain functional.'
    }, { status: 500 });
  }
}
