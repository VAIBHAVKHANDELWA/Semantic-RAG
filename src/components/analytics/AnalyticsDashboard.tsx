import React from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Copy, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Server 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { DbscanClusterChart } from './DbscanClusterChart';

// Historical telemetry trend data for Recharts AreaChart
const HISTORICAL_PERFORMANCE_DATA = [
  { time: '08:00', chunks: 142000, cacheHits: 84000, dbSpaceSavedGb: 3.10, llmCostSavedUsd: 11200 },
  { time: '10:00', chunks: 210000, cacheHits: 125000, dbSpaceSavedGb: 3.45, llmCostSavedUsd: 12100 },
  { time: '12:00', chunks: 340000, cacheHits: 202000, dbSpaceSavedGb: 3.80, llmCostSavedUsd: 13200 },
  { time: '14:00', chunks: 480000, cacheHits: 295000, dbSpaceSavedGb: 4.05, llmCostSavedUsd: 13950 },
  { time: '16:00', chunks: 620000, cacheHits: 380000, dbSpaceSavedGb: 4.18, llmCostSavedUsd: 14300 },
  { time: '18:00', chunks: 790000, cacheHits: 490000, dbSpaceSavedGb: 4.28, llmCostSavedUsd: 14820 }
];

export const AnalyticsDashboard: React.FC = () => {
  const { telemetry } = useApp();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            System Analytics & Cost Optimization Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ROI metrics, vector DB storage RAM reduction, and unsupervised DBSCAN topic clustering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> +34.2% LLM Cost Saved
          </span>
        </div>
      </div>

      {/* KPI Cards Grid (4 Cards with sparklines) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Chunks Processed */}
        <GlassCard glowColor="cyan" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Chunks Processed
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
                {telemetry.totalChunksProcessed.toLocaleString()}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_PERFORMANCE_DATA}>
                <Area type="monotone" dataKey="chunks" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between font-mono pt-1 border-t border-slate-800">
            <span>MiniLM-L6-v2 Embeddings</span>
            <span className="text-cyan-400">+12.4% vs last week</span>
          </div>
        </GlassCard>

        {/* KPI 2: Duplicates & Conflicts Pruned */}
        <GlassCard glowColor="emerald" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Duplicates & Conflicts Pruned
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {telemetry.exactDuplicatesPruned.toLocaleString()}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Copy className="w-5 h-5" />
            </div>
          </div>
          <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_PERFORMANCE_DATA}>
                <Area type="monotone" dataKey="dbSpaceSavedGb" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between font-mono pt-1 border-t border-slate-800">
            <span>Vector RAM Saved:</span>
            <span className="text-emerald-400 font-bold">{telemetry.vectorRamSavedGb} GB RAM</span>
          </div>
        </GlassCard>

        {/* KPI 3: Semantic Cache Hits ($ Saved) */}
        <GlassCard glowColor="amber" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Redis Cache LLM Cost Saved
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                ${telemetry.llmCostSavedUsd.toLocaleString()}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_PERFORMANCE_DATA}>
                <Area type="monotone" dataKey="llmCostSavedUsd" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between font-mono pt-1 border-t border-slate-800">
            <span>Cache Hit Rate:</span>
            <span className="text-amber-400 font-bold">84.2% hit ratio</span>
          </div>
        </GlassCard>

        {/* KPI 4: Quarantined Conflicts (Resolved vs Pending) */}
        <GlassCard glowColor="rose" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quarantined Conflicts
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
                {telemetry.quarantinedResolvedCount} <span className="text-xs font-normal text-slate-400">resolved</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HISTORICAL_PERFORMANCE_DATA}>
                <Bar dataKey="cacheHits" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between font-mono pt-1 border-t border-slate-800">
            <span>Pending Review:</span>
            <span className="text-amber-400 font-bold">{telemetry.quarantinedPendingCount} items</span>
          </div>
        </GlassCard>
      </div>

      {/* DBSCAN Density Cluster Section */}
      <DbscanClusterChart />

      {/* Recharts Storage Reduction & Pipeline Throughput Graph */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Pipeline Throughput & Storage Reduction Trajectory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparing raw chunks processed vs exact duplicates pruned over 24-hour window.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded bg-cyan-400 block" /> Raw Chunks Processed
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded bg-emerald-400 block" /> Vector DB RAM Saved (GB)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HISTORICAL_PERFORMANCE_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorChunks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="chunks" stroke="#38bdf8" fillOpacity={1} fill="url(#colorChunks)" strokeWidth={2} />
              <Area type="monotone" dataKey="cacheHits" stroke="#10b981" fillOpacity={1} fill="url(#colorSaved)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
};
