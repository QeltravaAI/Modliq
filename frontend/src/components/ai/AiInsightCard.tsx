import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import AiLoadingState from './AiLoadingState';
import AiActionPanel from './AiActionPanel';

interface Props {
  module: 'dashboard' | 'dataset-health' | 'optimization' | 'quality' | 'supply-chain' | 'operations' | 'lean';
  rawGoal?: string;
  triggerRefresh?: any;
}

export default function AiInsightCard({ module, rawGoal, triggerRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/ai/insight', {
        module,
        rawGoal
      });

      if (response.data.code === 'AI_NOT_CONFIGURED') {
        setError('AI features require an API key to be configured. Calculated calculations and charts are still fully available.');
        setData(null);
      } else if (response.data.code === 'AI_DISABLED') {
        setError('AI features are currently disabled. Calculations remain fully available.');
        setData(null);
      } else {
        setData(response.data);
      }
    } catch (e: any) {
      console.error('Failed to load AI insight:', e);
      setError('AI insight could not be generated right now. Calculated calculations remain available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [module, rawGoal, triggerRefresh]);

  if (loading) {
    return <AiLoadingState />;
  }

  if (error) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-normal">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#D0E2F0] shadow-sm overflow-hidden">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="px-5 py-4 bg-[#F0F6FA] flex items-center justify-between cursor-pointer border-b border-[#D0E2F0]"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2B70AB]/10 flex items-center justify-center text-[#2B70AB]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1B2A4A]">{data.title || 'AI Decision Support'}</h4>
            <p className="text-xxs text-slate-500 font-medium">Auto-generated context analysis</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </div>

      {expanded && (
        <div className="p-5">
          <p className="text-sm text-slate-700 leading-relaxed font-medium mb-4">
            {data.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Findings */}
            {data.keyFindings?.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-[#1B2A4A] uppercase tracking-wider mb-2">Key Findings</h5>
                <ul className="space-y-1.5">
                  {data.keyFindings.map((f: string, i: number) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-[#2B70AB] font-bold mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {data.risks?.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">Risks & Considerations</h5>
                <ul className="space-y-1.5">
                  {data.risks.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-red-500 font-bold mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Suggestions */}
          {data.nextActions?.length > 0 && (
            <AiActionPanel actions={data.nextActions} module={module} />
          )}

          {/* Safety Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 italic">
              {data.disclaimer || 'AI-generated recommendation. Validate before production use.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
