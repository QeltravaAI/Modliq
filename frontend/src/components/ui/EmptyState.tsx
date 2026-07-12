import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-[#D0E2F0] rounded-2xl h-full min-h-[400px]">
      <div className="w-16 h-16 bg-[#F0F6FA] rounded-2xl flex items-center justify-center mb-6 text-[#2B70AB]">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold text-[#1B2A4A] mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
