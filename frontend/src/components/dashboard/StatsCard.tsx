"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  value: string | number;
  growth: string;
  icon: any;
  color: string;
}

export default function StatsCard({
  title,
  value,
  growth,
  icon,
  color,
}: Props) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`bg-white rounded-2xl p-6 border-l-4 shadow-sm border-${color}-500`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm uppercase">
            {title}
          </p>

          <h2 className="text-4xl font-bold mt-3 text-gray-900">
            {value}
          </h2>

          <p className="text-green-500 text-sm mt-2">
            {growth}
          </p>
        </div>

        <div
          className={`bg-${color}-100 p-4 rounded-xl`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}