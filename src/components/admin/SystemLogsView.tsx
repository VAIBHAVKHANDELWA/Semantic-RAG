import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Terminal,
  Pause,
  Play
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';

interface LogLine {
  id: string;
  timestamp: string;
  service: 'RABBITMQ' | 'REDIS_CACHE' | 'PYTHON_WORKER' | 'JAVA_GATEWAY' | 'CIRCUIT_BREAKER' | 'SSE_TELEMETRY';
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

export const SystemLogsView: React.FC = () => {
  const { sseLogs } = useApp();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);

  // Sync real-time SSE telemetry payloads into live terminal logs
  useEffect(() => {
    if (!isStreaming || !sseLogs || sseLogs.length === 0) return;

    const latest = sseLogs[0];
    const newLog: LogLine = {
      id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: latest.timestamp || new Date().toTimeString().slice(0, 8),
      service: 'SSE_TELEMETRY',
      level: latest.circuitBreakerStatus === 'OPEN' ? 'WARN' : 'INFO',
      message: latest.logMessage || `Job [${latest.jobId}]: Status ${latest.status} (${latest.chunksCreated} chunks, ${latest.conflictsFound} conflicts)`
    };

    setLogs(prev => {
      // Avoid duplicate logs with exact same message
      if (prev.length > 0 && prev[0].message === newLog.message) return prev;
      return [newLog, ...prev.slice(0, 49)];
    });
  }, [sseLogs, isStreaming]);

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
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">System Logs & Worker Telemetry Stream</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
              SYSTEM ADMIN PRIVILEGED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stdout log inspection for RabbitMQ workers, Redis cache evictions, PyTorch MiniLM GPU nodes, and Spring Boot API Gateway.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border transition-all ${isStreaming
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
          >
            {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isStreaming ? 'Pause Live Stream' : 'Resume Live Stream'}</span>
          </button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
        {/* Terminal Header Bar */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>sys-log-tail -f /var/log/semantic-rag/*.log</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">LIVE STREAM ACTIVE</span>
          </div>
        </div>

        {/* Logs Terminal Output */}
        <div className="p-4 font-mono text-xs space-y-2 max-h-[550px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Terminal className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
              <p>No telemetry events logged yet in current session.</p>
              <p className="text-[11px] text-slate-600">Events will stream here automatically via SSE when ingestion jobs run.</p>
            </div>
          ) : (
            logs.map(log => {
              const levelColors: Record<string, string> = {
                INFO: 'text-cyan-400',
                WARN: 'text-amber-400',
                ERROR: 'text-rose-400',
                DEBUG: 'text-slate-500'
              };

              const servicePills: Record<string, string> = {
                RABBITMQ: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
                REDIS_CACHE: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                PYTHON_WORKER: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                JAVA_GATEWAY: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
                CIRCUIT_BREAKER: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                SSE_TELEMETRY: 'bg-teal-500/10 text-teal-300 border-teal-500/30'
              };

              return (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-1.5 hover:bg-slate-900/60 rounded transition-colors">
                  <span className="text-slate-600 text-[11px] shrink-0">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${servicePills[log.service] || servicePills.SSE_TELEMETRY}`}>
                    {log.service}
                  </span>
                  <span className={`text-[10px] font-bold shrink-0 ${levelColors[log.level] || 'text-slate-400'}`}>
                    [{log.level}]
                  </span>
                  <span className="text-slate-300 truncate">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};
