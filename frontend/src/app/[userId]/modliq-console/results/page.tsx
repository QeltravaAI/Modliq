'use client';

import React from 'react';
import { BarChart2, ArrowRight, TrendingUp, DollarSign, Gauge } from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import OptimizationCurve from '@/components/charts/OptimizationCurve';
import PredictionChart from '@/components/charts/PredictionChart';

export default function ResultsPage() {
  const result = usePipelineStore((s) => s.result);

  if (!result || !result.success) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Optimization Results</h1>
          <p className="text-slate-500 text-sm mt-1">Review the recommended parameters, predicted ROI, and feature importance.</p>
        </header>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">No valid optimization results to display.</p>
          <p className="text-slate-400 text-xs mt-1">Run an optimization from the Goal page to generate results.</p>
        </div>
      </div>
    );
  }

  const metrics = result.metrics || { r2_score: 0, rmse: 0, mae: 0 };
  const roi = result.roi || { currency: '', current_yield: 0, expected_yield: 0, yield_improvement: 0, monthly_volume: 0, unit_value: 0, additional_good_units: 0, monthly_savings_low: 0, monthly_savings_high: 0, monthly_savings_estimate: 0, payback_period: '', savings_range_text: '' };
  const drivers = result.drivers || [];
  const topDriver = drivers[0];

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Optimization Results</h1>
        <p className="text-slate-500 text-sm mt-1">{result.display_name || 'Yield Optimizer'} — {result.model_type || 'Random Forest'}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-[#2B70AB]" />
            </div>
            <div>
              <p className="text-xs text-slate-500">R² Score</p>
              <p className="text-xl font-bold text-slate-800">{metrics.r2_score ? `${(metrics.r2_score * 100).toFixed(1)}%` : '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Expected Yield</p>
              <p className="text-xl font-bold text-slate-800">{result.expected_yield ? `${result.expected_yield}%` : '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Yield Improvement</p>
              <p className="text-xl font-bold text-slate-800">{result.yield_improvement ? `+${result.yield_improvement}%` : '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Monthly Savings</p>
              <p className="text-xl font-bold text-slate-800">
                {roi.savings_range_text || (roi.monthly_savings_estimate ? `${roi.monthly_savings_estimate}` : '—')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recommended Settings</h3>
          <div className="space-y-2">
            {result.recommended_settings && Object.entries(result.recommended_settings).map(([key, value]) => {
              const range = result.recommended_range?.[key];
              return (
                <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-600">{key}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-800">{String(value)}</span>
                    {range && (
                      <span className="text-xs text-slate-400 ml-2">(safe: {range[0]} – {range[1]})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Feature Importance</h3>
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div key={driver.feature}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700">{driver.feature}</span>
                  <span className="text-xs font-medium text-[#2B70AB]">{(driver.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2B70AB] rounded-full"
                    style={{ width: `${Math.min(driver.importance * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {topDriver && (
            <p className="mt-4 text-xs text-slate-500">
              Strongest driver: <span className="font-medium text-slate-700">{topDriver.feature}</span> — {topDriver.explanation}
            </p>
          )}
        </div>
      </div>

      {result.optimization_curve && result.optimization_curve.length > 0 && (
        <OptimizationCurve
          data={result.optimization_curve}
          expectedYield={result.expected_yield || 0}
          threshold={result.threshold ?? null}
        />
      )}

      {result.chart_data && result.chart_data.length > 0 && (
        <div className="mt-8">
          <PredictionChart data={result.chart_data} />
        </div>
      )}
    </div>
  );
}
