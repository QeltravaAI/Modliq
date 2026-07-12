"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Upload, Target, BarChart2, FlaskConical } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const userId = params?.userId as string || "admin";

  const NAV = [
    {
      section: "Yield Optimizer",
      items: [
        { href: `/${userId}/modliq-console/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/${userId}/modliq-console/data-upload`, label: "Upload Data", icon: Upload },
        { href: `/${userId}/modliq-console/goal`, label: "Set Goal", icon: Target },
        { href: `/${userId}/modliq-console/results`, label: "Results", icon: BarChart2 },
      ],
    },
    {
      section: "Quality Studio",
      items: [
        { href: `/${userId}/modliq-console/studio/quality`, label: "Quality Analysis", icon: FlaskConical },
      ],
    },
  ];

  return (
    <div className="w-64 min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight">MODLIQ</h1>
        <p className="text-gray-400 text-xs mt-1">AI Quality &amp; Process Copilot</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-6 mt-2">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-2">
              {section}
            </p>
            <div className="space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <a
          href="https://qeltravaai.vercel.app/en"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-white transition leading-relaxed font-medium"
        >
          Product of{" "}
          <span className="text-blue-400 font-semibold">Qeltrava AI</span>
        </a>
        <p className="text-[9px] text-gray-600 mt-2 leading-snug">
          All outputs are recommendations. Final validation required before updating SOP.
        </p>
      </div>
    </div>
  );
}
