'use client';

import React, { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Target, Sparkles, ChevronRight, Calculator, Loader2 } from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { parseGoal } from '@/services/optimization.service';
import { IntentState } from '@/store/pipelineStore';

export default function GoalPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { filename, analytics, intent, setIntent } = usePipelineStore();

  const EXAMPLE_GOALS = [
    "Maximize Yield above 95% while keeping Temperature below 90°C",
    "Minimize defects by reducing Pressure above 500 and Flow Rate below 2.5",
    "Maximize yield with Humidity between 40 and 60",
  ];

  const [goalText, setGoalText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [examples, setExamples] = useState<string[]>([]);
  const [editableIntent, setEditableIntent] = useState<IntentState | null>(null);

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

    try {
      const result = await parseGoal(goalText, 'yield_optimizer', columns);
      setEditableIntent({
        raw_text: result.raw_text,
        template_id: result.template_id,
        target: result.target,
        goal_direction: result.goal_direction as 'maximize' | 'minimize',
        threshold: result.threshold,
        features: result.features,
        constraints: result.constraints,
      });
      setExamples([]);
    } catch (err: any) {
      const detail = err.response?.data;
      setParseError(detail?.error || 'Failed to parse goal');
      setExamples(detail?.examples || []);
    } finally {
      setParsing(false);
    }
  }, [goalText, columns]);

  const handleOptimize = useCallback(() => {
    if (!editableIntent) return;
    setIntent(editableIntent);
    router.push(`/${resolvedParams.userId}/modliq-console/optimization-progress`);
  }, [editableIntent, setIntent, router]);

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

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Define Goal</h1>
        <p className="text-slate-500 text-sm mt-1">Describe your optimization goal in plain English.</p>
      </header>

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

          {editableIntent && (
            <button
              onClick={handleOptimize}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium shadow hover:bg-slate-800 transition-colors flex items-center gap-2"
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

      {editableIntent && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
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
    </div>
  );
}
