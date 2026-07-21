import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import OpenAI from 'openai';
import { buildWorkspaceAIContext } from '@/lib/ai/context-builder';
import { chatPrompt, getSystemPrompt } from '@/lib/ai/prompt-templates';
import { headroomCompressMessages } from '@/lib/ai/headroom';

const CHAT_CACHE = new Map<string, { value: string; expiresAt: number }>();
const CHAT_CACHE_TTL = 2 * 60 * 1000;

function chatCacheKey(provider: string, model: string, messages: OpenAI.ChatCompletionMessageParam[]) {
  const normalized = messages.map((m) => `${m.role}:${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('|');
  return `${provider}:${model}:${normalized}`;
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
    const body = await request.json();
    const { message, messages = [] } = body;

    const groqKey = process.env.GROQ_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    let provider = process.env.LLM_PROVIDER || 'groq';

    // Fallback logic
    if (provider === 'groq' && !groqKey) {
      provider = nvidiaKey ? 'nvidia' : openrouterKey ? 'openrouter' : 'groq';
    } else if (provider === 'nvidia' && !nvidiaKey) {
      provider = groqKey ? 'groq' : openrouterKey ? 'openrouter' : 'nvidia';
    }

    const key = provider === 'groq' ? groqKey : provider === 'nvidia' ? nvidiaKey : openrouterKey;
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

    let baseURL = '';
    let defaultModel = '';

    if (provider === 'groq') {
      baseURL = 'https://api.groq.com/openai/v1';
      defaultModel = process.env.AI_MODEL_FAST || 'llama-3.3-70b-versatile';
    } else if (provider === 'nvidia') {
      baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
      defaultModel = process.env.AI_MODEL_NVIDIA_FAST || 'meta/llama-3.3-70b-instruct';
    } else {
      baseURL = 'https://openrouter.ai/api/v1';
      defaultModel = 'openai/gpt-4o-mini';
    }

    const client = new OpenAI({
      apiKey: key,
      baseURL,
    });

    const extraHeaders: Record<string, string> = {};
    if (provider === 'openrouter') {
      extraHeaders['HTTP-Referer'] = 'https://modliq.com';
      extraHeaders['X-Title'] = 'Modliq';
    }

    const rawMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userPrompt }
    ];

    const compressed = await headroomCompressMessages(rawMessages, defaultModel || 'gpt-4o-mini');
    const llmMessages = compressed.messages;

    const cacheKey = chatCacheKey(provider, defaultModel, rawMessages);
    const cached = CHAT_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        success: true,
        answer: cached.value,
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
    }

    if (compressed.tokensSaved > 0) {
      console.log(
        `[Headroom] Compressed chat prompt: ${compressed.tokensBefore} -> ${compressed.tokensAfter} tokens ` +
          `(${compressed.compressionRatio > 0 ? Math.round(compressed.compressionRatio * 100) : 0}% reduction)`
      );
    }

    // Return standard JSON response for MVP simplicity and robust UI rendering
    const response = await client.chat.completions.create({
      model: defaultModel,
      temperature: 0.6,
      max_tokens: 1024,
      messages: llmMessages,
    }, {
      headers: extraHeaders
    });

    const content = response.choices?.[0]?.message?.content || '';

    CHAT_CACHE.set(cacheKey, { value: content, expiresAt: Date.now() + CHAT_CACHE_TTL });

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
