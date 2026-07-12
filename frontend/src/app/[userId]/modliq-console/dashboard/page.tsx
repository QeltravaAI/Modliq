'use client';

import { LayoutDashboard } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your manufacturing runs and models.</p>
      </header>

      <div className="flex-1">
        <EmptyState 
          icon={LayoutDashboard}
          title="No Data Yet"
          description="Upload your first process dataset to start optimizing yields and analyzing quality."
        />
      </div>
    </div>
  );
}
