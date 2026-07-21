'use client';

import React, { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Target, Sparkles, ChevronRight, Calculator, Loader2,
  ShieldCheck, ShieldAlert, ShieldX, CheckCircle2,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { parseGoal } from '@/services/optimization.service';
import { getDatasetHealth } from '@/services/dataset.service';
import { IntentState } from '@/store/pipelineStore';
import AiInsightCard from '@/components/ai/AiInsightCard';

export default function GoalPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { filename, analytics, intent, setIntent, setHealthReport, healthReport } = usePipelineStore();

  const EXAMPLE_GOALS = [
    "Maximize Yield above 95% while keeping Temperature below 90°C",
    "Minimize defects by reducing Pressure above 500 and Flow Rate below 2.5",
    "Maximize yield with Humidity between 40 and 60",
  ];

  const [goalText, setGoalText] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [examples, setExamples] = useState<string[]>([]);
  const [editableIntent, setEditableIntent] = useState<IntentState | null>(null);

  // Target-aware health check state
  const [targetHealthLoading, setTargetHealthLoading] = useState(false);
  const [targetHealthError, setTargetHealthError] = useState<string | null>(null);

  const columns = [
    ...(analytics?.numericColumns || []),
    ...(analytics?.categoricalColumns || []),
  ];

  const handleChipClick = useCallback((example: string) => {
    setGoalText(example);
    setParseError(null);
  }, []);

  const handleParse = useCallback(async () => {
    if (!goalText.trim()) return;
    setParsing(true);
    setParseError(null);
    setTargetHealthError(null);

    try {
      const result = await parseGoal(goalText, 'yield_optimizer', columns);
      const parsed: IntentState = {
        raw_text: result.raw_text,
        template_id: result.template_id,
        target: result.target,
        goal_direction: result.goal_direction as 'maximize' | 'minimize',
        threshold: result.threshold,
        features: result.features,
        constraints: result.constraints,
      };
      setEditableIntent(parsed);
      setExamples([]);

      // Run target-aware health check in parallel
      if (filename && result.target) {
        setTargetHealthLoading(true);
        try {
          const enriched = await getDatasetHealth(filename, {
            targetColumn: result.target,
            features: result.features || [],
            mode: 'target-aware',
          });
          if (enriched?.success) {
            setHealthReport(enriched);
          }
        } catch {
          setTargetHealthError('Target analysis could not be completed. You can continue with optimization.');
        } finally {
          setTargetHealthLoading(false);
        }
      }
    } catch (err: any) {
      const detail = err.response?.data;
      setParseError(detail?.error || 'Failed to parse goal');
      setExamples(detail?.examples || []);
    } finally {
      setParsing(false);
    }
  }, [goalText, columns, filename, setHealthReport]);

  const handleOptimize = useCallback(() => {
    if (!editableIntent) return;
    setIntent(editableIntent);
    router.push(`/${resolvedParams.userId}/modliq-console/optimization-progress`);
  }, [editableIntent, setIntent, router, resolvedParams]);

  if (!filename) {
    return (
      <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Define Goal</h1>
          <p className="text-slate-500 text-sm mt-1">Describe your optimization goal in plain English.</p>
        </header>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          Please upload or select a dataset first before defining an optimization goal.
        </div>
      </div>
    );
  }

  // Target analysis panel (from the currently persisted healthReport)
  const targetAnalysis = healthReport?.targetAnalysis;
  const showTargetPanel = !!editableIntent && (targetHealthLoading || !!targetAnalysis || !!targetHealthError);

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Define Goal</h1>
        <p className="text-slate-500 text-sm mt-1">Describe your optimization goal in plain English.</p>
      </header>

      {/* Readiness banner (generic report from upload) */}
      {healthReport && !editableIntent && healthReport.mode === 'generic' && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center gap-3 text-sm
          ${healthReport.score >= 75 ? 'bg-blue-50 border-blue-200 text-blue-800' :
            healthReport.score >= 60 ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-red-50 border-red-200 text-red-800'}`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>
            <span className="font-semibold">Dataset Readiness: {healthReport.score}/100 — {healthReport.status.replace('_', ' ')}</span>
            {healthReport.warnings.length > 0 && (
              <span className="ml-2 text-xs opacity-75">({healthReport.warnings.length} warning{healthReport.warnings.length !== 1 ? 's' : ''})</span>
            )}
          </span>
        </div>
      )}

      {/* Goal input */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Your Goal</label>
        <textarea
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          placeholder="e.g., Maximize Yield above 95% while keeping Temperature below 90°C"
          className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-[#2B70AB] focus:ring-1 focus:ring-[#2B70AB] outline-none resize-none text-sm"
        />

        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {EXAMPLE_GOALS.map((ex) => (
            <button
              key={ex}
              onClick={() => handleChipClick(ex)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors border border-slate-200"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleParse}
            disabled={parsing || !goalText.trim()}
            className="px-6 py-2.5 bg-[#2B70AB] text-white rounded-lg text-sm font-medium shadow hover:bg-[#1f5a91] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Parse Goal
              </>
            )}
          </button>

          {goalText.trim() && (
            <div>
              <button
                type="button"
                onClick={() => setShowCoach(!showCoach)}
                className="px-4 py-2.5 border border-[#D0E2F0] hover:border-[#2B70AB] bg-white text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                {showCoach ? 'Hide Coach' : 'Improve Goal with AI'}
              </button>
              {showCoach && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                   <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => setShowCoach(false)}
                       className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 font-bold text-sm"
                    >
                      Close [X]
                    </button>
                    <div className="p-6">
                      <AiInsightCard module="goal" rawGoal={goalText} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {editableIntent && (
            <button
              onClick={handleOptimize}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium shadow hover:bg-slate-800 transition-colors flex items-center gap-2 animate-bounce"
            >
              Optimize Settings
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {parseError && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
            <p className="font-medium mb-1">{parseError}</p>
            {examples.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-red-600 mb-1">Try one of these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => handleChipClick(ex)}
                      className="px-3 py-1.5 bg-white border border-red-200 text-red-800 rounded-full text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Parsed goal editor */}
      {editableIntent && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#2B70AB]" />
            Parsed Goal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Target Metric</label>
                <input
                  type="text"
                  value={editableIntent.target}
                  onChange={(e) => setEditableIntent({ ...editableIntent, target: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Direction</label>
                <select
                  value={editableIntent.goal_direction}
                  onChange={(e) => setEditableIntent({ ...editableIntent, goal_direction: e.target.value as 'maximize' | 'minimize' })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm"
                >
                  <option value="maximize">Maximize</option>
                  <option value="minimize">Minimize</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Target Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  value={editableIntent.threshold ?? ''}
                  onChange={(e) => setEditableIntent({ ...editableIntent, threshold: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-[#2B70AB] outline-none text-sm"
                  placeholder="e.g., 95"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Features to Optimize</label>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <label key={col} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-[#2B70AB] transition-colors">
                      <input
                        type="checkbox"
                        checked={editableIntent.features.includes(col)}
                        onChange={(e) => {
                          const newFeatures = e.target.checked
                            ? [...editableIntent.features, col]
                            : editableIntent.features.filter((f) => f !== col);
                          setEditableIntent({ ...editableIntent, features: newFeatures });
                        }}
                        className="rounded text-[#2B70AB] focus:ring-[#2B70AB]"
                      />
                      <span className="text-xs text-slate-700">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">ROI Formula Preview</label>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 shrink-0" />
                  <span>ROI = Volume × Value × (Expected Yield − Current Yield)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target analysis panel */}
      {showTargetPanel && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#2B70AB]" />
            <h3 className="text-sm font-semibold text-slate-800">Target Analysis</h3>
          </div>

          {targetHealthLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#2B70AB]" />
              <span>Analyzing target column quality…</span>
            </div>
          )}

          {targetHealthError && !targetHealthLoading && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <p>{targetHealthError}</p>
            </div>
          )}

          {!targetHealthLoading && targetAnalysis && (
            <div>
              {targetAnalysis.isUsableTarget ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Target <span className="font-bold">{targetAnalysis.targetColumn}</span> is suitable for optimization
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                  <ShieldX className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Target <span className="font-bold">{targetAnalysis.targetColumn}</span> has issues that may affect optimization quality
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                  <div className="font-bold text-slate-800">{targetAnalysis.uniqueValues}</div>
                  <div className="text-slate-500">Unique values</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                  <div className={`font-bold ${targetAnalysis.missingValues > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {targetAnalysis.missingValues}
                  </div>
                  <div className="text-slate-500">Missing</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                  <div className={`font-bold ${targetAnalysis.outlierCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {targetAnalysis.outlierCount}
                  </div>
                  <div className="text-slate-500">Outliers</div>
                </div>
              </div>

              {targetAnalysis.variance !== null && (
                <p className="text-xs text-slate-500 mb-2">
                  Variance: <span className="font-medium text-slate-700">{targetAnalysis.variance.toFixed(2)}</span>
                </p>
              )}

              {targetAnalysis.warnings.length > 0 && (
                <div className="space-y-1">
                  {targetAnalysis.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Leakage warnings from main warnings list */}
              {healthReport?.warnings
                .filter(w => w.code === 'TARGET_LEAKAGE')
                .map((w, i) => (
                  <div key={i} className="flex items-start gap-2 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <ShieldX className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{w.message}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
