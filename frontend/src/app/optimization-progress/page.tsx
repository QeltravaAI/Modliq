"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import { usePipelineStore } from "@/store/pipelineStore";
import { parseIntent, runOptimization } from "@/services/optimization.service";

import { Cpu, CheckCircle2, Loader2 } from "lucide-react";

function OptimizationProgressContent() {
  const router = useRouter();
  const params = useSearchParams();

  const { setOptimization } = usePipelineStore();

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Starting optimization engine...");
  const [error, setError] = useState("");

  useEffect(() => {
    const filename = params.get("filename");
    const templateId = params.get("template_id") || "yield_optimizer";
    const goalText = params.get("goal_text") || "";
    const monthlyVolume = params.get("monthly_volume");
    const unitValue = params.get("unit_value");

    if (!filename) {
      router.replace("/data-upload");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setProgress(10);
        setStatus("Parsing your goal into structured intent...");

        const intentRes = await parseIntent(goalText, templateId);

        if (!cancelled) {
          setProgress(35);
          setStatus("Training process model on your production data...");
        }

        await new Promise((r) => setTimeout(r, 600));

        if (!cancelled) {
          setProgress(65);
          setStatus("Searching thousands of setting combinations...");
        }

        const payload: any = {
          filename,
          template_id: templateId,
          intent: intentRes,
        };

        if (monthlyVolume) payload.monthly_volume = Number(monthlyVolume);
        if (unitValue) payload.unit_value = Number(unitValue);

        const runRes = await runOptimization(payload);

        if (cancelled) return;

        if (!runRes.success) {
          setError(runRes.error || "Optimization failed.");
          setStatus("Optimization failed");
          return;
        }

        setProgress(100);
        setStatus("Best settings found");

        setOptimization(runRes.id, runRes.result);

        setTimeout(() => {
          router.push(`/results?id=${runRes.id}`);
        }, 700);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.response?.data?.error || "Optimization failed.");
        setStatus("Optimization failed");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [params, router, setOptimization]);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Cpu className="text-blue-600" size={28} />
              <h1 className="text-3xl font-bold text-gray-900">
                Optimization Engine
              </h1>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              {error ? (
                <span className="text-red-600 font-semibold">{status}</span>
              ) : progress >= 100 ? (
                <CheckCircle2 className="text-green-600" />
              ) : (
                <Loader2 className="animate-spin text-blue-600" />
              )}
              <span className="text-lg font-semibold text-gray-800">
                {status}
              </span>
              <span className="ml-auto font-bold text-blue-700">
                {progress}%
              </span>
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                {error}
              </div>
            )}

            <p className="text-gray-400 text-sm mt-8">
              Modliq is acting as your AI process engineer — training a model,
              then grid-searching operating settings that meet your goal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OptimizationProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">
          Loading optimization...
        </div>
      }
    >
      <OptimizationProgressContent />
    </Suspense>
  );
}
