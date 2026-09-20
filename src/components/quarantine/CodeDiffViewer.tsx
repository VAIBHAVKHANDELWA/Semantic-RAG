import React, { useState } from 'react';
import { 
  GitCommit, 
  GitBranch, 
  Code2, 
  ShieldCheck, 
  User, 
  Calendar, 
  X, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import type { ChunkMetadata } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeDiffViewerProps {
  existingChunk: ChunkMetadata;
  incomingChunk: ChunkMetadata;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ existingChunk, incomingChunk }) => {
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const mockCommitHash = '8f3a9e2c41d9904f';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(mockCommitHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock code/YAML representation of the SRE/engineering chunks
  const existingCodeLines = [
    { num: 1, text: '# sre-incident-response.yaml (2023 Baseline)', type: 'comment' },
    { num: 2, text: 'version: "3.2"', type: 'normal' },
    { num: 3, text: 'service_name: "payment-gateway-proxy"', type: 'normal' },
    { num: 4, text: 'sla_policy:', type: 'normal' },
    { num: 5, text: '  sev1_ack_timeout_mins: 15', type: 'removed' },
    { num: 6, text: '  secondary_escalation_mins: 30', type: 'removed' },
    { num: 7, text: '  auto_page_oncall: false', type: 'removed' },
    { num: 8, text: '  notification_channel: "#ops-alerts"', type: 'normal' }
  ];

  const incomingCodeLines = [
    { num: 1, text: '# sre-incident-response.yaml (2026 Revision)', type: 'comment' },
    { num: 2, text: 'version: "4.0"', type: 'normal' },
    { num: 3, text: 'service_name: "payment-gateway-proxy"', type: 'normal' },
    { num: 4, text: 'sla_policy:', type: 'normal' },
    { num: 5, text: '  sev1_ack_timeout_mins: 5    # Sev-1 SLA reduced', type: 'added' },
    { num: 6, text: '  secondary_escalation_mins: 10 # Faster escalation', type: 'added' },
    { num: 7, text: '  auto_page_oncall: true       # Mandatory PagerDuty', type: 'added' },
    { num: 8, text: '  notification_channel: "#sre-sev1-war-room"', type: 'added' }
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner: Engineering Code Diff Header & View Commit Action */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 font-mono">sre-incident-response.yaml</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                ENGINEERING / SRE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
              <span className="flex items-center gap-1"><GitBranch className="w-3 h-3 text-purple-400" /> main</span>
              <span>•</span>
              <span>Modality: Markdown / Config Code</span>
            </div>
          </div>
        </div>

        {/* Mock "View Commit" Button */}
        <button
          onClick={() => setCommitModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/10 hover:border-cyan-400"
        >
          <GitCommit className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>View Commit #{mockCommitHash.slice(0, 7)}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </button>
      </div>

      {/* Code Side-by-Side Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Existing Code (2023) */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-300 font-bold text-[11px]">Existing Chunk A (2023 SLA)</span>
            </div>
            <span className="text-[10px] text-slate-500">YAML Config</span>
          </div>

          <div className="p-3 space-y-1 overflow-x-auto min-h-[180px]">
            {existingCodeLines.map(line => (
              <div 
                key={line.num} 
                className={`flex items-start gap-3 px-2 py-0.5 rounded leading-relaxed ${
                  line.type === 'removed' ? 'bg-rose-500/15 text-rose-300 border-l-2 border-rose-500' : 'text-slate-300'
                }`}
              >
                <span className="text-[10px] text-slate-600 select-none w-4 text-right">{line.num}</span>
                <span className="font-mono text-xs">{line.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/50 px-4 py-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
            <span>Vector ID: {existingChunk.embeddingId}</span>
            <span className="text-rose-400 font-bold">- 3 Lines Superseded</span>
          </div>
        </div>

        {/* Right: Incoming Code (2026) */}
        <div className="rounded-xl bg-slate-950 border border-cyan-500/30 overflow-hidden font-mono text-xs glow-cyan">
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-bold text-[11px]">Incoming Chunk B (2026 Commit)</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-bold">Proposed Additions</span>
          </div>

          <div className="p-3 space-y-1 overflow-x-auto min-h-[180px]">
            {incomingCodeLines.map(line => (
              <div 
                key={line.num} 
                className={`flex items-start gap-3 px-2 py-0.5 rounded leading-relaxed ${
                  line.type === 'added' ? 'bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-500' : 'text-slate-300'
                }`}
              >
                <span className="text-[10px] text-slate-600 select-none w-4 text-right">{line.num}</span>
                <span className="font-mono text-xs">{line.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/50 px-4 py-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
            <span>Vector ID: {incomingChunk.embeddingId}</span>
            <span className="text-emerald-400 font-bold">+ 4 Lines Added</span>
          </div>
        </div>
      </div>

      {/* Commit Detail Modal */}
      <AnimatePresence>
        {commitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-100 font-mono">
                  <GitCommit className="w-4 h-4 text-cyan-400" />
                  <span>Git Commit Inspection</span>
                </div>
                <button
                  onClick={() => setCommitModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 font-mono text-xs">
                {/* Commit Hash Header */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Commit Hash</div>
                    <div className="text-cyan-300 font-bold text-sm mt-0.5">{mockCommitHash}</div>
                  </div>
                  <button
                    onClick={handleCopyHash}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Commit Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-purple-400" /> Author
                    </div>
                    <div className="text-slate-200 font-semibold mt-0.5">David Chen (Principal SRE)</div>
                    <div className="text-[10px] text-slate-500">david.chen@enterprise.io</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" /> Commit Timestamp
                    </div>
                    <div className="text-slate-200 mt-0.5">2026-09-07 19:14:30</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3" /> Signed & Verified
                    </div>
                  </div>
                </div>

                {/* Commit Message */}
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">
                    Commit Message
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed font-semibold">
                    refactor(sre): enforce 5-minute Sev-1 SLA escalation &amp; automated PagerDuty dispatch
                  </div>
                </div>

                {/* Affected Files */}
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">
                    Modified Repository Files (2)
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-cyan-300">configs/sre-incident-response.yaml</span>
                      <span className="text-emerald-400 text-[10px]">+4 / -3</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">src/handlers/pagerduty_dispatcher.py</span>
                      <span className="text-emerald-400 text-[10px]">+18 / -2</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setCommitModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
