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
  service: 'RABBITMQ' | 'REDIS_CACHE' | 'PYTHON_WORKER' | 'JAVA_GATEWAY' | 'CIRCUIT_BREAKER';
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

const INITIAL_LOGS: LogLine[] = [
  { id: 'log-1', timestamp: '19:24:01.102', service: 'JAVA_GATEWAY', level: 'INFO', message: 'POST /api/v1/ingest - JWT claims verified for tenant HR (sarah.jenkins@enterprise.ai)' },
  { id: 'log-2', timestamp: '19:24:01.450', service: 'RABBITMQ', level: 'INFO', message: 'Published job [ing-101] to exchange vector.ingest.hr (rate: 1,240 msg/s)' },
  { id: 'log-3', timestamp: '19:24:01.890', service: 'REDIS_CACHE', level: 'DEBUG', message: 'Semantic cache MISS for SHA256(chunk_77a8). Forwarding to MiniLM GPU worker pool.' },
  { id: 'log-4', timestamp: '19:24:02.120', service: 'PYTHON_WORKER', level: 'INFO', message: 'MiniLM-L6-v2 batch embedding complete (batch_size=32, latency=14.2ms, GPU_mem=4.2GB)' },
  { id: 'log-5', timestamp: '19:24:02.400', service: 'CIRCUIT_BREAKER', level: 'INFO', message: 'LLM Circuit Breaker status: CLOSED (Failure rate: 0.00%, threshold: 15.00%)' },
  { id: 'log-6', timestamp: '19:24:03.010', service: 'RABBITMQ', level: 'WARN', message: 'Worker queue vector.collision.finance backpressure detected (lag: 1.4ms)' },
  { id: 'log-7', timestamp: '19:24:03.550', service: 'REDIS_CACHE', level: 'INFO', message: 'Pruned 14 duplicate vector keys under namespace b2b_hr_policies (saved 12.4MB RAM)' }
];

export const SystemLogsView: React.FC = () => {
  const { telemetry } = useApp();
  const [logs, setLogs] = useState<LogLine[]>(INITIAL_LOGS);
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0');
      
      const sampleMessages = [
        { service: 'RABBITMQ', level: 'INFO', message: `Dispatched ${Math.floor(Math.random()*50)+10} chunks to pgvector indexer queue.` },
        { service: 'REDIS_CACHE', level: 'DEBUG', message: `Semantic cache HIT (similarity=0.982) for query vector ID vec-${Math.floor(Math.random()*8000)+1000}.` },
        { service: 'PYTHON_WORKER', level: 'INFO', message: `GPU load at ${telemetry.pythonGpuLoad}%. Active PyTorch worker instances: 8.` },
        { service: 'JAVA_GATEWAY', level: 'INFO', message: `Auth token refreshed for tenant LEGAL (isolation=Encrypted Tenant Context).` },
        { service: 'CIRCUIT_BREAKER', level: 'INFO', fontBold: true, message: 'Telemetry heartbeat sync ok. 0 dropped packets.' }
      ];

      const chosen = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

      const newLog: LogLine = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        service: chosen.service as any,
        level: chosen.level as any,
        message: chosen.message
      };

      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, telemetry.pythonGpuLoad]);

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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border transition-all ${
              isStreaming 
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
          {logs.map(log => {
            const levelColors = {
              INFO: 'text-cyan-400',
              WARN: 'text-amber-400',
              ERROR: 'text-rose-400',
              DEBUG: 'text-slate-500'
            };

            const servicePills = {
              RABBITMQ: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
              REDIS_CACHE: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
              PYTHON_WORKER: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
              JAVA_GATEWAY: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
              CIRCUIT_BREAKER: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            };

            return (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-1.5 hover:bg-slate-900/60 rounded transition-colors">
                <span className="text-slate-600 text-[11px] shrink-0">{log.timestamp}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${servicePills[log.service]}`}>
                  {log.service}
                </span>
                <span className={`text-[10px] font-bold shrink-0 ${levelColors[log.level]}`}>
                  [{log.level}]
                </span>
                <span className="text-slate-300 truncate">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
