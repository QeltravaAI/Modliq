"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import PredictionChart from "@/components/charts/PredictionChart";
import OptimizationCurve from "@/components/charts/OptimizationCurve";
import FeatureImportance from "@/components/ml/FeatureImportance";

import { usePipelineStore, OptimizationResult } from "@/store/pipelineStore";
import { getOptimizationResults } from "@/services/optimization.service";
import { getTemplate, BRANDING } from "@/config/templates";

import {
  Settings2,
  SlidersHorizontal,
  IndianRupee,
  Lightbulb,
  FileDown,
  CircleCheck,
  CircleX,
} from "lucide-react";

function ResultsContent() {
  const params = useSearchParams();
  const id = params.get("id");

  const { result: storedResult } = usePipelineStore();
  const [result, setResult] = useState<OptimizationResult | null>(
    storedResult
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (storedResult && storedResult.success) {
      setResult(storedResult);
      return;
    }
    if (id) {
      setLoading(true);
      getOptimizationResults(id)
        .then((res) => {
          if (res.success) setResult(res.result);
        })
        .finally(() => setLoading(false));
    }
  }, [id, storedResult]);

  if (!result || !result.success) {
    return (
      <div className="flex bg-gray-100 min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <Navbar />
          <div className="p-8">
            <div className="bg-white rounded-2xl p-16 shadow-sm border text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                No Optimization Results Yet
              </h1>
              <p className="text-gray-600 mt-4">
                Describe a goal to generate recommended settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const r = result;
  const template = getTemplate(r.template_id || "yield_optimizer");
  const roi = r.roi;
  const settings = r.recommended_settings || {};
  const ranges = r.recommended_range || {};

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                {template.display_name}
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {BRANDING.copilot} recommendations for your production line
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
            >
              <FileDown size={18} />
              Export Report
            </button>
          </div>

          {/* Threshold badge */}
          {r.threshold != null && (
            <div
              className={`mb-8 inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold ${
                r.threshold_met
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {r.threshold_met ? (
                <CircleCheck size={18} />
              ) : (
                <CircleX size={18} />
              )}
              Goal: {r.goal_direction === "maximize" ? "≥" : "≤"} {r.threshold}%
              {" — "}
              {r.threshold_met
                ? "Target met at recommended settings"
                : "Target not fully met — see settings below"}
            </div>
          )}

          {/* 1. Recommended Operating Settings */}
          <Section
            icon={<Settings2 className="text-blue-600" />}
            title="Recommended Operating Settings"
            subtitle="Point values the engine suggests you run at"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(settings).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-gray-50 rounded-2xl p-6 border text-center"
                >
                  <p className="text-gray-500 font-medium">{k}</p>
                  <h3 className="text-3xl font-bold text-blue-700 mt-2">
                    {v}
                  </h3>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="text-lg text-blue-900">
                Expected {r.goal_direction === "maximize" ? "yield" : "outcome"}:
                <span className="font-bold ml-2">{r.expected_yield}%</span>
                <span className="text-blue-700 ml-2">
                  (currently {r.current_yield}%)
                </span>
              </p>
            </div>
          </Section>

          {/* 2. Safe Operating Range + Confidence */}
          <Section
            icon={<SlidersHorizontal className="text-purple-600" />}
            title="Safe Operating Range"
            subtitle="Run within these bounds to stay near the expected outcome"
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 p-3 text-left text-gray-900 font-bold">
                      Parameter
                    </th>
                    <th className="border border-gray-300 p-3 text-left text-gray-900 font-bold">
                      Min
                    </th>
                    <th className="border border-gray-300 p-3 text-left text-gray-900 font-bold">
                      Max
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ranges).map(([k, [lo, hi]]) => (
                    <tr key={k} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3 font-semibold text-gray-900">
                        {k}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-800">
                        {lo}
                      </td>
                      <td className="border border-gray-300 p-3 text-gray-800">
                        {hi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-white rounded-2xl border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-700">
                  Model Confidence
                </p>
                <p className="font-bold text-green-700">
                  {r.confidence_score}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full"
                  style={{ width: `${r.confidence_score}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Confidence reflects how well the model explains your historical
                data (R² = {r.metrics?.r2_score}).
              </p>
            </div>
          </Section>

          {/* 3. Business Impact / ROI */}
          {roi && (
            <Section
              icon={<IndianRupee className="text-green-600" />}
              title="Business Impact (ROI)"
              subtitle="Estimated monthly financial gain from the recommended settings"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                  <p className="text-gray-600 font-medium">
                    Estimated Monthly Savings
                  </p>
                  <h3 className="text-3xl font-bold text-green-700 mt-2">
                    {roi.savings_range_text}
                  </h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border">
                  <p className="text-gray-600 font-medium">
                    Additional Good Units / month
                  </p>
                  <h3 className="text-3xl font-bold text-blue-700 mt-2">
                    {roi.additional_good_units.toLocaleString()}
                  </h3>
                </div>
                <div className="bg-white rounded-2xl p-6 border">
                  <p className="text-gray-600 font-medium">
                    Yield Improvement
                  </p>
                  <h3 className="text-3xl font-bold text-purple-700 mt-2">
                    +{roi.yield_improvement}%
                  </h3>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                <span>
                  Monthly volume: {roi.monthly_volume.toLocaleString()} units
                </span>
                <span>•</span>
                <span>Unit value: {roi.currency}{roi.unit_value}</span>
                <span>•</span>
                <span>Payback: {roi.payback_period}</span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Shown as a range (±15%) for credibility. Demo defaults used
                unless you supplied business inputs.
              </p>
            </Section>
          )}

          {/* 4. Why This Works */}
          <Section
            icon={<Lightbulb className="text-orange-600" />}
            title="Why This Works"
            subtitle="Key process drivers explained in business language"
          >
            <div className="space-y-4">
              {(r.drivers || []).map((d) => (
                <div
                  key={d.feature}
                  className="bg-white rounded-2xl border p-5 flex items-start gap-4"
                >
                  <div className="bg-orange-100 text-orange-700 font-bold rounded-xl px-4 py-2">
                    {d.importance_pct}%
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{d.feature}</h4>
                    <p className="text-gray-600 mt-1">{d.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 5. Charts */}
          <Section title="Analysis Charts" subtitle="Model fit and optimization landscape">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PredictionChart data={r.chart_data || []} />
              <FeatureImportance data={r.feature_importance || {}} />
            </div>
            <div className="mt-8">
              <OptimizationCurve
                data={r.optimization_curve || []}
                expectedYield={r.expected_yield || 0}
                threshold={r.threshold ?? null}
              />
            </div>
          </Section>

          {/* 6. Plain-English AI Summary */}
          <Section title="AI Summary" subtitle="Plain-English takeaway">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8">
              <p className="text-xl leading-relaxed">
                {r.plain_english_summary}
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10 bg-white rounded-2xl border p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      {subtitle && <p className="text-gray-500 mb-6">{subtitle}</p>}
      {children}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">
          Loading results...
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
