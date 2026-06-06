"use client";

import {
  Brain,
  Database,
  Activity,
} from "lucide-react";

interface Props {
  activities: any[];
}

export default function ActivityPanel({
  activities,
}: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 border shadow-sm">
      <h2 className="text-2xl font-bold mb-6">
        Recent Activity
      </h2>

      <div className="space-y-5">
        {activities?.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-4"
          >
            <div className="bg-blue-100 p-3 rounded-xl">
              {index % 3 === 0 ? (
                <Brain size={18} />
              ) : index % 3 === 1 ? (
                <Database size={18} />
              ) : (
                <Activity size={18} />
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                {item.title}
              </h3>

              <p className="text-sm text-gray-400">
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}