import React from 'react';
import { Loader2, Sparkles, Cpu, Factory } from 'lucide-react';

interface Props {
  message?: string;
}

export default function AiLoadingState({ message = 'Modliq AI is analyzing manufacturing parameters...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-slate-250 border-dashed rounded-2xl min-h-[160px] animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="w-5 h-5 text-[#2B70AB] animate-spin" />
        <Sparkles className="w-5 h-5 text-[#2B70AB]" />
      </div>
      <p className="text-sm font-semibold text-[#1B2A4A]">{message}</p>
      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500">
        <Factory className="w-3.5 h-3.5" />
        <span>Correlating process parameters & material lots...</span>
      </div>
    </div>
  );
}
