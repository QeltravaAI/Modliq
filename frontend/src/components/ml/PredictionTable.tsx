"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PredictionChartProps {
  data: {
    actual: number;
    predicted: number;
  }[];
}

export default function PredictionChart({
  data,
}: PredictionChartProps) {

  const chartData = data.map(
    (item, index) => ({
      index: index + 1,
      actual: item.actual,
      predicted: item.predicted,
    })
  );

  return (

    <div className="bg-white p-6 rounded-2xl border shadow-sm">

      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Actual vs Predicted
      </h2>

      <div className="w-full h-[400px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <LineChart data={chartData}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="index" />

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

    </div>
  );
}