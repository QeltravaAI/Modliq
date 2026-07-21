import { describe, it, expect } from 'vitest';
import OpenAI from 'openai';
import { headroomCompressMessages } from '@/lib/ai/headroom';

describe('headroomCompressMessages', () => {
  it('returns original messages when compression is unavailable', async () => {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'user', content: 'Hello world' },
    ];
    const result = await headroomCompressMessages(messages, 'unknown-model');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Hello world');
    expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
  });
});
