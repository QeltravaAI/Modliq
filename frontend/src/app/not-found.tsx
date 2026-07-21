import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-sm text-slate-600 mb-4">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
