'use client';

import { useState, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RetryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retryCount: number;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options?: { immediate?: boolean; retries?: number; backoff?: boolean }
): RetryState<T> & { retry: () => void } {
  const immediate = options?.immediate ?? true;
  const maxRetries = options?.retries ?? 3;
  const backoff = options?.backoff ?? true;

  const [state, setState] = useState<RetryState<T>>({
    data: null,
    loading: immediate,
    error: null,
    retryCount: 0,
  });

  const execute = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        const result = await fn();
        setState({ data: result, loading: false, error: null, retryCount: attempt });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempt += 1;
        if (attempt <= maxRetries && backoff) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    setState((s) => ({
      ...s,
      loading: false,
      error: lastError?.message || 'Operation failed',
      retryCount: attempt,
    }));
  }, [fn, maxRetries, backoff]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { ...state, retry: execute };
}

export function Retryable({ error, onRetry, children }: { error: string | null; onRetry: () => void; children?: React.ReactNode }) {
  if (!error) return children as React.ReactElement | null;

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-red-700">{error}</p>
      <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Retry
      </Button>
    </div>
  );
}
