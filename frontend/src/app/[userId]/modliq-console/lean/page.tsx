'use client';

import React, { useEffect, useState, use } from 'react';
import axios from 'axios';
import { Zap, Layout, CheckSquare, Clipboard, Clock, Archive, Plus, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AiInsightCard from '@/components/ai/AiInsightCard';
import { isExtendedModulesEnabled } from '@/lib/feature-flags';
import GatedModule from '@/components/GatedModule';

export default function LeanPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'waste' | 'kaizen' | 'five_s' | 'calculators'>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [wastes, setWastes] = useState<any[]>([]);
  const [kaizens, setKaizens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Waste form state
  const [wasteType, setWasteType] = useState('Defects');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedLoss, setEstimatedLoss] = useState('1000');
  const [owner, setOwner] = useState('');

  // Kaizen Form state
  const [kaizenTitle, setKaizenTitle] = useState('');
  const [kaizenProblem, setKaizenProblem] = useState('');
  const [kaizenCountermeasure, setKaizenCountermeasure] = useState('');
  const [kaizenOwner, setKaizenOwner] = useState('');
  const [kaizenPriority, setKaizenPriority] = useState('Medium');

  // 5S slider states
  const [sort, setSort] = useState(4);
  const [setInOrder, setSetInOrder] = useState(3);
  const [shine, setShine] = useState(4);
  const [standardize, setStandardize] = useState(3);
  const [sustain, setSustain] = useState(3);
  const [auditNotes, setAuditNotes] = useState('');
  const [auditArea, setAuditArea] = useState('Production Line 1');

  // Calculators states
  const [taktTimePlanned, setTaktTimePlanned] = useState('28800'); // 8 hrs in seconds
  const [taktDemand, setTaktDemand] = useState('600');
  const [actualCycleTime, setActualCycleTime] = useState('55');
  const [taktResult, setTaktResult] = useState<any>(null);

  const [kanbanDemand, setKanbanDemand] = useState('100');
  const [kanbanLeadTime, setKanbanLeadTime] = useState('3');
  const [kanbanSafety, setKanbanSafety] = useState('0.15');
  const [kanbanContainer, setKanbanContainer] = useState('20');
  const [kanbanResult, setKanbanResult] = useState<any>(null);

  const [formLoading, setFormLoading] = useState(false);

  if (!isExtendedModulesEnabled()) {
    return <GatedModule title="Lean Manufacturing" description="Deploy Kaizen boards, log waste events, score 5S audits, and run lean calculators." />;
  }

  useEffect(() => {
    async function loadLeanData() {
      setLoading(true);
      try {
        const [sumRes, wasteRes, kaizenRes] = await Promise.all([
          axios.get('/api/lean/summary'),
          axios.get('/api/lean/waste'),
          axios.get('/api/lean/kaizen')
        ]);
        setSummary(sumRes.data.summary);
        setWastes(wasteRes.data.records || []);
        setKaizens(kaizenRes.data.actions || []);

        // Prepopulate 5S sliders if latest audit exists
        if (sumRes.data.summary?.categoryBreakdown) {
          const breakdown = sumRes.data.summary.categoryBreakdown;
          setSort(breakdown.find((b: any) => b.name === 'Sort').score / 20);
          setSetInOrder(breakdown.find((b: any) => b.name === 'Set In Order').score / 20);
          setShine(breakdown.find((b: any) => b.name === 'Shine').score / 20);
          setStandardize(breakdown.find((b: any) => b.name === 'Standardize').score / 20);
          setSustain(breakdown.find((b: any) => b.name === 'Sustain').score / 20);
          setAuditNotes(sumRes.data.summary.auditNote || '');
        }
      } catch (e) {
        console.error('Failed to load lean data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadLeanData();
  }, [refreshTrigger]);

  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setFormLoading(true);
    try {
      await axios.post('/api/lean/waste', {
        wasteType,
        location,
        description,
        estimatedLoss: Number(estimatedLoss) || 0,
        owner
      });
      setLocation('');
      setDescription('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddKaizen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kaizenTitle.trim()) return;
    setFormLoading(true);
    try {
      await axios.post('/api/lean/kaizen', {
        title: kaizenTitle,
        problem: kaizenProblem,
        countermeasure: kaizenCountermeasure,
        owner: kaizenOwner,
        priority: kaizenPriority,
        status: 'Backlog'
      });
      setKaizenTitle('');
      setKaizenProblem('');
      setKaizenCountermeasure('');
      setKaizenOwner('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const cycleKaizenStatus = async (id: string, currentStatus: string) => {
    const statusCycle = ['Backlog', 'Planned', 'In Progress', 'Validating', 'Completed'];
    const nextIdx = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIdx];

    try {
      await axios.patch(`/api/lean/kaizen/${id}`, { status: nextStatus });
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave5S = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await axios.post('/api/lean/5s', {
        area: auditArea,
        sort,
        setInOrder,
        shine,
        standardize,
        sustain,
        notes: auditNotes
      });
      alert('5S Audit Saved Successfully!');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCalculateTakt = (e: React.FormEvent) => {
    e.preventDefault();
    const time = Number(taktTimePlanned) || 28800;
    const demand = Number(taktDemand) || 600;
    const cycle = Number(actualCycleTime) || 55;

    const takt = time / demand;
    const gap = cycle - takt;
    const status = gap > 0 ? 'BEHIND DEMAND' : 'CAPACITY ADEQUATE';

    setTaktResult({
      taktTime: Math.round(takt * 10) / 10,
      actualCycleTime: cycle,
      gap: Math.round(gap * 10) / 10,
      status
    });
  };

  const handleCalculateKanban = (e: React.FormEvent) => {
    e.preventDefault();
    const demand = Number(kanbanDemand) || 100;
    const leadTime = Number(kanbanLeadTime) || 3;
    const safety = Number(kanbanSafety) || 0.15;
    const container = Number(kanbanContainer) || 20;

    const cards = Math.ceil((demand * leadTime * (1 + safety)) / container);

    setKanbanResult({
      cards
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-[#2B70AB] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2B70AB]/10 flex items-center justify-center text-[#2B70AB]">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Lean Manufacturing</h1>
            <p className="text-slate-500 text-sm mt-1">Deploy Kaizen boards, log waste events, scoring 5S audits, and cycle/takt time calculations.</p>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 mb-8 gap-4">
        {[
          { id: 'overview', name: 'Overview', icon: Zap },
          { id: 'waste', name: 'Waste Tracker', icon: Archive },
          { id: 'kaizen', name: 'Kaizen Board', icon: Layout },
          { id: 'five_s', name: '5S Audit Checklist', icon: Clipboard },
          { id: 'calculators', name: 'Lean Calculators', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#2B70AB] text-[#2B70AB]'
                  : 'border-transparent text-slate-500 hover:text-[#1B2A4A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Pane */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Open Kaizen Cards</span>
                <p className="text-3xl font-extrabold text-[#1B2A4A]">{summary?.openKaizenCount || 0}</p>
                <span className="text-[10px] text-green-700 block mt-1">Completed: {summary?.completedKaizenCount || 0}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Estimated Monthly Loss</span>
                <p className="text-3xl font-extrabold text-red-600">${summary?.totalEstimatedLoss || 0}</p>
                <span className="text-[10px] text-slate-500 block mt-1">From recorded waste leaks</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Latest 5S Audit Score</span>
                <p className="text-3xl font-extrabold text-[#2B70AB]">{summary?.latest5sScore ? `${summary.latest5sScore}%` : 'N/A'}</p>
                <span className="text-[10px] text-slate-500 block mt-1">Audit target: {auditArea}</span>
              </div>
            </div>
          )}

          {activeTab === 'waste' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-[#1B2A4A] mb-4">Lean Waste Pareto Chart</h3>
                {summary?.wastePareto?.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.wastePareto}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Estimated Loss ($)" fill="#2B70AB" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-500">No waste categories tracked. Use the form to record events.</div>
                )}
              </div>

              {/* Waste Event Log */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-bold text-[#1B2A4A] text-sm">Lean Waste Event Log</h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="px-5 py-3">Waste Type</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Loss ($)</th>
                      <th className="px-5 py-3">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {wastes.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-semibold text-slate-800">{w.wasteType}</td>
                        <td className="px-5 py-3">{w.location || '—'}</td>
                        <td className="px-5 py-3 text-slate-500">{w.description}</td>
                        <td className="px-5 py-3 font-semibold text-red-700">${w.estimatedLoss || 0}</td>
                        <td className="px-5 py-3">{w.owner || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'kaizen' && (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-3">
                {['Backlog', 'Planned', 'In Progress', 'Validating', 'Completed'].map(col => {
                  const items = kaizens.filter(a => {
                    const statusStr = a.status.replace(/\s+/g, '').toLowerCase();
                    const colStr = col.replace(/\s+/g, '').toLowerCase();
                    return statusStr === colStr;
                  });

                  return (
                    <div key={col} className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex flex-col min-h-[300px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{col}</span>
                        <span className="w-4 h-4 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-[9px] font-bold">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2 flex-1 overflow-y-auto">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => cycleKaizenStatus(item.id, item.status)}
                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-[#2B70AB] cursor-pointer transition-all flex flex-col justify-between"
                          >
                            <div>
                              <p className="text-[11px] font-bold text-slate-800 leading-snug">{item.title}</p>
                              {item.problem && (
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.problem}</p>
                              )}
                            </div>
                            <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-[9px] text-slate-400">
                              <span className="font-semibold text-slate-500">{item.owner || 'Unassigned'}</span>
                              <span className={`px-1 py-0.5 rounded font-extrabold text-[8px] uppercase tracking-wider ${
                                item.priority === 'Critical' ? 'bg-red-50 text-red-700' : item.priority === 'High' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.priority}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 text-right italic">* Click Kaizen card to cycle its status forward.</p>
            </div>
          )}

          {activeTab === 'five_s' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-[#1B2A4A] mb-2">5S Audit Scorecard</h3>
              <p className="text-xs text-slate-500 mb-6">Sort, Set In Order, Shine, Standardize, and Sustain. Score each category 0 (poor) to 5 (excellent).</p>

              <form onSubmit={handleSave5S} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Audit Area Name</label>
                  <input
                    type="text"
                    value={auditArea}
                    onChange={(e) => setAuditArea(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm"
                  />
                </div>
                {[
                  { name: 'Sort', val: sort, set: setSort, desc: 'Eliminate unnecessary tools, materials, and steps.' },
                  { name: 'Set In Order', val: setInOrder, set: setSetInOrder, desc: 'Arrange necessary items for easy search and access.' },
                  { name: 'Shine', val: shine, set: setShine, desc: 'Keep workstation and mixers clean, swept, and cleared.' },
                  { name: 'Standardize', val: standardize, set: setStandardize, desc: 'Create checklists, visual standards, and schedules.' },
                  { name: 'Sustain', val: sustain, set: setSustain, desc: 'Conduct audits, reviews, and continuous daily practice.' }
                ].map(slider => (
                  <div key={slider.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3 border-slate-50">
                    <div className="sm:max-w-md">
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">{slider.name}</h4>
                      <p className="text-xxs text-slate-400 mt-0.5">{slider.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={slider.val}
                        onChange={(e) => slider.set(Number(e.target.value))}
                        className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-8 h-8 rounded-lg bg-[#2B70AB]/10 text-[#2B70AB] font-bold text-sm flex items-center justify-center shrink-0">
                        {slider.val}
                      </span>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Audit Checklist Notes / Corrective Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Enter observations..."
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2B70AB]"
                  />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-xs">
                    <span className="text-slate-400 font-bold block">Current 5S Score</span>
                    <span className="text-lg font-extrabold text-[#1B2A4A]">{(sort + setInOrder + shine + standardize + sustain) * 4} / 100</span>
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-[#2B70AB] hover:bg-[#1B2A4A] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Save 5S Audit
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'calculators' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Takt Time */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1B2A4A] mb-3">Takt Time Calculator</h3>
                  <form onSubmit={handleCalculateTakt} className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Available Work Time (seconds)</label>
                      <input
                        type="number"
                        value={taktTimePlanned}
                        onChange={(e) => setTaktTimePlanned(e.target.value)}
                        className="w-full border rounded-xl p-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Required Customer Demand (units)</label>
                      <input
                        type="number"
                        value={taktDemand}
                        onChange={(e) => setTaktDemand(e.target.value)}
                        className="w-full border rounded-xl p-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Actual Process Cycle Time (seconds/unit)</label>
                      <input
                        type="number"
                        value={actualCycleTime}
                        onChange={(e) => setActualCycleTime(e.target.value)}
                        className="w-full border rounded-xl p-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#1B2A4A] text-white py-2 rounded-xl font-bold mt-2"
                    >
                      Calculate Takt Gaps
                    </button>
                  </form>
                </div>
                {taktResult && (
                  <div className="mt-4 pt-3 border-t text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Target Takt Time:</span>
                      <span className="font-semibold text-slate-800">{taktResult.taktTime}s</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Actual Cycle:</span>
                      <span className="font-semibold text-slate-800">{taktResult.actualCycleTime}s</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Cycle-Takt Gap:</span>
                      <span className={`font-semibold ${taktResult.gap > 0 ? 'text-red-700' : 'text-green-700'}`}>{taktResult.gap}s</span>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-center text-slate-700 uppercase tracking-wider bg-slate-100 py-1.5 rounded border">
                      Status: {taktResult.status}
                    </div>
                  </div>
                )}
              </div>

              {/* Kanban Calculator */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1B2A4A] mb-3">Kanban Card Sizing</h3>
                  <form onSubmit={handleCalculateKanban} className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Average Daily Demand (units)</label>
                      <input
                        type="number"
                        value={kanbanDemand}
                        onChange={(e) => setKanbanDemand(e.target.value)}
                        className="w-full border rounded-xl p-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Lead Time (days)</label>
                      <input
                        type="number"
                        value={kanbanLeadTime}
                        onChange={(e) => setKanbanLeadTime(e.target.value)}
                        className="w-full border rounded-xl p-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Safety Buffer (0-1)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={kanbanSafety}
                          onChange={(e) => setKanbanSafety(e.target.value)}
                          className="w-full border rounded-xl p-2"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Container Size</label>
                        <input
                          type="number"
                          value={kanbanContainer}
                          onChange={(e) => setKanbanContainer(e.target.value)}
                          className="w-full border rounded-xl p-2"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#1B2A4A] text-white py-2 rounded-xl font-bold mt-2"
                    >
                      Calculate Kanban Sizing
                    </button>
                  </form>
                </div>
                {kanbanResult && (
                  <div className="mt-4 pt-3 border-t text-xs">
                    <div className="flex justify-between py-1 items-center">
                      <span className="text-slate-400">Recommended Kanban Cards:</span>
                      <span className="w-8 h-8 rounded-full bg-[#2B70AB] text-white font-extrabold text-sm flex items-center justify-center">
                        {kanbanResult.cards}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Forms + AI Improvement Coach */}
        <div className="space-y-6">
          {/* AI Lean Coach */}
          <AiInsightCard module="lean" triggerRefresh={refreshTrigger} />

          {/* Form: Add Waste Event */}
          {activeTab === 'waste' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-[#1B2A4A] mb-4">Log Lean Waste Leak</h3>
              <form onSubmit={handleAddWaste} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Waste Category</label>
                  <select
                    value={wasteType}
                    onChange={(e) => setWasteType(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  >
                    <option value="Defects">Defects</option>
                    <option value="Overproduction">Overproduction</option>
                    <option value="Waiting">Waiting</option>
                    <option value="Non-utilized Talent">Non-utilized Talent</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Motion">Motion</option>
                    <option value="Extra Processing">Extra Processing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Mixing Deck A"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Describe waste details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2B70AB]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Est. Loss ($)</label>
                    <input
                      type="number"
                      value={estimatedLoss}
                      onChange={(e) => setEstimatedLoss(e.target.value)}
                      className="w-full border rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Owner</label>
                    <input
                      type="text"
                      placeholder="e.g. John D."
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full border rounded-xl p-2 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#1B2A4A] hover:bg-[#2B70AB] text-white py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Logging...' : 'Log Waste Event'}
                </button>
              </form>
            </div>
          )}

          {/* Form: Add Kaizen Card */}
          {activeTab === 'kaizen' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-[#1B2A4A] mb-4">Create Kaizen Improvement Card</h3>
              <form onSubmit={handleAddKaizen} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kaizen Title</label>
                  <input
                    type="text"
                    placeholder="Action title..."
                    value={kaizenTitle}
                    onChange={(e) => setKaizenTitle(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Problem Statement</label>
                  <textarea
                    rows={2}
                    placeholder="Describe problem details..."
                    value={kaizenProblem}
                    onChange={(e) => setKaizenProblem(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2B70AB]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Proposed Countermeasure</label>
                  <textarea
                    rows={2}
                    placeholder="Proposed solution..."
                    value={kaizenCountermeasure}
                    onChange={(e) => setKaizenCountermeasure(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2B70AB]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Priority</label>
                    <select
                      value={kaizenPriority}
                      onChange={(e) => setKaizenPriority(e.target.value)}
                      className="w-full border rounded-xl p-2 text-xs"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Owner / Lead</label>
                    <input
                      type="text"
                      placeholder="e.g. Alice M."
                      value={kaizenOwner}
                      onChange={(e) => setKaizenOwner(e.target.value)}
                      className="w-full border rounded-xl p-2 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#1B2A4A] hover:bg-[#2B70AB] text-white py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Create Kaizen Card'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
