import React from 'react';
import { 
  Zap, 
  ShieldAlert, 
  Activity, 
  Terminal,
  Layers,
  FileType,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { motion } from 'framer-motion';

export const BatchIngestionTracker: React.FC = () => {
  const { batchJobs, sseLogs, isThrottled, selectedTenant } = useApp();

  const filteredJobs = selectedTenant === 'ALL'
    ? batchJobs
    : batchJobs.filter(j => (j.department || (j as any).tenantId) === selectedTenant);

  return (
    <div className="space-y-6 font-sans">
      {/* Throttling Alert Banner if Backpressure Active */}
      {isThrottled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs space-y-2 shadow-xl shadow-amber-500/10"
        >
          <div className="flex items-center justify-between font-bold text-sm">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
              AI RATE LIMITS REACHED — RABBITMQ BACKPRESSURE ACTIVE
            </span>
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px]">
              STATUS: THROTTLED
            </span>
          </div>
          <p className="text-slate-300 text-xs">
            The Python MiniLM AI engine has hit external rate limits. Spring Batch workers are queuing chunks safely into RabbitMQ queues to prevent pipeline drops.
          </p>
        </motion.div>
      )}

      {/* Batch Ingestion Job Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
          <span>Active Enterprise Batch Ingestion Jobs ({filteredJobs.length})</span>
          <span className="text-cyan-400 font-bold">SSE Real-Time Stream</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs font-mono">
            No active batch jobs for current tenant scope. Drop files above to initiate.
          </div>
        ) : (
          filteredJobs.map(job => (
            <GlassCard key={job.jobId} glowColor={job.backpressureActive ? 'amber' : 'cyan'} className="space-y-4">
              {/* Job Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    job.backpressureActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100 font-mono">{job.batchName}</h4>
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 text-[10px] font-mono font-bold">
                        {job.jobId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-3">
                      <span>Files: {job.totalFiles}</span>
                      <span>•</span>
                      <span className="text-blue-300 font-bold flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-400" /> {job.nativeFileCount} Native Tika
                      </span>
                      <span>•</span>
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <FileType className="w-3 h-3 text-amber-400" /> {job.ocrFileCount} OCR Scanned
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <StatusBadge 
                    status={job.backpressureActive ? 'pending' : job.progressPercentage >= 100 ? 'clean' : 'native'} 
                    label={job.status.replace(/_/g, ' ')}
                  />
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <Activity className={`w-3.5 h-3.5 ${job.backpressureActive ? 'text-amber-400 animate-pulse' : 'text-cyan-400 animate-spin'}`} />
                    <span>Pipeline Step: {job.status}</span>
                  </span>
                  <span className="font-bold">{job.progressPercentage}%</span>
                </div>

                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      job.backpressureActive 
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                        : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400'
                    }`}
                    style={{ width: `${job.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Real-time Telemetry Grid Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500">Chunks Created</div>
                  <div className="text-base font-bold text-cyan-300 mt-0.5">{job.chunksCreated.toLocaleString()}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500">Conflicts Flagged</div>
                  <div className={`text-base font-bold mt-0.5 ${job.conflictsFound > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {job.conflictsFound} conflicts
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500">Throughput</div>
                  <div className="text-base font-bold text-purple-300 mt-0.5">{job.throughputChunksPerSec} / sec</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500">Est. Time Remaining</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">{job.estimatedTimeRemaining}</div>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* SSE Telemetry Real-Time Log Feed */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>SSE Telemetry Push Ticker (Server-Sent Events)</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" /> EventSource Connected
          </span>
        </div>

        <div className="p-3 font-mono text-[11px] space-y-1.5 max-h-40 overflow-y-auto">
          {sseLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-3 text-slate-400">
              <span className="text-slate-600 shrink-0">{log.timestamp}</span>
              <span className="text-cyan-400 font-bold shrink-0">[{log.jobId}]</span>
              <span className="text-slate-200 truncate">{log.logMessage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
