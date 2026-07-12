'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError('Invalid credentials');
      } else {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (session?.user?.id) {
          router.push(`/${session.user.id}/modliq-console/dashboard`);
          onClose();
        }
      }
    } else {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const loginRes = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });
        if (!loginRes?.error) {
          const sessionRes = await fetch('/api/auth/session');
          const session = await sessionRes.json();
          if (session?.user?.id) {
            router.push(`/${session.user.id}/modliq-console/dashboard`);
            onClose();
          }
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to register');
      }
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    const res = await signIn('credentials', {
      redirect: false,
      isDemo: 'true',
    });

    if (res?.error) {
      setError('Demo login failed. Did you run the seed script?');
    } else {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      if (session?.user?.id) {
        router.push(`/${session.user.id}/modliq-console/dashboard`);
        onClose();
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-6 text-slate-900">
          {isLogin ? 'Sign in to Modliq' : 'Create your account'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#2B70AB] focus:border-transparent outline-none"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#2B70AB] focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#2B70AB] focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B2A4A] text-white rounded-lg py-2.5 font-medium hover:bg-[#121c32] transition-colors disabled:opacity-70"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="hover:text-[#2B70AB] hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center mb-4">Or explore Modliq without an account</p>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full bg-slate-100 text-[#1B2A4A] rounded-lg py-2.5 font-medium hover:bg-slate-200 transition-colors border border-slate-200"
          >
            Try Demo Account
          </button>
        </div>
      </div>
    </div>
  );
}
