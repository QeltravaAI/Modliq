'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary>
      <html lang="en">
        <body>
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 mb-2">Application Error</h1>
              <p className="text-sm text-slate-600 mb-4">
                Something critical went wrong. Try resetting the app or reloading.
              </p>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Try again
              </button>
              {error?.message && (
                <p className="mt-4 text-xs text-slate-400 break-words">
                  {error.message}
                </p>
              )}
            </div>
          </div>
        </body>
      </html>
    </ErrorBoundary>
  );
}
