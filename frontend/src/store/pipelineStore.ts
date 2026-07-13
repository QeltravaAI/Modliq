export interface IntentState {
  raw_text: string;
  template_id: string;
  target: string;
  goal_direction: "maximize" | "minimize";
  threshold: number | null;
  features: string[];
  constraints: Record<string, { min?: number; max?: number }>;
}

export interface OptimizationResult {
  success: boolean;
  template_id?: string;
  display_name?: string;
  task_type?: string;
  model_type?: string;
  metrics?: { r2_score: number; rmse: number; mae: number };
  recommended_settings?: Record<string, number>;
  recommended_range?: Record<string, [number, number]>;
  expected_yield?: number;
  current_yield?: number;
  yield_improvement?: number;
  threshold?: number | null;
  threshold_met?: boolean | null;
  goal_direction?: string;
  confidence_score?: number;
  feature_importance?: Record<string, number>;
  chart_data?: { actual: number; predicted: number }[];
  optimization_curve?: { feature: string; value: number; yield: number }[];
  drivers?: {
    feature: string;
    importance: number;
    importance_pct: number;
    explanation: string;
  }[];
  roi?: {
    currency: string;
    current_yield: number;
    expected_yield: number;
    yield_improvement: number;
    monthly_volume: number;
    unit_value: number;
    additional_good_units: number;
    monthly_savings_low: number;
    monthly_savings_high: number;
    monthly_savings_estimate: number;
    payback_period: string;
    savings_range_text: string;
  };
  plain_english_summary?: string;
  error?: string;
}

interface PipelineStore {
  filename: string | null;
  analytics: any;
  intent: IntentState | null;
  optimizationId: string | null;
  result: OptimizationResult | null;
  setDataset: (filename: string, analytics: any, skipSync?: boolean) => void;
  setIntent: (intent: IntentState, skipSync?: boolean) => void;
  setOptimization: (id: string, result: OptimizationResult, skipSync?: boolean) => void;
  hydrateWorkspace: (data: any) => void;
  reset: () => void;
}

import { create } from "zustand";

export const usePipelineStore = create<PipelineStore>((set) => ({
  filename: null,
  analytics: null,
  intent: null,
  optimizationId: null,
  result: null,
  setDataset: (filename, analytics, skipSync = false) => {
    set({ filename, analytics });
    if (!skipSync) {
      fetch('/api/user/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDatasetId: filename, datasetAnalytics: analytics }),
      }).catch(console.error);
    }
  },
  setIntent: (intent, skipSync = false) => {
    set({ intent });
    if (!skipSync) {
      fetch('/api/user/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedIntent: intent }),
      }).catch(console.error);
    }
  },
  setOptimization: (optimizationId, result, skipSync = false) => {
    set({ optimizationId, result });
    if (!skipSync) {
      fetch('/api/user/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeOptimizationJobId: optimizationId, latestOptimizationResult: result }),
      }).catch(console.error);
    }
  },
  hydrateWorkspace: (data) => {
    set({
      filename: data.activeDatasetId || null,
      analytics: data.datasetAnalytics || null,
      intent: data.parsedIntent || null,
      optimizationId: data.activeOptimizationJobId || null,
      result: data.latestOptimizationResult || null,
    });
  },
  reset: () =>
    set({
      filename: null,
      analytics: null,
      intent: null,
      optimizationId: null,
      result: null,
    }),
}));
