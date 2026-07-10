import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold">MODLIQ</h1>
      <p className="text-gray-400 text-xs mt-1">Studio</p>

      <div className="mt-12 space-y-6">
        <Link
          href="/"
          className="block hover:text-gray-400"
        >
          Dashboard
        </Link>

        <Link
          href="/data-upload"
          className="block hover:text-gray-400"
        >
          Data Upload
        </Link>

        <Link
          href="/goal"
          className="block hover:text-gray-400"
        >
          Set Goal
        </Link>

        <Link
          href="/results"
          className="block hover:text-gray-400"
        >
          Results
        </Link>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-700">
        <p className="text-xs text-gray-500 leading-relaxed">
          AI Decision Layer for Static &amp; Live Business Data
        </p>
      </div>
    </div>
  );
}
