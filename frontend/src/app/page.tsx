"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import StatsCard from "@/components/dashboard/StatsCard";

import PerformanceChart from "@/components/dashboard/PerformanceChart";

import ActivityPanel from "@/components/dashboard/ActivityPanel";

import QuickActions from "@/components/dashboard/QuickActions";

import { getDashboardStats } from "@/services/dashboard.services";

import {
  BrainCircuit,
  Database,
  Activity,
  BarChart3,
} from "lucide-react";

import {
  useModelResultStore,
} from "@/store/modelResultStore";

export default function HomePage() {

  const [dashboardData, setDashboardData] =
    useState<any>(null);

  // GLOBAL MODEL STORE
  const {
    modelResult,
  } = useModelResultStore();

  useEffect(() => {

    fetchDashboard();

  }, []);

  const fetchDashboard = async () => {

    try {

      const data =
        await getDashboardStats();

      setDashboardData(data);

    } catch (error) {

      console.log(error);
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
              Dashboard
            </h1>

            <p className="text-gray-500 mt-2">
              Your optimization studio at a glance
            </p>

          </div>

          {/* TOP STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Active Models */}
            <StatsCard
              title="Active Models"
              value={
                modelResult
                  ? 1
                  : dashboardData?.activeModels || 0
              }
              growth="+8%"
              color="blue"
              icon={
                <BrainCircuit className="text-blue-600" />
              }
            />

            {/* Dataset Count */}
            <StatsCard
              title="Datasets"
              value={
                dashboardData?.totalDatasets || 0
              }
              growth="+12%"
              color="purple"
              icon={
                <Database className="text-purple-600" />
              }
            />

            {/* Predictions */}
            <StatsCard
              title="Predictions Today"
              value={
                modelResult?.testing_samples || 0
              }
              growth="+3%"
              color="green"
              icon={
                <Activity className="text-green-600" />
              }
            />

            {/* Accuracy */}
            <StatsCard
              title="Avg Accuracy"
              value={
                modelResult?.accuracy
                  ? `${(
                      modelResult.accuracy * 100
                    ).toFixed(2)}%`
                  : "0%"
              }
              growth="+1.2%"
              color="orange"
              icon={
                <BarChart3 className="text-orange-600" />
              }
            />

          </div>

          {/* MODEL OVERVIEW */}
          {modelResult && (

            <div className="mt-10 bg-white rounded-3xl p-8 border shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-3xl font-bold text-gray-900">
                    Latest Optimization Run
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Recommended settings from your last goal
                  </p>

                </div>

                <div className="px-5 py-2 rounded-full bg-green-100 text-green-700 font-semibold">
                  Optimized Successfully
                </div>

              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">

                <div className="bg-gray-50 rounded-2xl p-6 border">

                  <p className="text-gray-500">
                    Algorithm
                  </p>

                  <h3 className="text-2xl font-bold text-gray-900 mt-2">
                    {modelResult.model_type}
                  </h3>

                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border">

                  <p className="text-gray-500">
                    Training Samples
                  </p>

                  <h3 className="text-2xl font-bold text-blue-700 mt-2">
                    {modelResult.training_samples}
                  </h3>

                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border">

                  <p className="text-gray-500">
                    Testing Samples
                  </p>

                  <h3 className="text-2xl font-bold text-purple-700 mt-2">
                    {modelResult.testing_samples}
                  </h3>

                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border">

                  <p className="text-gray-500">
                    Accuracy
                  </p>

                  <h3 className="text-2xl font-bold text-green-700 mt-2">
                    {(
                      modelResult.accuracy * 100
                    ).toFixed(2)}%
                  </h3>

                </div>

              </div>

              {/* FEATURES */}
              <div className="mt-8">

                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Features Used
                </h3>

                <div className="flex flex-wrap gap-3">

                  {modelResult.features_used?.map(
                    (
                      feature: string,
                      index: number
                    ) => (

                      <span
                        key={index}
                        className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-medium"
                      >
                        {feature}
                      </span>
                    )
                  )}

                </div>

              </div>

            </div>
          )}

          {/* CHART + ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

            <div className="lg:col-span-2">

              <PerformanceChart
                data={
                  modelResult?.chart_data ||
                  dashboardData?.modelAccuracy ||
                  []
                }
              />

            </div>

            <ActivityPanel
              activities={[
                ...(dashboardData?.recentActivity || []),

                ...(modelResult
                  ? [
                      {
                        title:
                          `${modelResult.model_type} trained successfully`,
                        time: "Just now",
                      },
                    ]
                  : []),
              ]}
            />

          </div>

          {/* METRICS */}
          {modelResult?.metrics && (

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              <div className="bg-white p-6 rounded-2xl border shadow-sm">

                <p className="text-gray-500">
                  MAE
                </p>

                <h3 className="text-2xl font-bold mt-2">
                  {modelResult.metrics.mae}
                </h3>

              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm">

                <p className="text-gray-500">
                  MSE
                </p>

                <h3 className="text-2xl font-bold mt-2">
                  {modelResult.metrics.mse}
                </h3>

              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm">

                <p className="text-gray-500">
                  RMSE
                </p>

                <h3 className="text-2xl font-bold mt-2">
                  {modelResult.metrics.rmse}
                </h3>

              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm">

                <p className="text-gray-500">
                  R² Score
                </p>

                <h3 className="text-2xl font-bold mt-2 text-green-700">
                  {modelResult.metrics.r2_score}
                </h3>

              </div>

            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="mt-10">

            <h2 className="text-2xl font-bold mb-6">
              Quick Actions
            </h2>

            <QuickActions />

          </div>

        </div>
      </div>
    </div>
  );
}