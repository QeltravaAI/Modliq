'use client';

import React, { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { createOptimizationJob, getOptimizationJob } from '@/services/optimization.service';

type Stage = 'idle' | 'parsing_goal' | 'training_model' | 'searching_configurations' | 'done' | 'error';

const STAGE_LABELS: Record<Stage, string> = {
  idle: 'Ready',
  parsing_goal: 'Parsing Goal',
  training_model: 'Training Model',
  searching_configurations: 'Searching Configurations',
  done: 'Completed',
  error: 'Error',
};

const STAGES: Stage[] = ['parsing_goal', 'training_model', 'searching_configurations', 'done'];

export default function OptimizationProgressPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { intent, filename, setOptimization } = usePipelineStore();
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startOptimization = useCallback(async () => {
    if (!intent || !filename) return;
    setStage('parsing_goal');
    setProgress(10);
    setError(null);

    let jobId: string | null = null;

    try {
      // 1) Create the job (returns immediately).
      const created = await createOptimizationJob({
        filename,
        template_id: intent.template_id,
        intent: {
          target: intent.target,
          goal_direction: intent.goal_direction,
          threshold: intent.threshold,
          features: intent.features,
          constraints: intent.constraints,
        },
      });

      if (!created.success || !created.jobId) {
        throw new Error(created.error || 'Failed to start optimization');
      }
      jobId = created.jobId;

      // 2) Poll for status. The ML engine can take 20-60s+ (and >30s cold).
      let pollTicks = 0;
      pollRef.current = setInterval(async () => {
        try {
          const job = await getOptimizationJob(jobId!);
          pollTicks += 1;

          // Advance the visible staging while the job runs.
          if (job.status === 'running') {
            if (pollTicks === 1) {
              setStage('training_model');
              setProgress(35);
            } else if (pollTicks === 3) {
              setStage('searching_configurations');
              setProgress(65);
            } else {
              setProgress((p) => Math.min(90, p + 5));
            }
          } else if (job.status === 'completed') {
            stopPolling();
            if (job.result && job.result.metrics) {
              setStage('done');
              setProgress(100);
              setOptimization(jobId!, job.result);
              setTimeout(() => {
                router.push(`/${resolvedParams.userId}/modliq-console/results`);
              }, 800);
            } else {
              const msg = job.result?.error || 'Optimization returned no result';
              throw new Error(msg);
            }
          } else if (job.status === 'failed') {
            stopPolling();
            throw new Error(job.error || 'Optimization failed');
          }
        } catch (err: any) {
          stopPolling();
          setStage('error');
          setError(err.message || 'Optimization failed');
        }
      }, 2500);
    } catch (err: any) {
      stopPolling();
      setStage('error');
      setError(err.message || 'Optimization failed');
    }
  }, [intent, filename, setOptimization, router]);

  useEffect(() => {
    if (intent && filename && stage === 'idle') {
      startOptimization();
    }
    return () => stopPolling();
  }, [intent, filename, stage, startOptimization]);

  if (!intent || !filename) {
    return (
      <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Optimization Progress</h1>
          <p className="text-slate-500 text-sm mt-1">Track the status of your running optimization jobs.</p>
        </header>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">No active optimizations.</p>
          <p className="text-slate-400 text-xs mt-1">Submit a goal from the Goal page to start.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STAGES.indexOf(stage);

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Optimization Progress</h1>
        <p className="text-slate-500 text-sm mt-1">Running optimization for: {intent.target} ({intent.goal_direction})</p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {stage === 'error' ? (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Optimization Failed</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={startOptimization}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium shadow hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : stage === 'done' ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Optimization Complete</h3>
            <p className="text-sm text-slate-500">Redirecting to results...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{STAGE_LABELS[stage]}</span>
                <span className="text-sm text-slate-500">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2B70AB] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STAGES.slice(0, 3).map((s, idx) => {
                const isActive = idx === currentIndex;
                const isComplete = idx < currentIndex;
                return (
                  <div
                    key={s}
                    className={`p-4 rounded-xl border text-center transition-colors ${
                      isActive
                        ? 'border-[#2B70AB] bg-blue-50 text-[#2B70AB]'
                        : isComplete
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-sm font-medium">{STAGE_LABELS[s]}</span>
                    </div>
                    {isComplete && <span className="text-xs">Done</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
