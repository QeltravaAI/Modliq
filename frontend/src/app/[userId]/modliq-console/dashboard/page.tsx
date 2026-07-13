'use client';

import { LayoutDashboard, FileSpreadsheet, Target, Activity, CheckCircle2, ChevronRight, Upload } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePipelineStore } from '@/store/pipelineStore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { filename, analytics, result, intent } = usePipelineStore();

  if (!filename) {
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

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back. Here is your current workspace overview.</p>
        </div>
        <Link href={`/${userId}/modliq-console/data-upload`}>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            New Dataset
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <FileSpreadsheet className="w-4 h-4" />
            <h3 className="text-sm font-medium">Active Dataset</h3>
          </div>
          <p className="text-lg font-semibold text-[#1B2A4A] truncate" title={filename}>{filename}</p>
          {analytics && (
            <p className="text-xs text-slate-400 mt-1">{analytics.totalRows} rows, {analytics.totalColumns} cols</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <Target className="w-4 h-4" />
            <h3 className="text-sm font-medium">Optimization Goal</h3>
          </div>
          <p className="text-lg font-semibold text-[#1B2A4A] capitalize">
            {intent ? `${intent.goal_direction} ${intent.target}` : 'Not Defined'}
          </p>
          {intent && (
            <p className="text-xs text-slate-400 mt-1 truncate">{intent.features.length} controllable features</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <Activity className="w-4 h-4" />
            <h3 className="text-sm font-medium">Latest Status</h3>
          </div>
          <div className="flex items-center gap-2">
            {result?.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Activity className="w-5 h-5 text-slate-300" />
            )}
            <p className="text-lg font-semibold text-[#1B2A4A]">
              {result?.success ? 'Optimized' : 'Pending'}
            </p>
          </div>
          {result?.success && result.yield_improvement !== undefined && (
            <p className="text-xs text-emerald-600 font-medium mt-1">+{result.yield_improvement.toFixed(2)} yield improvement</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <Link href={`/${userId}/modliq-console/goal`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-between group">
            Configure Goal
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href={`/${userId}/modliq-console/results`} className={`text-sm font-medium flex items-center justify-between group ${result?.success ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 pointer-events-none'}`}>
            View Results
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href={`/${userId}/modliq-console/studio/quality`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-between group">
            Quality Studio
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
