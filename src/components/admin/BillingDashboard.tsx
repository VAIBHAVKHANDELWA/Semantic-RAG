import React from 'react';
import { 
  CreditCard, 
  DollarSign, 
  TrendingDown, 
  Zap, 
  Server, 
  Layers
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useApp } from '../../context/AppContext';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';

const COST_SAVINGS_HISTORY = [
  { month: 'Jan', llmWithoutCache: 28400, actualLlmCost: 8200, redisSaved: 20200 },
  { month: 'Feb', llmWithoutCache: 32100, actualLlmCost: 9100, redisSaved: 23000 },
  { month: 'Mar', llmWithoutCache: 35000, actualLlmCost: 9800, redisSaved: 25200 },
  { month: 'Apr', llmWithoutCache: 38900, actualLlmCost: 10400, redisSaved: 28500 },
  { month: 'May', llmWithoutCache: 42000, actualLlmCost: 11200, redisSaved: 30800 },
  { month: 'Jun', llmWithoutCache: 46800, actualLlmCost: 11980, redisSaved: 34820 }
];

const MODEL_COST_BREAKDOWN = [
  { name: 'Redis Semantic Cache', cost: 1420, color: '#38bdf8' },
  { name: 'MiniLM-L6-v2 Embeddings', cost: 380, color: '#a855f7' },
  { name: 'OpenAI GPT-4o (Fallback)', cost: 6800, color: '#f59e0b' },
  { name: 'Claude 3.5 Sonnet (Reconciliation)', cost: 4200, color: '#10b981' }
];

export const BillingDashboard: React.FC = () => {
  const { telemetry } = useApp();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 space-y-6 max-w-7xl mx-auto font-sans"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">LLM API Billing & Infrastructure Cost Controls</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
              SYSTEM ADMIN PRIVILEGED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing Redis semantic cache cost avoidance versus raw LLM token consumption across department tenants.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> 74.5% Cost Reduction
          </span>
        </div>
      </div>

      {/* Top 3 High Level Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Total Saved */}
        <GlassCard glowColor="amber" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                YTD LLM Cost Avoidance
              </div>
              <div className="text-3xl font-extrabold text-amber-400 font-mono mt-1">
                ${telemetry.llmCostSavedUsd.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
            <span>Saved via Semantic Deduplication:</span>
            <span className="text-emerald-400 font-bold">+$14,820 / mo</span>
          </div>
        </GlassCard>

        {/* Metric 2: Redis Cache Hit ROI */}
        <GlassCard glowColor="cyan" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Redis Cache Efficiency
              </div>
              <div className="text-3xl font-extrabold text-cyan-300 font-mono mt-1">
                84.2% <span className="text-xs font-normal text-slate-400">Hit Rate</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
            <span>Cache Hits vs Total Queries:</span>
            <span className="text-cyan-300 font-bold">1.48M Hits</span>
          </div>
        </GlassCard>

        {/* Metric 3: Vector Ram Optimization */}
        <GlassCard glowColor="emerald" className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Vector Storage RAM Reclaimed
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                {telemetry.vectorRamSavedGb} GB
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Server className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
            <span>Qdrant HNSW Index Footprint:</span>
            <span className="text-emerald-300 font-bold">-38% Compression</span>
          </div>
        </GlassCard>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cost Savings Comparison (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Raw LLM Cost vs Semantic Cache Saved ($USD)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison of estimated LLM API spend without deduplication vs actual spend.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              Live Redis Pipeline
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={COST_SAVINGS_HISTORY}>
                <defs>
                  <linearGradient id="colorUncached" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={val => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }} 
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="llmWithoutCache" name="Without Cache (Estimated)" stroke="#ef4444" fillOpacity={1} fill="url(#colorUncached)" strokeWidth={2} />
                <Area type="monotone" dataKey="actualLlmCost" name="Actual Cost (Pruned)" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Cost Distribution Breakdown (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Provider Spend Share
          </h3>
          <p className="text-xs text-slate-400">Monthly token costs by model provider.</p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MODEL_COST_BREAKDOWN}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="cost"
                >
                  {MODEL_COST_BREAKDOWN.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Cost']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
            {MODEL_COST_BREAKDOWN.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate max-w-[170px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-100">${item.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
