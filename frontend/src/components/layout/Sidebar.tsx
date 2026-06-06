import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen bg-black text-white p-6">
      
      <h1 className="text-3xl font-bold">
        MODLIQ
      </h1>

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
          href="/model-training"
          className="block hover:text-gray-400"
        >
          Model Training
        </Link>

        <Link
          href="/results"
          className="block hover:text-gray-400"
        >
          Results
        </Link>

      </div>
    </div>
  );
}