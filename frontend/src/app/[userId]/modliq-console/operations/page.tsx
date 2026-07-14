'use client';

import React, { useEffect, useState, use } from 'react';
import axios from 'axios';
import { Factory, Calculator, BarChart3, AlertTriangle, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import AiInsightCard from '@/components/ai/AiInsightCard';

const COLORS = ['#2B70AB', '#1B2A4A', '#E28743', '#76B5C5', '#873E23', '#1F3F49'];

export default function OperationsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'oee_calc' | 'downtime' | 'shift_line'>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // OEE Calculator Form State
  const [calcPlanned, setCalcPlanned] = useState('480');
  const [calcRuntime, setCalcRuntime] = useState('440');
  const [calcCycleTime, setCalcCycleTime] = useState('30');
  const [calcTotalCount, setCalcTotalCount] = useState('800');
  const [calcGoodCount, setCalcGoodCount] = useState('780');
  const [calcResult, setCalcResult] = useState<any>(null);

  // Manual record form state
  const [batchId, setBatchId] = useState('');
  const [line, setLine] = useState('Line 1');
  const [machine, setMachine] = useState('Mixer 1');
  const [shift, setShift] = useState('A');
  const [downtime, setDowntime] = useState('0');
  const [downtimeReason, setDowntimeReason] = useState('');
  const [totalCount, setTotalCount] = useState('1000');
  const [goodCount, setGoodCount] = useState('980');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sumRes, recsRes] = await Promise.all([
          axios.get('/api/operations/summary'),
          axios.get('/api/operations/records')
        ]);
        setSummary(sumRes.data.summary);
        setRecords(recsRes.data.records || []);
      } catch (e) {
        console.error('Failed to load operations data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleCalculateOEE = (e: React.FormEvent) => {
    e.preventDefault();
    const planned = Number(calcPlanned) || 480;
    const runtime = Number(calcRuntime) || 440;
    const cycleTime = Number(calcCycleTime) || 30;
    const total = Number(calcTotalCount) || 800;
    const good = Number(calcGoodCount) || 780;

    const availability = planned > 0 ? Math.min(1, runtime / planned) : 1;
    const performance = runtime > 0 ? Math.min(1, (cycleTime * total) / (runtime * 60)) : 1;
    const quality = total > 0 ? Math.min(1, good / total) : 1;
    const oee = availability * performance * quality;

    setCalcResult({
      availability: Math.round(availability * 1000) / 10,
      performance: Math.round(performance * 1000) / 10,
      quality: Math.round(quality * 1000) / 10,
      oee: Math.round(oee * 1000) / 10,
      scrapRate: total > 0 ? Math.round(((total - good) / total) * 1000) / 10 : 0
    });
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const downtimeMin = Number(downtime) || 0;
    const planned = 480;
    const runtime = Math.max(0, planned - downtimeMin);
    const total = Number(totalCount) || 1000;
    const good = Number(goodCount) || 980;
    const rejects = total - good;
    const yieldVal = total > 0 ? (good / total) * 100 : 100;

    try {
      await axios.post('/api/operations/records', {
        batchId: batchId || `B${Date.now().toString().slice(-4)}`,
        line,
        machine,
        shift,
        plannedTimeMinutes: planned,
        runtimeMinutes: runtime,
        downtimeMinutes: downtimeMin,
        downtimeReason: downtimeMin > 0 ? downtimeReason || 'Other' : null,
        idealCycleTimeSeconds: 30,
        totalCount: total,
        goodCount: good,
        rejectCount: rejects,
        yieldValue: yieldVal,
        scrapRate: rejects / total
      });
      
      // Reset form
      setBatchId('');
      setDowntime('0');
      setDowntimeReason('');
      setTotalCount('1000');
      setGoodCount('980');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to add record:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(`/api/operations/records/${id}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
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
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Operations Management</h1>
            <p className="text-slate-500 text-sm mt-1">Track OEE, downtime Pareto, and identify operational bottlenecks.</p>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 mb-8 gap-4">
        {[
          { id: 'overview', name: 'Overview', icon: Factory },
          { id: 'oee_calc', name: 'OEE Calculator', icon: Calculator },
          { id: 'downtime', name: 'Downtime Pareto', icon: AlertTriangle },
          { id: 'shift_line', name: 'Shift & Line Comparisons', icon: BarChart3 }
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

      {/* Content wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Pane */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'overview' && (
            <>
              {summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Overall OEE</span>
                    <p className="text-3xl font-extrabold text-[#1B2A4A]">{summary.oee}%</p>
                    <span className="text-[10px] text-slate-500 block mt-1">Status: {summary.status}</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Availability</span>
                    <p className="text-3xl font-extrabold text-[#2B70AB]">{summary.availability}%</p>
                    <span className="text-[10px] text-slate-500 block mt-1">Time Runtime vs Planned</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Performance</span>
                    <p className="text-3xl font-extrabold text-amber-600">{summary.performance}%</p>
                    <span className="text-[10px] text-slate-500 block mt-1">Ideal vs Actual Speed</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Quality Rate</span>
                    <p className="text-3xl font-extrabold text-green-700">{summary.quality}%</p>
                    <span className="text-[10px] text-slate-500 block mt-1">Good Units: {summary.totalGoodCount}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border rounded-2xl p-8 text-center text-slate-500">
                  No active operations logs found. Use the forms to manually add records or load the demo dataset to seed items.
                </div>
              )}

              {/* Operations Record Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-[#1B2A4A] text-sm">Historical Operations Logs</h3>
                  <span className="text-xs text-slate-400">{records.length} records logged</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="px-5 py-3">Batch ID</th>
                        <th className="px-5 py-3">Line</th>
                        <th className="px-5 py-3">Machine</th>
                        <th className="px-5 py-3">Shift</th>
                        <th className="px-5 py-3">Downtime (min)</th>
                        <th className="px-5 py-3">Reason</th>
                        <th className="px-5 py-3">Yield</th>
                        <th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {records.slice(0, 10).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold">{r.batchId}</td>
                          <td className="px-5 py-3">{r.line}</td>
                          <td className="px-5 py-3">{r.machine}</td>
                          <td className="px-5 py-3">{r.shift}</td>
                          <td className="px-5 py-3 font-medium text-amber-700">{r.downtimeMinutes || 0}</td>
                          <td className="px-5 py-3 text-slate-500">{r.downtimeReason || '—'}</td>
                          <td className="px-5 py-3 font-semibold text-green-700">{r.yieldValue ? `${r.yieldValue.toFixed(1)}%` : '—'}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="text-red-500 hover:text-red-700 font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {records.length > 10 && (
                    <div className="px-5 py-3 bg-slate-50 text-center border-t border-slate-100 text-slate-500">
                      Showing latest 10 records. Use filters to adjust search.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'oee_calc' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-[#1B2A4A] mb-4">Manual OEE Calculator</h3>
              <form onSubmit={handleCalculateOEE} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Planned Production Time (min)</label>
                  <input
                    type="number"
                    value={calcPlanned}
                    onChange={(e) => setCalcPlanned(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Actual Runtime (min)</label>
                  <input
                    type="number"
                    value={calcRuntime}
                    onChange={(e) => setCalcRuntime(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Ideal Cycle Time (sec/unit)</label>
                  <input
                    type="number"
                    value={calcCycleTime}
                    onChange={(e) => setCalcCycleTime(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Total Processed Count</label>
                  <input
                    type="number"
                    value={calcTotalCount}
                    onChange={(e) => setCalcTotalCount(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 block mb-1">Good Finished Units</label>
                  <input
                    type="number"
                    value={calcGoodCount}
                    onChange={(e) => setCalcGoodCount(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="md:col-span-2 bg-[#2B70AB] hover:bg-[#1B2A4A] text-white py-3 rounded-xl font-bold text-sm transition-colors mt-2"
                >
                  Calculate OEE Metrics
                </button>
              </form>

              {calcResult && (
                <div className="mt-8 border-t pt-6">
                  <h4 className="text-sm font-bold text-[#1B2A4A] mb-3">OEE Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#F0F6FA] p-4 rounded-xl border border-[#D0E2F0]">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">AVAILABILITY</span>
                      <p className="text-xl font-extrabold text-[#2B70AB]">{calcResult.availability}%</p>
                    </div>
                    <div className="bg-[#F0F6FA] p-4 rounded-xl border border-[#D0E2F0]">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">PERFORMANCE</span>
                      <p className="text-xl font-extrabold text-amber-600">{calcResult.performance}%</p>
                    </div>
                    <div className="bg-[#F0F6FA] p-4 rounded-xl border border-[#D0E2F0]">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">QUALITY</span>
                      <p className="text-xl font-extrabold text-green-700">{calcResult.quality}%</p>
                    </div>
                    <div className="bg-[#1B2A4A] p-4 rounded-xl text-white">
                      <span className="text-[10px] font-bold text-slate-300 block mb-0.5">OEE</span>
                      <p className="text-xl font-extrabold text-white">{calcResult.oee}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'downtime' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-[#1B2A4A] mb-2">Downtime Reasons Pareto Analysis</h3>
              <p className="text-xs text-slate-500 mb-6">Pareto sorting highlights the 80/20 critical contributors to planned capacity loss.</p>

              {summary?.paretoChart?.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.paretoChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Downtime Minutes" fill="#2B70AB">
                        {summary.paretoChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  No downtime events logged yet. Re-run with records.
                </div>
              )}
            </div>
          )}

          {activeTab === 'shift_line' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-[#1B2A4A] mb-4">Operations by Shift</h3>
                {summary?.shiftComparison?.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.shiftComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[70, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="oee" name="OEE (%)" fill="#2B70AB" />
                        <Bar dataKey="yield" name="Yield (%)" fill="#1B2A4A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-500">No shift comparative data available.</div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-[#1B2A4A] mb-4">Operations by Line</h3>
                {summary?.lineComparison?.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.lineComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[70, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="oee" name="OEE (%)" fill="#E28743" />
                        <Bar dataKey="yield" name="Yield (%)" fill="#76B5C5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-500">No line comparative data available.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Log Form + AI Review */}
        <div className="space-y-6">
          {/* AI Decision Support */}
          <AiInsightCard module="operations" triggerRefresh={refreshTrigger} />

          {/* Bottleneck Card */}
          {summary && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Bottleneck Diagnostic</h4>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Highest Downtime Mixer: <span className="text-[#2B70AB] font-bold">{summary.bottleneckMachine}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accumulated {Math.round(summary.bottleneckDowntime)} total minutes of downtime. Review changeover standards and temperature sensor calibrations on this unit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add Operations Log form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-[#1B2A4A] mb-4">Log Operations Event</h3>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Batch ID / Code</label>
                <input
                  type="text"
                  placeholder="e.g. B204"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Line</label>
                  <select
                    value={line}
                    onChange={(e) => {
                      setLine(e.target.value);
                      setMachine(e.target.value === 'Line 1' ? 'Mixer 1' : 'Mixer 2');
                    }}
                    className="w-full border rounded-xl p-2 text-xs"
                  >
                    <option value="Line 1">Line 1</option>
                    <option value="Line 2">Line 2</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  >
                    <option value="A">Shift A</option>
                    <option value="B">Shift B</option>
                    <option value="C">Shift C</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Downtime (min)</label>
                  <input
                    type="number"
                    value={downtime}
                    onChange={(e) => setDowntime(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reason</label>
                  <select
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                    disabled={Number(downtime) === 0}
                    className="w-full border rounded-xl p-2 text-xs disabled:opacity-50"
                  >
                    <option value="">Select Reason</option>
                    <option value="Changeover">Changeover</option>
                    <option value="Mechanical">Mechanical Stop</option>
                    <option value="Startup">Startup Calibration</option>
                    <option value="Cleaning">Sanitary Cleaning</option>
                    <option value="Quality Hold">Quality Hold</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Count</label>
                  <input
                    type="number"
                    value={totalCount}
                    onChange={(e) => setTotalCount(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Good Count</label>
                  <input
                    type="number"
                    value={goodCount}
                    onChange={(e) => setGoodCount(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-[#1B2A4A] hover:bg-[#2B70AB] text-white py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Submitting...' : 'Log Operations Record'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
