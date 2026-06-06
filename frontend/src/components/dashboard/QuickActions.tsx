"use client";

import {
  Upload,
  BrainCircuit,
  Bot,
  FileText,
} from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "Upload Data",
      icon: <Upload />,
    },
    {
      title: "Train Model",
      icon: <BrainCircuit />,
    },
    {
      title: "AI Copilot",
      icon: <Bot />,
    },
    {
      title: "Documents",
      icon: <FileText />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {actions.map((item, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-lg transition cursor-pointer"
        >
          <div className="bg-blue-100 w-fit p-4 rounded-xl mb-4">
            {item.icon}
          </div>

          <h3 className="font-bold text-gray-900">
            {item.title}
          </h3>
        </div>
      ))}
    </div>
  );
}