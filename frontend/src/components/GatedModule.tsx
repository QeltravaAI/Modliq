'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { isExtendedModulesEnabled } from '@/lib/feature-flags';

export default function GatedModule({ title, description }: { title: string; description?: string }) {
  const enabled = isExtendedModulesEnabled();

  if (enabled) {
    return null;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">{title}</h1>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">This module is not available yet</h3>
          <p className="text-sm text-slate-500">
            Supply Chain, Operations, and Lean Manufacturing are being prepared for launch. Check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}
