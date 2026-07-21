'use client';

import {
  LayoutDashboard, FileSpreadsheet, Target, Activity,
  CheckCircle2, ChevronRight, Upload, ShieldCheck,
  ShieldAlert, ShieldX, Truck, Factory, Zap, Sparkles
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePipelineStore, DatasetHealthReport } from '@/store/pipelineStore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AiInsightCard from '@/components/ai/AiInsightCard';
import { isExtendedModulesEnabled } from '@/lib/feature-flags';

// ---------------------------------------------------------------------------
// Health score helpers
// ---------------------------------------------------------------------------
function getStatusStyle(status: DatasetHealthReport['status']) {
  switch (status) {
    case 'excellent':   return { color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: 'Excellent' };
    case 'good':        return { color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500',    label: 'Good' };
    case 'needs_review':return { color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500',   label: 'Needs Review' };
    case 'risky':       return { color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-500',  label: 'Risky' };
    case 'not_recommended': return { color: 'text-red-700', bg: 'bg-red-50',     dot: 'bg-red-500',     label: 'Not Recommended' };
    default:            return { color: 'text-slate-700',   bg: 'bg-slate-50',   dot: 'bg-slate-400',   label: 'Unknown' };
  }
}

function getStatusIcon(status: DatasetHealthReport['status']) {
  if (status === 'excellent' || status === 'good') return <ShieldCheck className="w-4 h-4" />;
  if (status === 'needs_review') return <ShieldAlert className="w-4 h-4" />;
  return <ShieldX className="w-4 h-4" />;
}

export default function DashboardPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { filename, analytics, result, intent, healthReport } = usePipelineStore();

  const [opsOee, setOpsOee] = useState<string | null>(null);
  const [scRisk, setScRisk] = useState<string | null>(null);
  const [leanKaizens, setLeanKaizens] = useState<number | null>(null);

  const extendedEnabled = isExtendedModulesEnabled();

  useEffect(() => {
    if (!filename) return;

    if (extendedEnabled) {
      axios.get('/api/operations/summary')
        .then(res => {
          if (res.data?.summary) {
            setOpsOee(`${res.data.summary.oee}% (${res.data.summary.status})`);
          }
        })
        .catch(() => setOpsOee('N/A'));

      axios.get('/api/supply-chain/summary')
        .then(res => {
          if (res.data?.summary?.scorecard?.length > 0) {
            const worst = res.data.summary.scorecard[0];
            setScRisk(`${worst.supplierName} (${worst.status})`);
          }
        })
        .catch(() => setScRisk('N/A'));

      axios.get('/api/lean/summary')
        .then(res => {
          if (res.data?.summary) {
            setLeanKaizens(res.data.summary.openKaizenCount);
          }
        })
        .catch(() => setLeanKaizens(0));
    } else {
      setOpsOee(null);
      setScRisk(null);
      setLeanKaizens(null);
    }
  }, [filename, extendedEnabled]);

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

  const hStyle = healthReport ? getStatusStyle(healthReport.status) : null;
  const warningCount = healthReport?.warnings?.length ?? 0;

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto space-y-8">
      <header className="flex items-center justify-between">
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

      {/* ---- Metric cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Dataset */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2 text-slate-500">
            <FileSpreadsheet className="w-4 h-4" />
            <h3 className="text-sm font-medium">Active Dataset</h3>
          </div>
          <p className="text-lg font-semibold text-[#1B2A4A] truncate" title={filename}>{filename}</p>
          {analytics && (
            <p className="text-xs text-slate-400 mt-1">{analytics.totalRows} rows, {analytics.totalColumns} cols</p>
          )}
        </div>

        {/* Dataset Readiness */}
        {healthReport && hStyle ? (
          <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-between min-h-[140px] ${hStyle.bg}`}>
            <div className={`flex items-center gap-2 ${hStyle.color}`}>
              {getStatusIcon(healthReport.status)}
              <h3 className="text-sm font-medium">Dataset Readiness</h3>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${hStyle.color}`}>{healthReport.score}</span>
                <span className="text-slate-400 text-sm">/ 100</span>
              </div>
              <p className={`text-sm font-semibold ${hStyle.color}`}>{hStyle.label}</p>
            </div>
            <Link
              href={`/${userId}/modliq-console/data-upload`}
              className={`text-xs font-medium ${hStyle.color} hover:underline flex items-center gap-1 mt-2`}
            >
              View details <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <h3 className="text-sm font-medium">Dataset Readiness</h3>
            </div>
            <p className="text-sm text-slate-400">Not assessed yet</p>
            <Link
              href={`/${userId}/modliq-console/data-upload`}
              className="text-xs font-medium text-[#2B70AB] hover:underline flex items-center gap-1 mt-2"
            >
              Run health check <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Optimization Goal */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2 text-slate-500">
            <Target className="w-4 h-4" />
            <h3 className="text-sm font-medium">Optimization Goal</h3>
          </div>
          <p className="text-lg font-semibold text-[#1B2A4A] capitalize">
            {intent ? `${intent.goal_direction} ${intent.target}` : 'Not Defined'}
          </p>
          {intent && (
            <p className="text-xs text-slate-400 truncate">{intent.features.length} controllable features</p>
          )}
        </div>

        {/* Latest Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2 text-slate-500">
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
            <p className="text-xs text-emerald-600 font-medium">+{result.yield_improvement.toFixed(2)} yield improvement</p>
          )}
        </div>
      </div>

      {/* ---- Operations, Supply Chain, and Lean Summary Cards ---- */}
      {extendedEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Operations OEE */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center gap-2 text-slate-500">
            <Factory className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Operations OEE</h4>
          </div>
          <p className="text-lg font-extrabold text-[#1B2A4A]">{opsOee || 'N/A'}</p>
          <Link
            href={`/${userId}/modliq-console/operations`}
            className="text-xs font-semibold text-[#2B70AB] hover:underline flex items-center gap-1 mt-2"
          >
            Manage Operations <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Supply Chain Risk */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center gap-2 text-slate-500">
            <Truck className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Supply Chain Risk</h4>
          </div>
          <p className="text-lg font-extrabold text-[#1B2A4A] truncate">{scRisk || 'No risks registered'}</p>
          <Link
            href={`/${userId}/modliq-console/supply-chain`}
            className="text-xs font-semibold text-[#2B70AB] hover:underline flex items-center gap-1 mt-2"
          >
            Review Suppliers <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Open Kaizen Actions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center gap-2 text-slate-500">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Open Kaizen Cards</h4>
          </div>
          <p className="text-lg font-extrabold text-[#1B2A4A]">{leanKaizens !== null ? `${leanKaizens} cards active` : '0 cards active'}</p>
          <Link
            href={`/${userId}/modliq-console/lean`}
            className="text-xs font-semibold text-[#2B70AB] hover:underline flex items-center gap-1 mt-2"
          >
            Open Lean Board <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      )}

      {/* AI Executive Summary Card */}
      <AiInsightCard module="dashboard" />

      {/* Quick links row */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-2">
        <Link
          href={`/${userId}/modliq-console/goal`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Configure Goal <ChevronRight className="w-4 h-4" />
        </Link>
        <Link
          href={`/${userId}/modliq-console/results`}
          className={`text-sm font-medium flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${result?.success ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-slate-400 pointer-events-none'}`}
        >
          View Results <ChevronRight className="w-4 h-4" />
        </Link>
        <Link
          href={`/${userId}/modliq-console/studio/quality`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Quality Studio <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

