import OpenAI from 'openai';

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
  timeoutMs = 30000,
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
    defaultModel = process.env.AI_MODEL_FAST || 'meta/llama-3.3-70b-instruct';
  } else {
    baseURL = 'https://openrouter.ai/api/v1';
    defaultModel = 'openai/gpt-4o-mini';
  }

  const selectedModel = model || defaultModel;

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

    const response = await client.chat.completions.create(
      {
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        signal: controller.signal,
        headers: extraHeaders,
      }
    );

    return (
      response.choices?.[0]?.message?.content?.trim() ||
      JSON.stringify({
        success: false,
        message: 'AI response was empty. Deterministic Modliq results are still available.'
      })
    );
  } catch (error: any) {
    console.error(`LLM Call failed for provider ${provider}:`, error);
    
    // If primary failed, try fallback immediately once (Groq -> NVIDIA fallback)
    if (provider === 'groq' && nvidiaKey) {
      console.log('Attempting backup fallback to NVIDIA NIM...');
      try {
        const backupClient = new OpenAI({
          apiKey: nvidiaKey,
          baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        });
        const response = await backupClient.chat.completions.create({
          model: 'meta/llama-3.3-70b-instruct',
          temperature,
          max_tokens: maxTokens,
          response_format: jsonMode ? { type: 'json_object' } : undefined,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        return response.choices?.[0]?.message?.content?.trim() || '';
      } catch (backupErr) {
        console.error('NVIDIA NIM Backup fallback also failed:', backupErr);
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
