"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function PredictionChart({
  data,
}: any) {

  return (

    <div className="bg-white p-6 rounded-2xl border shadow-sm">

      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Actual vs Predicted
      </h2>

      <ResponsiveContainer
        width="100%"
        height={400}
      >

        <LineChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="actual" />

          <YAxis />

          <Tooltip />

          <Legend />

          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563eb"
            strokeWidth={3}
          />

          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#16a34a"
            strokeWidth={3}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>
  );
}