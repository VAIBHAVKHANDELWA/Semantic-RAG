import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Database, 
  DollarSign, 
  Activity, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  FileCheck, 
  Sliders, 
  Building2, 
  Clock,
  ArrowRight,
  GitBranch,
  TrendingUp,
  ShieldCheck,
  Users
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { QuarantineCenter } from '../quarantine/QuarantineCenter';
import { IngestionHub } from '../ingestion/IngestionHub';
import { LineageGraph } from '../lineage/LineageGraph';
import { DbscanClusterChart } from '../analytics/DbscanClusterChart';
import { BillingDashboard } from '../admin/BillingDashboard';
import { TenantManagementView } from '../admin/TenantManagementView';
import { SystemLogsView } from '../admin/SystemLogsView';
import { ComplianceAuditLogsView } from '../audit/ComplianceAuditLogsView';
import { ArchivedChunksView } from '../audit/ArchivedChunksView';
import { AiPipelineVisualizer } from '../pipeline/AiPipelineVisualizer';
import { motion } from 'framer-motion';

// Mock Performance Data for System Admin Charts
const ADMIN_PERFORMANCE_DATA = [
  { time: '08:00', rabbitMqRate: 980, redisCacheHits: 120000, llmCost: 11200, gpuLoad: 52 },
  { time: '10:00', rabbitMqRate: 1150, redisCacheHits: 145000, llmCost: 12100, gpuLoad: 61 },
  { time: '12:00', rabbitMqRate: 1340, redisCacheHits: 198000, llmCost: 13200, gpuLoad: 78 },
  { time: '14:00', rabbitMqRate: 1240, redisCacheHits: 245000, llmCost: 13950, gpuLoad: 64 },
  { time: '16:00', rabbitMqRate: 1480, redisCacheHits: 310000, llmCost: 14300, gpuLoad: 82 },
  { time: '18:00', rabbitMqRate: 1240, redisCacheHits: 392000, llmCost: 14820, gpuLoad: 65 }
];

export const PersonaDashboard: React.FC = () => {
  const { user, selectedTenant, conflicts, telemetry, setActiveView, activeView } = useApp();
  const [vectorSearchQuery, setVectorSearchQuery] = useState('');
  const [searchedVectorId, setSearchedVectorId] = useState<string | null>(null);

  const role = user?.role || 'DATA_STEWARD';
  const tenant = user?.tenant || 'HR';

  // Filter conflicts for Data Steward
  const tenantConflicts = conflicts.filter(c => {
    if (selectedTenant !== 'ALL' && selectedTenant !== 'GLOBAL') {
      return c.department === selectedTenant;
    }
    return c.department === tenant || selectedTenant === 'ALL';
  });

  const pendingTenantConflicts = tenantConflicts.filter(c => c.status === 'PENDING');

  const handleSearchVector = (e: React.FormEvent) => {
    e.preventDefault();
    if (vectorSearchQuery.trim()) {
      setSearchedVectorId(vectorSearchQuery.trim());
    }
  };

  // Specific Active View Routing Overrides
  if (activeView === 'billing') {
    return <BillingDashboard />;
  }

  if (activeView === 'tenant_mgmt' || activeView === 'settings') {
    return <TenantManagementView />;
  }

  if (activeView === 'system_logs') {
    return <SystemLogsView />;
  }

  if (activeView === 'audit_logs') {
    return (
      <div className="space-y-6">
        <ArchivedChunksView />
        <ComplianceAuditLogsView />
      </div>
    );
  }

  if (activeView === 'ai_pipeline') {
    return <AiPipelineVisualizer />;
  }

  if (activeView === 'ingestion') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <IngestionHub />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------------- */}
      {/* PERSONA 1: DATA STEWARD LAYOUT                                      */}
      {/* ------------------------------------------------------------------- */}
      {role === 'DATA_STEWARD' && (
        <motion.div 
          key="steward-layout"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Tenant Vector Health Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-slate-100">{tenant} Vector Health Workspace</h2>
                <StatusBadge status="clean" label="HARDWARE ISOLATED" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Data Steward Portal for reviewing semantic policy collisions and approving vector store commits for {tenant}.
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                Index: <span className="text-cyan-400 font-bold">b2b_{tenant.toLowerCase()}_policies</span>
              </span>
            </div>
          </div>

          {/* Prominent "Pending Conflicts" Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Prominent Card: Pending Conflicts */}
            <GlassCard glowColor={pendingTenantConflicts.length > 0 ? "amber" : "emerald"} className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pending Quarantined Conflicts
                  </div>
                  <div className="text-3xl font-extrabold text-amber-400 font-mono mt-1">
                    {pendingTenantConflicts.length} <span className="text-xs font-normal text-slate-400">items</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                <span>Requires Compliance Review:</span>
                <span className="text-amber-300 font-bold">High Priority</span>
              </div>
            </GlassCard>

            {/* Metric Card 2: Total Ingested Docs */}
            <GlassCard glowColor="cyan" className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {tenant} Ingested Documents
                  </div>
                  <div className="text-3xl font-extrabold text-slate-100 font-mono mt-1">
                    1,420 <span className="text-xs font-normal text-slate-400">docs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Database className="w-6 h-6" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                <span>Modality Breakdown:</span>
                <span className="text-cyan-300 font-bold">82% PDF / 18% OCR</span>
              </div>
            </GlassCard>

            {/* Metric Card 3: Resolved Conflicts */}
            <GlassCard glowColor="emerald" className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Resolved & Pruned Vectors
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                    1,840 <span className="text-xs font-normal text-slate-400">cleared</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                <span>Vector Accuracy Index:</span>
                <span className="text-emerald-300 font-bold">99.8% Clean</span>
              </div>
            </GlassCard>

            {/* Metric Card 4: Tenant-Specific Dynamic Pluggable Metric Card */}
            {tenant === 'ENGINEERING' && (
              <GlassCard glowColor="cyan" className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      GitHub Sync Status
                    </div>
                    <div className="text-2xl font-extrabold text-cyan-300 font-mono mt-1">
                      Active <span className="text-xs font-normal text-slate-400">(PR #402)</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <GitBranch className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                  <span>Latest Commit:</span>
                  <span className="text-cyan-300 font-bold">#8f3a9e2</span>
                </div>
              </GlassCard>
            )}

            {tenant === 'FINANCE' && (
              <GlassCard glowColor="amber" className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Q3 Report Anomalies
                    </div>
                    <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">
                      14 <span className="text-xs font-normal text-slate-400">discrepancies</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                  <span>Variance Threshold:</span>
                  <span className="text-amber-300 font-bold">&gt;$5,000 CapEx</span>
                </div>
              </GlassCard>
            )}

            {tenant === 'LEGAL' && (
              <GlassCard glowColor="rose" className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      NDA Clause Collisions
                    </div>
                    <div className="text-2xl font-extrabold text-rose-300 font-mono mt-1">
                      8 <span className="text-xs font-normal text-slate-400">contracts</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                  <span>Jurisdiction Scope:</span>
                  <span className="text-rose-300 font-bold">EU GDPR / CCPA</span>
                </div>
              </GlassCard>
            )}

            {(tenant === 'HR' || (tenant !== 'ENGINEERING' && tenant !== 'FINANCE' && tenant !== 'LEGAL')) && (
              <GlassCard glowColor="emerald" className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Policy Version Drift
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-300 font-mono mt-1">
                      3 <span className="text-xs font-normal text-slate-400">outdated</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                  <span>Employee Scope:</span>
                  <span className="text-emerald-300 font-bold">4,200 Staff</span>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Main Data Steward View: Quarantine Queue or Polished Zero Conflicts Empty State */}
          {pendingTenantConflicts.length === 0 ? (
            <GlassCard className="p-12 text-center border-emerald-500/30 glow-emerald">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 mb-4 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Zero Conflicts in Queue</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                All semantic document vectors for the <span className="text-emerald-400 font-bold font-mono">{tenant}</span> department are clean, reconciled, and committed to Qdrant vector database.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button 
                  onClick={() => setActiveView('ingestion')}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 hover:bg-cyan-500/30 transition-colors"
                >
                  <Database className="w-4 h-4" /> Ingest New Document Batch
                </button>
              </div>
            </GlassCard>
          ) : (
            <QuarantineCenter />
          )}
        </motion.div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* PERSONA 2: SYSTEM ADMIN LAYOUT                                      */}
      {/* ------------------------------------------------------------------- */}
      {role === 'SYSTEM_ADMIN' && (
        <motion.div 
          key="admin-layout"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-bold text-slate-100">Global System Infrastructure & Control</h2>
                <StatusBadge status="clean" label="SUPER ADMIN SCOPE" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoring LLM API costs, Redis semantic cache hit rates, RabbitMQ worker queues, and circuit breaker backpressure.
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                Circuit Breaker: CLOSED (0% Drop Rate)
              </span>
            </div>
          </div>

          {/* SYSTEM ADMIN SPECIFIC METRIC CARDS (Total LLM API Cost, Redis Cache Hits, RabbitMQ Backpressure) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Total LLM API Cost ($) */}
            <GlassCard glowColor="amber" className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total LLM API Cost Saved
                  </div>
                  <div className="text-3xl font-extrabold text-amber-400 font-mono mt-1">
                    ${telemetry.llmCostSavedUsd.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ADMIN_PERFORMANCE_DATA}>
                    <Area type="monotone" dataKey="llmCost" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                <span>Monthly API Cost Savings:</span>
                <span className="text-emerald-400 font-bold">+34.2% Saved</span>
              </div>
            </GlassCard>

            {/* Card 2: Redis Cache Hits */}
            <GlassCard glowColor="cyan" className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Redis Semantic Cache Hits
                  </div>
                  <div className="text-3xl font-extrabold text-cyan-300 font-mono mt-1">
                    {(telemetry.redisCacheHits / 1000000).toFixed(2)}M <span className="text-xs font-normal text-slate-400">hits</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ADMIN_PERFORMANCE_DATA}>
                    <Area type="monotone" dataKey="redisCacheHits" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                <span>Semantic Cache Ratio:</span>
                <span className="text-cyan-300 font-bold">84.2% Hit Ratio</span>
              </div>
            </GlassCard>

            {/* Card 3: RabbitMQ Backpressure */}
            <GlassCard glowColor="cyan" className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    RabbitMQ Worker Backpressure
                  </div>
                  <div className="text-3xl font-extrabold text-purple-400 font-mono mt-1">
                    {telemetry.rabbitMqRate} <span className="text-xs font-normal text-slate-400">msg/s</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Sliders className="w-6 h-6" />
                </div>
              </div>
              <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ADMIN_PERFORMANCE_DATA}>
                    <Bar dataKey="rabbitMqRate" fill="#c084fc" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80 flex justify-between">
                <span>Queue Processing Latency:</span>
                <span className="text-purple-300 font-bold">{telemetry.rabbitMqLatencyMs}ms lag</span>
              </div>
            </GlassCard>
          </div>

          {/* System Control & Ingestion Worker Meters */}
          <IngestionHub />
        </motion.div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* PERSONA 3: COMPLIANCE AUDITOR LAYOUT                                */}
      {/* ------------------------------------------------------------------- */}
      {role === 'COMPLIANCE_AUDITOR' && (
        <motion.div 
          key="auditor-layout"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-slate-100">Regulatory Audit & Vector Lineage Portal</h2>
                <StatusBadge status="clean" label="READ-ONLY AUDITOR" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Perform forensic document provenance inspection, verify EU/SOC2 compliance mandates, and query vector lineages.
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Immutable Audit Trail Active
              </span>
            </div>
          </div>

          {/* MASSIVE CENTERED VECTOR LINEAGE SEARCH BAR */}
          <GlassCard glowColor="cyan" className="p-8 text-center space-y-4 border-cyan-500/40">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Vector Provenance Forensic Engine
              </div>
              <h3 className="text-2xl font-extrabold text-slate-100">
                Enter Vector ID or Document Name to Trace Lineage
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Auditors can inspect full root document provenance, Apache Tika OCR block coordinates, MiniLM embeddings, and compliance decision history.
              </p>
            </div>

            <form onSubmit={handleSearchVector} className="max-w-2xl mx-auto flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. vec-77a8-4491-b01 or HR_Remote_Policy_2022.pdf"
                  value={vectorSearchQuery}
                  onChange={e => setVectorSearchQuery(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-12 pr-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 shadow-xl"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
              >
                <span>Trace Lineage</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-500 pt-2">
              <span>Try sample vector IDs:</span>
              <button 
                onClick={() => setVectorSearchQuery('vec-77a8-4491-b01')}
                className="text-cyan-400 hover:underline"
              >
                vec-77a8-4491-b01 (HR 2022)
              </button>
              <span>•</span>
              <button 
                onClick={() => setVectorSearchQuery('vec-99f2-1088-c44')}
                className="text-cyan-400 hover:underline"
              >
                vec-99f2-1088-c44 (HR 2026)
              </button>
              <span>•</span>
              <button 
                onClick={() => setVectorSearchQuery('vec-11b3-3392-a12')}
                className="text-cyan-400 hover:underline"
              >
                vec-11b3-3392-a12 (EU Legal)
              </button>
            </div>
          </GlassCard>

          {/* Interactive Lineage Tree */}
          <LineageGraph conflictId={searchedVectorId || 'conf-8901'} />

          {/* DBSCAN Semantic Topic Clusters */}
          <DbscanClusterChart />
        </motion.div>
      )}
    </div>
  );
};
