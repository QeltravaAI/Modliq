import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import { callLLM } from '@/lib/ai/llm-client';
import { capaPrompt, getSystemPrompt } from '@/lib/ai/prompt-templates';

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

    const body = await request.json();
    const { problemStatement, evidence = {} } = body;

    if (!problemStatement) {
      return NextResponse.json({ error: 'Missing problem statement' }, { status: 400 });
    }

    const systemPrompt = getSystemPrompt(true);
    const userPrompt = capaPrompt(problemStatement, evidence);

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
    console.error('Error generating AI CAPA plan:', error);
    return NextResponse.json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'AI CAPA generation failed. Calculations are still functional.'
    }, { status: 500 });
  }
}
