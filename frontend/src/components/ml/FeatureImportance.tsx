"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface FeatureImportanceProps {
  data: {
    [key: string]: number;
  };
}

export default function FeatureImportance({
  data,
}: FeatureImportanceProps) {

  const chartData =
    Object.entries(data).map(
      ([feature, importance]) => ({
        feature,
        importance,
      })
    );

  return (

    <div className="bg-white p-6 rounded-2xl border shadow-sm">

      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Feature Importance
      </h2>

      <div className="w-full h-[450px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart data={chartData}>

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="feature"
            />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="importance"
              fill="#2563eb"
              radius={[8, 8, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}