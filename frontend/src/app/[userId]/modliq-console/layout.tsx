'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Upload, 
  Target, 
  Activity, 
  BarChart2, 
  Microscope,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import React, { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { usePipelineStore } from '@/store/pipelineStore';

export default function ConsoleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedParams = use(params);
  const [session, setSession] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const setDataset = usePipelineStore((s) => s.setDataset);
  const currentDatasetId = usePipelineStore((s) => s.filename);

  useEffect(() => {
    if (session?.user?.id && !currentDatasetId) {
      fetch('/api/user/dataset')
        .then((r) => r.json())
        .then((data) => {
          if (data.workspace?.activeDatasetId) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/datasets/${data.workspace.activeDatasetId}/preview?rows=1`)
              .then((r) => r.json())
              .then((previewData) => {
                if (previewData.success && previewData.analytics) {
                  setDataset(data.workspace.activeDatasetId, previewData.analytics);
                }
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }
  }, [session, currentDatasetId, setDataset]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { name: 'Dashboard', href: `/${resolvedParams.userId}/modliq-console/dashboard`, icon: LayoutDashboard },
    { name: 'Data Upload', href: `/${resolvedParams.userId}/modliq-console/data-upload`, icon: Upload },
    { name: 'Goal', href: `/${resolvedParams.userId}/modliq-console/goal`, icon: Target },
    { name: 'Optimization', href: `/${resolvedParams.userId}/modliq-console/optimization-progress`, icon: Activity },
    { name: 'Results', href: `/${resolvedParams.userId}/modliq-console/results`, icon: BarChart2 },
    { name: 'Quality Studio', href: `/${resolvedParams.userId}/modliq-console/studio/quality`, icon: Microscope },
  ];

  return (
    <div className="min-h-screen bg-[#F0F6FA] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#D0E2F0] flex flex-col fixed h-full z-10">
        <div className="h-20 flex items-center px-6 border-b border-[#D0E2F0]">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-bg.png"
              alt="Modliq Logo"
              width={32}
              height={32}
              className="rounded-lg border border-gray-100"
            />
            <span className="font-bold text-[#1B2A4A] tracking-tight">MODLIQ</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F0F6FA] text-[#2B70AB]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#1B2A4A]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-[#2B70AB]' : 'text-slate-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#D0E2F0]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {session?.user?.email || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {session?.user?.email || ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
