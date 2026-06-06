"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: any[];
}

export default function PerformanceChart({
  data,
}: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">
          Performance Overview
        </h2>

        <div className="flex gap-3">
          <button className="bg-gray-100 px-4 py-2 rounded-xl text-sm">
            Predictions
          </button>

          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">
            Models
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <XAxis dataKey="model" />

          <YAxis />

          <Tooltip />

          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="#2563eb"
            fill="#93c5fd"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}