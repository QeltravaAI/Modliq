import OpenAI from 'openai';
import { headroomCompressMessages } from './headroom';

const LLM_CACHE = new Map<string, { value: string; expiresAt: number }>();
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const CIRCUIT_STATES = new Map<string, { failures: number; lastFailure: number }>();
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;

function cacheKey(provider: string, model: string, messages: OpenAI.ChatCompletionMessageParam[]) {
  const normalized = messages.map((m) => `${m.role}:${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('|');
  return `${provider}:${model}:${normalized}`;
}

function isCircuitOpen(provider: string) {
  const state = CIRCUIT_STATES.get(provider);
  if (!state) return false;
  if (state.failures < CIRCUIT_FAILURE_THRESHOLD) return false;
  if (Date.now() - state.lastFailure > CIRCUIT_COOLDOWN_MS) {
    CIRCUIT_STATES.delete(provider);
    return false;
  }
  return true;
}

function recordFailure(provider: string) {
  const state = CIRCUIT_STATES.get(provider) || { failures: 0, lastFailure: 0 };
  state.failures += 1;
  state.lastFailure = Date.now();
  CIRCUIT_STATES.set(provider, state);
}

function recordSuccess(provider: string) {
  CIRCUIT_STATES.delete(provider);
}

export interface CallLLMParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  reasoning?: boolean;
  jsonMode?: boolean;
}

export async function callLLM({
  systemPrompt,
  userPrompt,
  model,
  maxTokens = 1500,
  temperature = 0.2,
  timeoutMs = 60000,
  jsonMode = false,
}: CallLLMParams): Promise<string> {
  const aiEnabled = process.env.AI_FEATURES_ENABLED !== 'false';
  if (!aiEnabled) {
    return JSON.stringify({
      success: false,
      code: 'AI_DISABLED',
      message: 'AI features are currently disabled. Deterministic Modliq features are still available.'
    });
  }

  // Attempt to resolve keys
  const groqKey = process.env.GROQ_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  let provider = process.env.LLM_PROVIDER || 'groq';

  // Auto fallback logic based on key availability
  if (provider === 'groq' && !groqKey) {
    if (nvidiaKey) {
      provider = 'nvidia';
    } else if (openrouterKey) {
      provider = 'openrouter';
    }
  } else if (provider === 'nvidia' && !nvidiaKey) {
    if (groqKey) {
      provider = 'groq';
    } else if (openrouterKey) {
      provider = 'openrouter';
    }
  }

  // Check if we have no configured keys for the selected provider
  const activeKey = provider === 'groq' ? groqKey : provider === 'nvidia' ? nvidiaKey : openrouterKey;
  if (!activeKey) {
    return JSON.stringify({
      success: false,
      code: 'AI_NOT_CONFIGURED',
      message: 'AI features require an API key to be configured. Deterministic Modliq features are still available.'
    });
  }

  // Setup client options based on provider
  let apiKey = activeKey;
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

  // An explicit `model` may come from AI_MODEL_REASONING (or a caller). That
  // value can belong to a different provider (e.g. an NVIDIA "omni" multimodal
  // model). Sending a foreign model name to the active provider causes errors
  // such as "this model does not support image input". Only honor an explicit
  // model when it is text-capable and matches the active provider's namespace.
  const providerNamespace: Record<string, string> = {
    groq: 'groq/',
    nvidia: 'nvidia/',
    openrouter: '',
  };
  let selectedModel = defaultModel;
  if (model) {
    const ns = providerNamespace[provider];
    const belongsToProvider =
      provider === 'openrouter'
        ? true // OpenRouter routes any model id through its proxy
        : model.startsWith(ns);
    selectedModel = belongsToProvider ? model : defaultModel;
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: false, // Security: server-side only
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const extraHeaders: Record<string, string> = {};
    if (provider === 'openrouter') {
      extraHeaders['HTTP-Referer'] = 'https://modliq.com';
      extraHeaders['X-Title'] = 'Modliq';
    }

    const rawMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const compressed = await headroomCompressMessages(rawMessages, selectedModel || 'gpt-4o');
    const messages = compressed.messages;

    if (compressed.tokensSaved > 0) {
      console.log(
        `[Headroom] Compressed LLM prompt: ${compressed.tokensBefore} -> ${compressed.tokensAfter} tokens ` +
          `(${compressed.compressionRatio > 0 ? Math.round(compressed.compressionRatio * 100) : 0}% reduction) ` +
          `transforms: ${compressed.transformsApplied.join(', ')}`
      );
    }

    const key = cacheKey(provider, selectedModel, messages);
    const cached = LLM_CACHE.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (isCircuitOpen(provider)) {
      return JSON.stringify({
        success: false,
        code: 'AI_ERROR',
        message: 'AI provider is temporarily unavailable. Deterministic Modliq results are still available.'
      });
    }

    const response = await client.chat.completions.create(
      {
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        messages,
      },
      {
        signal: controller.signal,
        headers: extraHeaders,
      }
    );

    const content = response.choices?.[0]?.message?.content?.trim() || JSON.stringify({
      success: false,
      message: 'AI response was empty. Deterministic Modliq results are still available.'
    });

    LLM_CACHE.set(key, { value: content, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });
    recordSuccess(provider);

    return content;
  } catch (error: any) {
    console.error(`LLM Call failed for provider ${provider}:`, error);
    recordFailure(provider);

    // If primary failed, try fallback immediately once (Groq -> NVIDIA fallback)
    if (provider === 'groq' && nvidiaKey && !isCircuitOpen('nvidia')) {
      console.log('Attempting backup fallback to NVIDIA NIM...');
      try {
        const backupClient = new OpenAI({
          apiKey: nvidiaKey,
          baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        });
        const backupRawMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];
        const backupCompressed = await headroomCompressMessages(backupRawMessages, 'meta/llama-3.3-70b-instruct');
        const backupMessages = backupCompressed.messages as OpenAI.ChatCompletionMessageParam[];

        const response = await backupClient.chat.completions.create({
          model: 'meta/llama-3.3-70b-instruct',
          temperature,
          max_tokens: maxTokens,
          response_format: jsonMode ? { type: 'json_object' } : undefined,
          messages: backupMessages,
        });
        const content = response.choices?.[0]?.message?.content?.trim() || '';
        recordSuccess('nvidia');
        return content;
      } catch (backupErr) {
        console.error('NVIDIA NIM Backup fallback also failed:', backupErr);
        recordFailure('nvidia');
      }
    }

    return JSON.stringify({
      success: false,
      code: 'AI_ERROR',
      message: 'AI insight could not be generated right now. Your calculated Modliq results are still available.'
    });
  } finally {
    clearTimeout(timeout);
  }
}
