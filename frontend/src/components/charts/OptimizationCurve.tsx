"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  data: { feature: string; value: number; yield: number }[];
  expectedYield: number;
  threshold: number | null;
}

export default function OptimizationCurve({
  data,
  expectedYield,
  threshold,
}: Props) {
  const feature = data?.[0]?.feature ?? "Feature";

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Optimization Curve
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Predicted {`yield`} as <span className="font-semibold">{feature}</span>{" "}
        sweeps across its range (other settings held at recommended values).
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="value"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => `${feature[0]}:${v}`}
          />
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip
            formatter={(v: any, name: any) =>
              name === "yield" ? [`${v}%`, "Predicted Yield"] : [v, name]
            }
            labelFormatter={(v) => `${feature}: ${v}`}
          />
          <Line
            type="monotone"
            dataKey="yield"
            stroke="#2563eb"
            strokeWidth={3}
            dot={false}
          />
          <ReferenceLine
            y={expectedYield}
            stroke="#16a34a"
            strokeDasharray="5 5"
            label={{ value: `Best: ${expectedYield}%`, position: "insideTopRight" }}
          />
          {threshold != null && (
            <ReferenceLine
              y={threshold}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: `Target: ${threshold}%`, position: "insideBottomRight" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
