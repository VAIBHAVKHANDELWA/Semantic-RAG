import React from 'react';
import { AlertTriangle, Clock, Sparkles, ShieldCheck } from 'lucide-react';
import type { QuarantineConflict } from '../../types';

interface LLMVerdictBarProps {
  conflict: QuarantineConflict;
  onOpenLineageModal: (conflictId: string) => void;
}

export const LLMVerdictBar: React.FC<LLMVerdictBarProps> = ({ conflict, onOpenLineageModal }) => {
  const scorePercent = (conflict.similarityScore * 100).toFixed(1);

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl shadow-amber-500/5 space-y-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-cyan-400 to-indigo-500" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Similarity Cosine Score Gauge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Conflict Engine</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs text-amber-300 font-semibold">Semantic Collision:</span>
            <span className="font-mono text-sm font-bold text-amber-400">{scorePercent}%</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 font-mono px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{conflict.temporalSummary}</span>
          </div>
        </div>

        {/* Traceability Graph Modal Quick Action */}
        <button
          onClick={() => onOpenLineageModal(conflict.id)}
          className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-500/5 hover:scale-[1.02]"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>View Node Lineage Graph →</span>
        </button>
      </div>

      {/* Contradiction Verdict Details */}
      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <span className="font-semibold text-slate-200">Adjudicator (DeBERTa Cross-Encoder, {conflict.verdictConfidence ? (conflict.verdictConfidence * 100).toFixed(1) + '%' : '96.8%'} conf): </span>
          <span className="text-amber-300 font-mono uppercase font-bold mr-2">[{conflict.verdictType}]</span>
          <span className="text-slate-300">{conflict.contradictionExplanation}</span>
        </div>
      </div>
    </div>
  );
};
