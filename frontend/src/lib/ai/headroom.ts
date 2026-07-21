import { compress } from 'headroom-ai';
import OpenAI from 'openai';

export interface HeadroomCompressResult {
  messages: OpenAI.ChatCompletionMessageParam[];
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  compressionRatio: number;
  transformsApplied: string[];
}

export async function headroomCompressMessages(
  messages: OpenAI.ChatCompletionMessageParam[],
  model = 'gpt-4o'
): Promise<HeadroomCompressResult> {
  try {
    const result = await compress(messages as Array<{ role: string; content: string }>, { model });
    return {
      messages: result.messages as OpenAI.ChatCompletionMessageParam[],
      tokensBefore: result.tokensBefore ?? 0,
      tokensAfter: result.tokensAfter ?? 0,
      tokensSaved: result.tokensSaved ?? 0,
      compressionRatio: result.compressionRatio ?? 0,
      transformsApplied: result.transformsApplied ?? [],
    };
  } catch (err) {
    console.warn('Headroom compression failed, using original messages:', err);
    const fallbackTokens = messages.reduce((acc, m) => acc + ((typeof m.content === 'string' ? m.content : '')).length, 0);
    return {
      messages,
      tokensBefore: fallbackTokens,
      tokensAfter: fallbackTokens,
      tokensSaved: 0,
      compressionRatio: 0,
      transformsApplied: [],
    };
  }
}
