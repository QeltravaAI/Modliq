"use client";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import PredictionChart from "@/components/charts/PredictionChart";
import FeatureImportance from "@/components/ml/FeatureImportance";
import PerformanceMetrics from "@/components/ml/PerformanceMetrics";

import {
  useModelResultStore,
} from "@/store/modelResultStore";

export default function ResultsPage() {
  
  
  const {
    modelResult,
  } = useModelResultStore();

  const trainingResult=modelResult;

  console.log(
    "RESULT PAGE:",
     modelResult
    );

  // NO RESULT
  if (!trainingResult) {

    return (

      <div className="flex bg-gray-100 min-h-screen">

        <Sidebar />

        <div className="flex-1">

          <Navbar />

          <div className="p-8">

            <div className="bg-white rounded-2xl p-16 shadow-sm border text-center">

              <h1 className="text-3xl font-bold text-gray-900">
                No Model Results Found
              </h1>

              <p className="text-gray-600 mt-4">
                Train a model first to view results.
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  return (

    <div className="flex bg-gray-100 min-h-screen">

      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1">

        {/* Navbar */}
        <Navbar />

        <div className="p-8">

          {/* PAGE HEADER */}
          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-bold text-gray-900">
                Model Results
              </h1>

              <p className="text-gray-600 mt-2">
                AI Model Performance & Insights
              </p>

            </div>

            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Export Report
            </button>

          </div>

          {/* METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">

            {/* Accuracy */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">

              <p className="text-gray-500 font-medium">
                Accuracy
              </p>

              <h2 className="text-4xl font-bold text-green-600 mt-3">
                {trainingResult.accuracy}
              </h2>

            </div>

            {/* Model */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">

              <p className="text-gray-500 font-medium">
                Model Type
              </p>

              <h2 className="text-2xl font-bold text-blue-700 mt-3">
                {trainingResult.model_type}
              </h2>

            </div>

            {/* Training */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">

              <p className="text-gray-500 font-medium">
                Training Samples
              </p>

              <h2 className="text-4xl font-bold text-purple-700 mt-3">
                {trainingResult.training_samples}
              </h2>

            </div>

            {/* Testing */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">

              <p className="text-gray-500 font-medium">
                Testing Samples
              </p>

              <h2 className="text-4xl font-bold text-orange-600 mt-3">
                {trainingResult.testing_samples}
              </h2>

            </div>

          </div>

          {/* FEATURES */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm mt-8">

            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              Features Used
            </h2>

            <div className="flex flex-wrap gap-3">

              {trainingResult.features_used?.map(
                (
                  feature: string,
                  index: number
                ) => (

                  <span
                    key={index}
                    className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold"
                  >
                    {feature}
                  </span>
                )
              )}

            </div>

          </div>

          {/* CHART SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">

            {/* Prediction */}
            <div>

              {trainingResult.chart_data && (

                <PredictionChart
                  data={trainingResult.chart_data}
                />

              )}

            </div>

            {/* Feature Importance */}
            <div>

              {trainingResult.feature_importance && (

                <FeatureImportance
                  data={
                    trainingResult.feature_importance
                  }
                />

              )}

            </div>

          </div>

          {/* PERFORMANCE METRICS */}
          <div className="mt-8">

            {trainingResult.metrics && (

              <PerformanceMetrics
                metrics={
                  trainingResult.metrics
                }
              />

            )}

          </div>

        </div>

      </div>
    </div>
  );
}