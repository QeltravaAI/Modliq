"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

export default function AccuracyChart({
  data,
}: {
  data: any[];
}) {

  return (

    <div className="mt-10 bg-white rounded-2xl border p-6 shadow-sm">

      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Model Accuracy Comparison
      </h2>

      <ResponsiveContainer
        width="100%"
        height={350}
      >

        <BarChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="model" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="accuracy"
            fill="#2563eb"
            radius={[10, 10, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>
  );
}