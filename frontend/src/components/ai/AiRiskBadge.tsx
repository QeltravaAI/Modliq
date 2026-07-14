import React from 'react';

type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

interface Props {
  priority: Priority | string;
}

export default function AiRiskBadge({ priority }: Props) {
  const clean = (priority || 'Medium').trim();

  let colors = 'bg-slate-100 text-slate-700 border-slate-200';
  if (clean === 'Low') {
    colors = 'bg-blue-50 text-blue-700 border-blue-150';
  } else if (clean === 'Medium') {
    colors = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (clean === 'High') {
    colors = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (clean === 'Critical') {
    colors = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors}`}>
      {clean}
    </span>
  );
}
