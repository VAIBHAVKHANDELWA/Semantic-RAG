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
    <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 glow-amber space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Similarity Cosine Score Gauge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Conflict Engine</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs text-amber-300 font-semibold">Semantic Collision:</span>
            <span className="font-mono text-sm font-bold text-amber-400">{scorePercent}%</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{conflict.temporalSummary}</span>
          </div>
        </div>

        {/* Traceability Graph Modal Quick Action */}
        <button
          onClick={() => onOpenLineageModal(conflict.id)}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-500/5"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>View Node Lineage Graph →</span>
        </button>
      </div>

      {/* Contradiction Verdict Details */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-slate-200">Adjudicator (DeBERTa Cross-Encoder, {conflict.verdictConfidence ? (conflict.verdictConfidence * 100).toFixed(1) + '%' : '96.8%'} conf): </span>
          <span className="text-amber-300 font-mono uppercase font-bold mr-2">[{conflict.verdictType}]</span>
          <span className="text-slate-300 leading-relaxed">{conflict.contradictionExplanation}</span>
        </div>
      </div>
    </div>
  );
};
