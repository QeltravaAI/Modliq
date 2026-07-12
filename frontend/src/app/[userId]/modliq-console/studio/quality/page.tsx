'use client';

import { Microscope } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function QualityStudioPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Quality Studio</h1>
        <p className="text-slate-500 text-sm mt-1">SPC charts, capability studies, and acceptance sampling.</p>
      </header>

      <div className="flex-1">
        <EmptyState 
          icon={Microscope}
          title="Quality Studio requires data"
          description="Please upload a dataset on the Data Upload page to run quality and stability checks."
        />
      </div>
    </div>
  );
}
