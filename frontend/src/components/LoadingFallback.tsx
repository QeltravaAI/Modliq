'use client';

import { Loader2 } from 'lucide-react';

export function LoadingFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin text-[#2B70AB]" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}
