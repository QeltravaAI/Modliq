'use client';

import React, { useEffect, useState, use } from 'react';
import axios from 'axios';
import { Truck, ShieldAlert, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AiInsightCard from '@/components/ai/AiInsightCard';

const COLORS = ['#2B70AB', '#1B2A4A', '#E28743', '#76B5C5', '#873E23', '#1F3F49'];

export default function SupplyChainPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'lots' | 'charts'>('scorecard');
  const [summary, setSummary] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Material lot form state
  const [lotCode, setLotCode] = useState('');
  const [supplierName, setSupplierName] = useState('Supplier A');
  const [materialType, setMaterialType] = useState('Raw Metal');
  const [incomingStatus, setIncomingStatus] = useState('ACCEPTED');
  const [defectRate, setDefectRate] = useState('0.02');
  const [linkedBatchId, setLinkedBatchId] = useState('');
  const [linkedYield, setLinkedYield] = useState('95.0');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    async function loadSCData() {
      setLoading(true);
      try {
        const [sumRes, lotsRes, suppliersRes] = await Promise.all([
          axios.get('/api/supply-chain/summary'),
          axios.get('/api/supply-chain/lots'),
          axios.get('/api/supply-chain/suppliers')
        ]);
        setSummary(sumRes.data.summary);
        setLots(lotsRes.data.lots || []);
        setSuppliers(suppliersRes.data.suppliers || []);
      } catch (e) {
        console.error('Failed to load supply chain data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSCData();
  }, [refreshTrigger]);

  const handleAddLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotCode.trim()) return;
    setFormLoading(true);
    try {
      await axios.post('/api/supply-chain/lots', {
        lotCode,
        supplierName,
        materialType,
        incomingStatus,
        defectRate: Number(defectRate) || 0.0,
        linkedBatchId: linkedBatchId || null,
        linkedYield: linkedYield ? Number(linkedYield) : null
      });

      setLotCode('');
      setLinkedBatchId('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to add material lot:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteLot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material lot?')) return;
    try {
      await axios.delete(`/api/supply-chain/lots/${id}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete lot:', err);
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
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Supply Chain Visibility</h1>
            <p className="text-slate-500 text-sm mt-1">Trace raw materials, assess supplier scorecard ratings, and flag quality risks.</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 gap-4">
        {[
          { id: 'scorecard', name: 'Supplier Scorecard', icon: Truck },
          { id: 'lots', name: 'Material Traceability', icon: AlertCircle },
          { id: 'charts', name: 'Yield by Supplier', icon: Truck }
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
          
          {activeTab === 'scorecard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary?.scorecard?.map((s: any, idx: number) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-[#1B2A4A] text-sm">{s.supplierName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xxs font-bold border ${
                        s.status === 'Excellent' || s.status === 'Good'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : s.status === 'Needs Review'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                      <div>
                        <span className="text-slate-400 font-medium block">Acceptance Rate</span>
                        <span className="font-semibold text-slate-700">{s.acceptanceRate}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Avg Defect Rate</span>
                        <span className="font-semibold text-slate-700">{s.avgDefectRate}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Linked Yield</span>
                        <span className="font-semibold text-slate-700">{s.avgYield}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Total Lots Received</span>
                        <span className="font-semibold text-slate-700">{s.totalLots}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Quality Score</span>
                    <span className="text-base font-extrabold text-[#1B2A4A]">{s.score} / 100</span>
                  </div>
                </div>
              ))}
              {(!summary || summary.scorecard.length === 0) && (
                <div className="sm:col-span-2 text-center p-8 bg-white border border-slate-200 rounded-2xl text-slate-500">
                  No supplier scores calculated. Use the right sidebar to register material lots.
                </div>
              )}
            </div>
          )}

          {activeTab === 'lots' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-[#1B2A4A] text-sm">Material Lot Traceability</h3>
                <span className="text-xs text-slate-500">{lots.length} lots registered</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="px-5 py-3">Lot Code</th>
                      <th className="px-5 py-3">Supplier</th>
                      <th className="px-5 py-3">Material Type</th>
                      <th className="px-5 py-3">Received Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Defect Rate</th>
                      <th className="px-5 py-3">Linked Batch</th>
                      <th className="px-5 py-3">Yield</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {lots.slice(0, 15).map(lot => (
                      <tr key={lot.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-semibold text-slate-800">{lot.lotCode}</td>
                        <td className="px-5 py-3">{lot.supplierName}</td>
                        <td className="px-5 py-3 text-slate-500">{lot.materialType}</td>
                        <td className="px-5 py-3 text-slate-500">{lot.receivedDate ? new Date(lot.receivedDate).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            lot.incomingStatus === 'ACCEPTED'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {lot.incomingStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3">{(lot.defectRate * 100).toFixed(1)}%</td>
                        <td className="px-5 py-3 text-slate-500 font-semibold">{lot.linkedBatchId || '—'}</td>
                        <td className="px-5 py-3 text-green-700 font-semibold">{lot.linkedYield ? `${lot.linkedYield.toFixed(1)}%` : '—'}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleDeleteLot(lot.id)}
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-[#1B2A4A] mb-4">Average Production Yield by Supplier</h3>
              {summary?.supplierYieldChart?.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.supplierYieldChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[75, 100]} />
                      <Tooltip />
                      <Bar dataKey="yield" name="Avg Yield (%)" fill="#2B70AB">
                        {summary.supplierYieldChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">No comparative yield charts available.</div>
              )}
            </div>
          )}
        </div>

        {/* Side Panel: Alerts & Log forms */}
        <div className="space-y-6">
          {/* AI Insight */}
          <AiInsightCard module="supply-chain" triggerRefresh={refreshTrigger} />

          {/* Supplier alerts */}
          {summary?.alerts?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Supply Chain Alerts
              </h4>
              <div className="space-y-2">
                {summary.alerts.map((alert: string, idx: number) => (
                  <div key={idx} className="bg-red-50 border border-red-200 text-red-800 text-[11px] p-2.5 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Material Lot form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-[#1B2A4A] mb-4">Register Material Lot</h3>
            <form onSubmit={handleAddLot} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Lot Code</label>
                <input
                  type="text"
                  placeholder="e.g. RM-1014"
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Supplier</label>
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  {suppliers.length === 0 && <option value="Supplier A">Supplier A</option>}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Material Type</label>
                  <input
                    type="text"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
                  <select
                    value={incomingStatus}
                    onChange={(e) => setIncomingStatus(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  >
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Defect Rate (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={defectRate}
                    onChange={(e) => setDefectRate(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Linked Batch</label>
                  <input
                    type="text"
                    placeholder="e.g. B002"
                    value={linkedBatchId}
                    onChange={(e) => setLinkedBatchId(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-[#1B2A4A] hover:bg-[#2B70AB] text-white py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Registering...' : 'Register Material Lot'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
