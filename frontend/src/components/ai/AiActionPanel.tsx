import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import axios from 'axios';
import AiRiskBadge from './AiRiskBadge';

interface NextAction {
  action: string;
  ownerRole?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface Props {
  actions: NextAction[];
  module: string;
}

export default function AiActionPanel({ actions, module }: Props) {
  const [createdIndices, setCreatedIndices] = useState<Record<number, boolean>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const createKaizenAction = async (item: NextAction, index: number) => {
    setLoadingIndex(index);
    try {
      await axios.post('/api/lean/kaizen', {
        title: item.action,
        problem: `Identified by Modliq AI in the ${module} module.`,
        priority: item.priority === 'Critical' ? 'Critical' : item.priority === 'High' ? 'High' : 'Medium',
        owner: item.ownerRole || 'Operations Team',
        status: 'Backlog',
        impactArea: module.toUpperCase(),
      });

      setCreatedIndices(prev => ({ ...prev, [index]: true }));
    } catch (e) {
      console.error('Failed to create Kaizen action:', e);
    } finally {
      setLoadingIndex(null);
    }
  };

  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <h5 className="text-xs font-bold text-[#1B2A4A] tracking-wider uppercase mb-3 flex items-center gap-1">
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        AI Suggested Actions
      </h5>
      <div className="space-y-2.5">
        {actions.map((item, idx) => {
          const isCreated = createdIndices[idx];
          return (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-150 bg-slate-50">
              <div className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{item.action}</p>
                  {item.ownerRole && (
                    <span className="text-xs text-slate-500">Suggested Lead: {item.ownerRole}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <AiRiskBadge priority={item.priority} />
                {isCreated ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Added to Kaizen
                  </span>
                ) : (
                  <button
                    onClick={() => createKaizenAction(item, idx)}
                    disabled={loadingIndex !== null}
                    className="text-xs font-semibold text-[#2B70AB] hover:text-[#1B2A4A] transition-colors border border-[#D0E2F0] hover:border-[#2B70AB] bg-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    {loadingIndex === idx ? 'Adding...' : 'Create Kaizen'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
