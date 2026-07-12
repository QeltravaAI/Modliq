import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <div className="w-full h-16 bg-white border-b flex items-center justify-between px-6">

      {/* Left Side — Logo + Brand */}
      <Link
        href="https://qeltravaai.vercel.app/en"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 hover:opacity-80 transition"
      >
        <Image
          src="/logo-bg.png"
          alt="Qeltrava AI Logo"
          width={32}
          height={32}
          className="rounded-lg object-contain"
        />
        <span className="text-base font-bold text-gray-900 tracking-tight">
          Qeltrava AI
        </span>
      </Link>

      {/* Right Side */}
      <div className="flex items-center gap-4">

        {/* Notification */}
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition text-lg">
          🔔
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Process Copilot</p>
            <p className="text-xs text-gray-500">Process Optimization Engineer</p>
          </div>
        </div>
      </div>
    </div>
  );
}