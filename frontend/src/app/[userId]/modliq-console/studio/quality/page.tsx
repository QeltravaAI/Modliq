'use client';

import React, { useState, useEffect, use } from 'react';
import { Microscope, Loader2, AlertCircle, BarChart3, Activity, Gauge, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import axios from 'axios';
import { authenticatedFetch } from '@/utils/api';
import AiInsightCard from '@/components/ai/AiInsightCard';
import { runQcSummary, runControlChart } from '@/services/qc.service';

type NumericRow = Record<string, string | number>;

function ControlChart({ title, chart }: { title: string; chart: any }) {
  const points = chart.points as { value: number; status: string }[];
  if (!points || points.length === 0) return null;

  const allValues = points.map((p) => p.value);
  const cl = chart.center_line;
  const ucl = chart.ucl;
  const lcl = chart.lcl;
  const lo = Math.min(lcl, ...allValues);
  const hi = Math.max(ucl, ...allValues);
  const range = hi - lo || 1;
  const w = 640;
  const h = 200;
  const pad = 28;

  const y = (v: number) => h - pad - ((v - lo) / range) * (h - pad * 2);
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);

  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const limit = (v: number, label: string, color: string) => (
    <g>
      <line x1={pad} y1={y(v)} x2={w - pad} y2={y(v)} stroke={color} strokeDasharray="4 4" strokeWidth={1} />
      <text x={w - pad} y={y(v) - 3} textAnchor="end" fontSize={10} fill={color}>
        {label} {Number(v).toFixed(2)}
      </text>
    </g>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h4 className="text-sm font-semibold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 mb-3">
        CL {Number(cl).toFixed(2)} · UCL {Number(ucl).toFixed(2)} · LCL {Number(lcl).toFixed(2)}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {limit(ucl, 'UCL', '#dc2626')}
        {limit(cl, 'CL', '#2B70AB')}
        {limit(lcl, 'LCL', '#dc2626')}
        <polyline points={linePts} fill="none" stroke="#334155" strokeWidth={1.5} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={3}
            fill={p.status === 'violation' ? '#dc2626' : '#2B70AB'}
          />
        ))}
      </svg>
      <div
        className={`mt-2 text-xs font-medium ${
          chart.violations?.length ? 'text-red-600' : 'text-green-600'
        }`}
      >
        {chart.violations?.length
          ? `${chart.violations.length} point(s) outside control limits`
          : 'All points within control limits'}
      </div>
    </div>
  );
}

export default function QualityStudioPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const datasetId = usePipelineStore((s) => s.filename);
  const analytics = usePipelineStore((s) => s.analytics);

  const [rows, setRows] = useState<NumericRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [column, setColumn] = useState<string>('');
  const [lsl, setLsl] = useState<string>('');
  const [usl, setUsl] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [lotSize, setLotSize] = useState<string>('');
  const [aql, setAql] = useState<string>('1.5');
  const [defectsFound, setDefectsFound] = useState<string>('');

  const [showCapa, setShowCapa] = useState(false);
  const [capaLoading, setCapaLoading] = useState(false);
  const [capaContent, setCapaContent] = useState<any>(null);
  const [capaError, setCapaError] = useState<string | null>(null);

  const fetchCapa = async () => {
    setShowCapa(true);
    if (capaContent) return;
    if (!imr) {
      setCapaError('Control chart data is not available.');
      return;
    }
    setCapaLoading(true);
    setCapaError(null);
    try {
      const res = await axios.post('/api/ai/capa', {
        problemStatement: `Out of control violation on variable: ${column}. Stability warning: ${imr.stability.summary}`,
        evidence: {
          mean: summary?.mean,
          stability: imr.stability.summary
        }
      });
      if (res.data.code === 'AI_NOT_CONFIGURED') {
        setCapaError('AI features require an API key to be configured. Calculated quality metrics remain fully active.');
      } else {
        setCapaContent(res.data);
      }
    } catch (e) {
      console.error(e);
      setCapaError('Failed to generate CAPA plan.');
    } finally {
      setCapaLoading(false);
    }
  };

  useEffect(() => {
    // Hydrate the active dataset from the persisted workspace when the
    // in-memory pipeline store is empty. This is the root cause of the
    // "Quality Studio renders as a stub in production" defect: on a fresh
    // load (after refresh / navigating in) the Zustand store has no
    // datasetId even though one is persisted in Postgres.
    if (!datasetId) {
      authenticatedFetch('/api/user/workspace')
        .then((r) => r.json())
        .then((ws) => {
          if (ws && ws.activeDatasetId) {
            usePipelineStore.getState().hydrateWorkspace(ws);
          }
        })
        .catch(() => {});
    }
  }, [datasetId]);

  const [summary, setSummary] = useState<any>(null);
  const [imr, setImr] = useState<any>(null);
  const [capability, setCapability] = useState<any>(null);
  const [sampling, setSampling] = useState<any>(null);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    setLoadError(null);
    setRows(null);
    setColumn('');
    setSummary(null);
    setImr(null);
    setCapability(null);
    setSampling(null);
    authenticatedFetch(`/api/v1/datasets/${datasetId}/preview?rows=300`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success && data.error) throw new Error(data.error);
        const preview = data.preview || [];
        setRows(preview);
        const numericCols = (analytics?.numericColumns || []).filter(
          (c: string) => preview.length > 0 && preview[0][c] !== undefined
        );
        if (numericCols.length > 0) setColumn(numericCols[0]);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load dataset preview');
        setLoading(false);
      });
  }, [datasetId, analytics]);

  const values: number[] = (rows || [])
    .map((r) => (column ? Number(r[column]) : NaN))
    .filter((v) => !isNaN(v));

  // All SPC math is computed server-side (single QC engine). The client only
  // renders. See services/qc.service.ts -> backend -> ml-engine/qc_statistics.
  useEffect(() => {
    if (values.length < 2) {
      setSummary(null);
      setImr(null);
      return;
    }
    const rowsPayload = (rows || []).map((r) => ({ [column]: r[column] }));
    runQcSummary({ rows: rowsPayload, measurement_column: column })
      .then((d) => (d.success ? setSummary(d) : setSummary(null)))
      .catch(() => setSummary(null));
    runControlChart({ chart_type: 'imr', measurements: values, labels: values.map((_, i) => String(i + 1)) })
      .then((d) => (d.success ? setImr(d) : setImr(null)))
      .catch(() => setImr(null));
  }, [values, column, rows]);

  useEffect(() => {
    if (values.length < 2 || lsl === '' || usl === '') {
      setCapability(null);
      return;
    }
    import('@/services/qc.service').then(({ runCapabilityStudy }) =>
      runCapabilityStudy({ measurements: values, lsl: parseFloat(lsl), usl: parseFloat(usl), target: target !== '' ? parseFloat(target) : undefined })
        .then((d) => (d.success ? setCapability(d) : setCapability(null)))
        .catch(() => setCapability(null))
    );
  }, [values, lsl, usl, target]);

  useEffect(() => {
    if (lotSize === '' || values.length < 2) {
      setSampling(null);
      return;
    }
    import('@/services/qc.service').then(({ runAcceptanceSampling }) =>
      runAcceptanceSampling({ lot_size: parseInt(lotSize, 10), aql: parseFloat(aql), inspection_level: 'II', defects_found: defectsFound !== '' ? parseInt(defectsFound, 10) : undefined })
        .then((d) => (d.success ? setSampling(d) : setSampling(null)))
        .catch(() => setSampling(null))
    );
  }, [lotSize, aql, defectsFound, values]);

  if (!datasetId) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Quality Studio</h1>
          <p className="text-slate-500 text-sm mt-1">SPC charts, capability studies, and acceptance sampling.</p>
        </header>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Microscope className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">No active dataset.</p>
          <p className="text-slate-400 text-xs mt-1">Upload a dataset on the Data Upload page first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Quality Studio</h1>
        <p className="text-slate-500 text-sm mt-1">SPC charts, capability studies, and acceptance sampling.</p>
      </header>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading dataset preview…
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && rows && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Measurement Column</label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              className="w-full max-w-md p-2.5 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm"
            >
              {(analytics?.numericColumns || []).map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              {values.length} numeric values loaded from <span className="font-mono">{datasetId}</span>.
            </p>
          </div>

          {/* 1. Summary */}
          {summary && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#2B70AB]" /> Quality Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  ['Mean', summary.mean],
                  ['Median', summary.median],
                  ['Std Dev', summary.std_dev],
                  ['CV Range', `${summary.min} – ${summary.max}`],
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-lg font-bold text-slate-800">{String(val)}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600">{summary.insights.summary}</p>
            </div>
          )}

          {/* 2. Control charts */}
          {imr && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2B70AB]" /> Control Charts (I-MR)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ControlChart title="Individuals (I) Chart" chart={imr.individuals_chart} />
                <ControlChart title="Moving Range (MR) Chart" chart={imr.moving_range_chart} />
              </div>
               <div className="mt-3 text-sm text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <span>{imr.stability.summary}</span>
                 <button
                   onClick={fetchCapa}
                   className="text-xs font-semibold text-[#2B70AB] hover:text-[#1B2A4A] bg-white border border-[#D0E2F0] hover:border-[#2B70AB] px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                 >
                   <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                   Generate AI CAPA
                 </button>
               </div>
             </div>
           )}

          {/* 3. Capability */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#2B70AB]" /> Process Capability
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">LSL</label>
                <input type="number" value={lsl} onChange={(e) => setLsl(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm" placeholder="e.g. 90" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">USL</label>
                <input type="number" value={usl} onChange={(e) => setUsl(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm" placeholder="e.g. 100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Target</label>
                <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm" placeholder="optional" />
              </div>
              <div className="flex items-end">
                <span className="text-xs text-slate-400">
                  {capability ? `Cp ${capability.cp} · Cpk ${capability.cpk}` : 'Enter LSL & USL to compute'}
                </span>
              </div>
            </div>
            {capability && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {capability.insights.status === 'not_capable' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  <span className="font-medium text-slate-800">{capability.insights.label}</span>
                </div>
                <p className="text-sm text-slate-600">{capability.insights.summary}</p>
              </div>
            )}
          </div>

          {/* 4. Acceptance sampling */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2B70AB]" /> Acceptance Sampling (AQL)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Lot Size</label>
                <input type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm" placeholder="e.g. 1000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">AQL (%)</label>
                <input type="number" step="0.1" value={aql} onChange={(e) => setAql(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Defects Found</label>
                <input type="number" value={defectsFound} onChange={(e) => setDefectsFound(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm" placeholder="optional" />
              </div>
              <div className="flex items-end">
                <span className="text-xs text-slate-400">
                  {sampling ? `n=${sampling.sample_size}, Ac=${sampling.acceptance_number}` : 'Enter lot size to compute'}
                </span>
              </div>
            </div>
            {sampling && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {sampling.decision === 'accept' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : sampling.decision === 'reject' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Activity className="w-5 h-5 text-amber-500" />
                  )}
                  <span className="font-medium text-slate-800 capitalize">{sampling.decision}</span>
                </div>
                <p className="text-sm text-slate-600">{sampling.insights.summary}</p>
              </div>
            )}
          </div>

          {/* AI Quality Studio Card */}
          <AiInsightCard module="quality" />

          {showCapa && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
                <div className="px-6 py-4 border-b border-[#D0E2F0] bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-[#1B2A4A] text-sm">Corrective Action Preventive Action (CAPA) Plan</h3>
                  <button
                    onClick={() => setShowCapa(false)}
                    className="text-slate-500 hover:text-slate-700 font-bold text-sm"
                  >
                    Close [X]
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {capaLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2B70AB] mb-2" />
                      <span>Generating CAPA framework details...</span>
                    </div>
                  ) : capaError ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-4 border rounded-xl">{capaError}</p>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Problem Statement</h4>
                        <p className="text-sm font-semibold text-slate-800">{capaContent?.problemStatement}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Containment Actions</h4>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {capaContent?.containment?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Root Cause Hypotheses</h4>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {capaContent?.rootCauseHypotheses?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Corrective Actions</h4>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {capaContent?.correctiveActions?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Preventive Actions</h4>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {capaContent?.preventiveActions?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                      <div className="text-[10px] text-slate-400 italic pt-3 border-t">
                        AI-generated recommendation. Validate before production use.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
