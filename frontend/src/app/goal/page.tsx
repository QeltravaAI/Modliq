"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import { usePipelineStore } from "@/store/pipelineStore";
import { TEMPLATES, getTemplate, BRANDING } from "@/config/templates";

import { parseIntent } from "@/services/optimization.service";

import { Target, Sparkles, ArrowRight, Upload, TrendingUp } from "lucide-react";

export default function GoalPage() {
  const router = useRouter();

  const { filename, setIntent } = usePipelineStore();

  const [templateId, setTemplateId] = useState("yield_optimizer");
  const [goalText, setGoalText] = useState(
    "Maximize yield above 95% while keeping temperature below 90°C"
  );

  const [monthlyVolume, setMonthlyVolume] = useState<string>("50000");
  const [unitValue, setUnitValue] = useState<string>("120");

  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");

  const template = getTemplate(templateId);

  const handleFind = async () => {
    if (!filename) {
      setError("Please upload a dataset first.");
      return;
    }

    setParsing(true);
    setError("");

    try {
      const intentRes = await parseIntent(goalText, templateId);

      if (!intentRes.success) {
        setError(intentRes.error || "Could not understand the goal.");
        setParsing(false);
        return;
      }

      setIntent({
        raw_text: intentRes.raw_text,
        template_id: intentRes.template_id,
        target: intentRes.target,
        goal_direction: intentRes.goal_direction,
        threshold: intentRes.threshold,
        features: intentRes.features,
        constraints: intentRes.constraints,
      });

      const params = new URLSearchParams({
        filename,
        template_id: templateId,
        goal_text: goalText,
        monthly_volume: monthlyVolume,
        unit_value: unitValue,
      });

      router.push(`/optimization-progress?${params.toString()}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to parse goal.");
      setParsing(false);
    }
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">
              Describe Your Optimization Goal
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Tell the {BRANDING.copilot} what you want to achieve in plain English.
            </p>
          </div>

          {!filename && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="text-amber-600" />
                <p className="text-amber-800 font-medium">
                  No dataset loaded yet. Upload your production data first.
                </p>
              </div>
              <button
                onClick={() => router.push("/data-upload")}
                className="px-5 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition"
              >
                Go to Upload
              </button>
            </div>
          )}

          {/* Template library */}
          <div className="bg-white rounded-2xl border p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Choose a Use Case Template
              </h2>
            </div>
            <p className="text-gray-500 mb-6">
              One flexible engine, many business questions. Pick a template to frame your goal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => {
                const active = t.template_id === templateId;
                const enabled = t.template_id === "yield_optimizer";

                return (
                  <div
                    key={t.template_id}
                    onClick={() => enabled && setTemplateId(t.template_id)}
                    className={`p-5 rounded-2xl border transition relative
                      ${
                        active
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }
                      ${enabled ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                  >
                    <h3 className="text-lg font-bold text-gray-900">
                      {t.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {t.business_question}
                    </p>
                    {!enabled && (
                      <span className="absolute top-3 right-3 text-[10px] uppercase font-semibold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        Coming soon
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goal input */}
          <div className="mt-8 bg-white rounded-2xl border p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                What do you want to achieve?
              </h2>
            </div>

            <textarea
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-4 text-gray-900 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Maximize yield above 95% while keeping temperature below 90°C"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {TEMPLATES.filter((t) => t.template_id === "yield_optimizer").map(
                () => (
                  <button
                    key="eg"
                    onClick={() =>
                      setGoalText(
                        "Maximize yield above 95% while keeping temperature below 90°C"
                      )
                    }
                    className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    {template.goal_example}
                  </button>
                )
              )}
            </div>

            {/* Advanced ROI inputs */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Business Impact Inputs (optional)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Monthly production volume (units)
                  </label>
                  <input
                    type="number"
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Value per good unit (₹)
                  </label>
                  <input
                    type="number"
                    value={unitValue}
                    onChange={(e) => setUnitValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-3">
                Leave defaults to use sensible demo values. ROI is shown as a range for credibility.
              </p>
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleFind}
                disabled={parsing || !filename}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {parsing ? "Understanding goal..." : "Find Best Settings"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
