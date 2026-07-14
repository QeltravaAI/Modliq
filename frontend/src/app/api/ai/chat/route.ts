import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { buildWorkspaceAIContext } from '@/lib/ai/context-builder';
import { chatPrompt, getSystemPrompt } from '@/lib/ai/prompt-templates';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { message, messages = [] } = body;

    const groqKey = process.env.GROQ_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    const key = groqKey || nvidiaKey;
    if (!key) {
      return NextResponse.json({
        success: false,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI features require an API key to be configured. Deterministic Modliq features are still available.'
      });
    }

    const workspaceContext = await buildWorkspaceAIContext(userId);

    const systemPrompt = getSystemPrompt(false) + `\nAnswer the user's questions about their manufacturing workspace. Always use calculations from the workspace context.`;
    const userPrompt = chatPrompt(message || 'Summarize current stats', workspaceContext);

    const client = new OpenAI({
      apiKey: key,
      baseURL: groqKey ? 'https://api.groq.com/openai/v1' : (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'),
    });

    const model = groqKey 
      ? (process.env.AI_MODEL_FAST || 'llama-3.3-70b-versatile')
      : (process.env.AI_MODEL_FAST || 'meta/llama-3.3-70b-instruct');

    // Return standard JSON response for MVP simplicity and robust UI rendering
    const response = await client.chat.completions.create({
      model,
      temperature: 0.6,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      answer: content,
      suggestedActions: [
        'How can I improve OEE?',
        'Analyze raw material risks',
        'Recommend next Kaizen steps'
      ],
      referencedData: [
        workspaceContext.activeDatasetFilename || 'No dataset loaded',
        workspaceContext.operations ? `OEE: ${Math.round(workspaceContext.operations.avgOee * 100)}%` : 'OEE: N/A'
      ]
    });

  } catch (error) {
    console.error('Error in AI Copilot Chat:', error);
    return NextResponse.json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'AI Copilot is currently offline. Your calculations remain functional.'
    }, { status: 500 });
  }
}
