'use client';

import React, { use, useState, useRef } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Loader2,
  Database, List, Hash, ShieldCheck, ShieldAlert, ShieldX,
  Info, TrendingUp, Zap,
} from 'lucide-react';
import { usePipelineStore, DatasetHealthReport } from '@/store/pipelineStore';
import { getDatasetHealth } from '@/services/dataset.service';
import AiInsightCard from '@/components/ai/AiInsightCard';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/utils/api';

interface DatasetMetadata {
  totalRows: number;
  totalColumns: number;
  missingValues: number;
  numericColumns: string[];
  categoricalColumns: string[];
}

// ---------------------------------------------------------------------------
// Health score colour + label helpers
// ---------------------------------------------------------------------------
function getStatusConfig(status: DatasetHealthReport['status']) {
  switch (status) {
    case 'excellent':
      return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'Excellent' };
    case 'good':
      return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', bar: 'bg-blue-500', label: 'Good' };
    case 'needs_review':
      return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', label: 'Needs Review' };
    case 'risky':
      return { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500', label: 'Risky' };
    case 'not_recommended':
      return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', label: 'Not Recommended' };
    default:
      return { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', bar: 'bg-slate-400', label: 'Unknown' };
  }
}

function getSeverityIcon(severity: string) {
  if (severity === 'high') return <ShieldX className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
  if (severity === 'medium') return <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
}

// ---------------------------------------------------------------------------
// Health panel component
// ---------------------------------------------------------------------------
function HealthPanel({ report, loading }: { report: DatasetHealthReport | null; loading: boolean }) {
  const [showAi, setShowAi] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Dataset Health Check</h3>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#2B70AB]" />
          <span>Analyzing dataset quality…</span>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const cfg = getStatusConfig(report.status);
  const scorePct = report.score;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} shadow-sm p-5 mt-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${cfg.color}`} />
          <h3 className="text-sm font-semibold text-slate-800">Dataset Health Check</h3>
        </div>
        {report.sampled && (
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
            Sampled ({report.rowsAnalyzed.toLocaleString()} / {report.totalRows.toLocaleString()} rows)
          </span>
        )}
      </div>

      {/* Score */}
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-3xl font-bold ${cfg.color}`}>{report.score}</span>
        <span className="text-slate-400 text-lg mb-0.5">/ 100</span>
        <span className={`ml-2 text-sm font-semibold ${cfg.color} mb-0.5`}>{cfg.label}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden mb-4 border border-white/40">
        <div
          className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
          style={{ width: `${scorePct}%` }}
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-white/60 rounded-lg p-2 text-center border border-white/40">
          <div className="font-semibold text-slate-800">{report.summary.rows}</div>
          <div className="text-slate-500">Rows</div>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center border border-white/40">
          <div className="font-semibold text-slate-800">{report.summary.columns}</div>
          <div className="text-slate-500">Columns</div>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center border border-white/40">
          <div className={`font-semibold ${report.summary.missingValues > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {report.summary.missingValues}
          </div>
          <div className="text-slate-500">Missing</div>
        </div>
      </div>

      {/* Suggested target */}
      {report.suggestedTarget && (
        <div className="bg-white/80 border border-blue-100 rounded-lg p-3 mb-3 flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-800">
              Possible target detected: <span className="font-bold">{report.suggestedTarget}</span>
            </p>
            <p className="text-xs text-blue-600 mt-0.5">Confirm this in the Goal step.</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="space-y-2 mb-3">
          {report.warnings.slice(0, 5).map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-white/60 rounded-lg px-3 py-2 border border-white/40">
              {getSeverityIcon(w.severity)}
              <p className="text-xs text-slate-700">{w.message}</p>
            </div>
          ))}
          {report.warnings.length > 5 && (
            <p className="text-xs text-slate-500 pl-1">+{report.warnings.length - 5} more warning(s)</p>
          )}
        </div>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div className="space-y-1 mb-3">
          {report.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <Zap className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Explainer Toggle */}
      <div className="mt-3 border-t border-white/60 pt-3">
        <button
          onClick={() => setShowAi(!showAi)}
          className="w-full text-xs font-bold text-[#2B70AB] hover:text-[#1B2A4A] bg-white border rounded-xl py-2 px-3 transition-colors shadow-sm mb-3"
        >
          {showAi ? 'Hide AI Explanation' : 'Explain Health Score with AI'}
        </button>
        {showAi && (
          <div className="mt-2 text-left">
            <AiInsightCard module="dataset-health" />
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 leading-relaxed border-t border-white/60 pt-2">
        This score estimates whether your dataset is ready for optimization. It does not guarantee production performance. Always validate recommended settings through controlled trials.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DataUploadPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const setDataset = usePipelineStore((s) => s.setDataset);
  const setHealthReport = usePipelineStore((s) => s.setHealthReport);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [previewPageSize, setPreviewPageSize] = useState<number>(10);
  const [previewPage, setPreviewPage] = useState<number>(1);

  const [healthLoading, setHealthLoading] = useState(false);
  const [healthReport, setLocalHealthReport] = useState<DatasetHealthReport | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistDatasetSelection = async (id: string) => {
    try {
      await fetch('/api/user/dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: id }),
      });
    } catch (err) {
      console.error('Failed to persist dataset:', err);
    }
  };

  /**
   * Run generic health check in parallel — never blocks the upload success flow.
   */
  const runGenericHealthCheck = async (dsId: string) => {
    setHealthLoading(true);
    setHealthError(null);
    setLocalHealthReport(null);
    try {
      const report = await getDatasetHealth(dsId, { mode: 'generic' });
      if (report?.success) {
        setLocalHealthReport(report);
        setHealthReport(report);
      } else {
        setHealthError('Health check returned an unexpected response.');
      }
    } catch {
      setHealthError('Health check could not be completed. You can continue, but data readiness could not be assessed.');
    } finally {
      setHealthLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setMetadata(null);
    setLocalHealthReport(null);

    const formData = new FormData();
    formData.append('dataset', file);

    try {
      const res = await authenticatedFetch(`/api/v1/datasets/upload/${resolvedParams.userId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to upload dataset');
      }

      setMetadata(data.analytics);
      setPreview(data.preview);
      setDatasetId(data.datasetId);
      setDataset(data.datasetId, data.analytics);
      persistDatasetSelection(data.datasetId);

      // Run health check in parallel — does not block user flow
      runGenericHealthCheck(data.datasetId);

    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const loadDemoDataset = async () => {
    setIsUploading(true);
    setError(null);
    setMetadata(null);
    setLocalHealthReport(null);

    try {
      const res = await authenticatedFetch(`/api/v1/datasets/demo/${resolvedParams.userId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to load demo dataset');
      }

      setMetadata(data.analytics);
      setPreview(data.preview);
      setDatasetId(data.datasetId);
      setDataset(data.datasetId, data.analytics);
      persistDatasetSelection(data.datasetId);

      // Run health check in parallel
      runGenericHealthCheck(data.datasetId);

    } catch (err: any) {
      setError(err.message || 'An error occurred loading demo dataset');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Data Upload</h1>
        <p className="text-slate-500 text-sm mt-1">Upload your manufacturing process CSV logs here.</p>
      </header>

      <div className="flex gap-6 flex-col xl:flex-row items-start">
        {/* ---- Left column: upload controls + health panel ---- */}
        <div className="w-full xl:w-1/3 flex flex-col gap-4">
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors
              ${isDragging ? 'border-[#2B70AB] bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileChange}
            />

            {isUploading ? (
              <Loader2 className="w-10 h-10 text-[#2B70AB] mb-4 animate-spin" />
            ) : (
              <Upload className={`w-10 h-10 mb-4 ${isDragging ? 'text-[#2B70AB]' : 'text-slate-400'}`} />
            )}

            <h3 className="font-semibold text-slate-800 mb-1">
              {isUploading ? 'Processing...' : 'Drag & drop your CSV'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">or click to browse files</p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium shadow hover:bg-slate-800 transition-colors"
            >
              Select File
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#f8fafc] px-2 text-slate-400">or</span>
            </div>
          </div>

          <button
            onClick={loadDemoDataset}
            disabled={isUploading}
            className="w-full py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Database className="w-4 h-4 text-[#2B70AB]" />
            Load Demo Dataset
          </button>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-100 mt-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Continue button — shown as soon as upload succeeds, not blocked by health */}
          {metadata && (
            <button
              onClick={() => router.push(`/${resolvedParams.userId}/modliq-console/goal`)}
              className="w-full py-3 bg-[#2B70AB] text-white rounded-xl text-sm font-medium shadow hover:bg-[#1f5a91] transition-colors"
            >
              Continue to Define Goal →
            </button>
          )}

          {/* Health panel (loading / result / non-blocking error) */}
          {(healthLoading || healthReport) && (
            <HealthPanel report={healthReport} loading={healthLoading} />
          )}
          {healthError && !healthLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2 mt-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <p>{healthError}</p>
            </div>
          )}
        </div>

        {/* ---- Right column: preview table ---- */}
        <div className="w-full xl:w-2/3">
          {metadata ? (
            <div className="space-y-6">
              {/* Module Detection Banner */}
              {(() => {
                const { detectModules } = require('@/lib/column-detect');
                const cols = preview && preview[0] ? Object.keys(preview[0]) : [];
                const mods = detectModules(cols);

                return (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detected Modliq Modules</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Optimization
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Quality Studio
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                        mods.operations 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                          : 'text-slate-400 bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operations
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                        mods.supplyChain 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                          : 'text-slate-400 bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Supply Chain
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                        mods.lean 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                          : 'text-slate-400 bg-slate-50 border-slate-200 opacity-60'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lean Mfg
                      </div>
                    </div>
                    {mods.detectedColumns.operations.length > 0 && (
                      <p className="text-[10px] text-slate-500 mt-3">
                        Operational columns detected: <span className="font-semibold text-slate-700">{mods.detectedColumns.operations.join(', ')}</span>. Open Operations page to view summaries.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-slate-800">Dataset Ready</h3>
                  </div>
                  <span className="text-xs font-medium bg-[#2B70AB]/10 text-[#2B70AB] px-2.5 py-1 rounded-full">
                    ID: {datasetId}
                  </span>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm">
                        <List className="w-4 h-4" />
                        Total Rows
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{metadata.totalRows}</div>
                    </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm">
                      <Hash className="w-4 h-4" />
                      Columns
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{metadata.totalColumns}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm">
                      <Database className="w-4 h-4" />
                      Numeric
                    </div>
                    <div className="text-2xl font-bold text-[#2B70AB]">{metadata.numericColumns.length}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Missing
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{metadata.missingValues}</div>
                  </div>
                </div>

                {/* Data Preview Table */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-800">Data Preview</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Rows per page:</span>
                      <select
                        value={previewPageSize}
                        onChange={(e) => { setPreviewPageSize(Number(e.target.value)); setPreviewPage(1); }}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:border-[#2B70AB] outline-none"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-600 bg-slate-50 uppercase border-b border-slate-200">
                        <tr>
                          {preview && preview[0] ? Object.keys(preview[0]).map((key) => (
                            <th key={key} className="px-4 py-3 font-medium whitespace-nowrap">{key}</th>
                          )) : <th className="px-4 py-3">No preview available</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(preview || [])
                          .slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize)
                          .map((row, idx) => (
                            <tr key={idx} className="bg-white border-b border-slate-50 hover:bg-slate-50/50">
                              {row ? Object.values(row).map((val: any, vIdx) => (
                                <td key={vIdx} className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                  {val !== null && val !== undefined ? String(val) : <span className="text-slate-300 italic">null</span>}
                                </td>
                              )) : null}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-500">
                      Showing {Math.min((previewPage - 1) * previewPageSize + 1, (preview || []).length)} to {Math.min(previewPage * previewPageSize, (preview || []).length)} of {(preview || []).length} rows
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage === 1 || !preview?.length}
                        className="px-3 py-1 text-xs border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-600 px-2">Page {previewPage}</span>
                      <button
                        onClick={() => setPreviewPage(p => Math.min(Math.ceil((preview || []).length / previewPageSize), p + 1))}
                        disabled={previewPage >= Math.ceil((preview || []).length / previewPageSize) || !preview?.length}
                        className="px-3 py-1 text-xs border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="h-full bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 p-8 min-h-[400px]">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Upload a dataset or load the demo to see preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
