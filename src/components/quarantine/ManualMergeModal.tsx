import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Check, X, FileText, Sparkles } from 'lucide-react';
import type { QuarantineConflict } from '../../types';

interface ManualMergeModalProps {
  conflict: QuarantineConflict;
  isOpen: boolean;
  onClose: () => void;
  onConfirmMerge: (mergedText: string) => void;
}

export const ManualMergeModal: React.FC<ManualMergeModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onConfirmMerge
}) => {
  // Pre-fill merged text with incoming text + rationale comment
  const defaultMergedText = `// RECONCILED POLICY CHUNK (MANUAL MERGE BY COMPLIANCE AUDITOR)\n// Derived from Existing (${conflict.existingChunk.docName}) & Incoming (${conflict.incomingChunk.docName})\n\n${conflict.incomingChunk.text}`;

  const [mergedText, setMergedText] = useState(defaultMergedText);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmMerge(mergedText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Edit & Merge Semantic Chunks Manually
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Human-in-the-Loop Override:</span> Reconciling 
              <span className="font-mono ml-1 font-bold">{conflict.existingChunk.docName}</span> and 
              <span className="font-mono ml-1 font-bold">{conflict.incomingChunk.docName}</span>. 
              The resulting text will be re-embedded with MiniLM and assigned a clean vector ID.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" /> Curated Vector Chunk Text
            </label>
            <textarea
              rows={10}
              value={mergedText}
              onChange={e => setMergedText(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-colors"
              required
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
            <span>Character Count: {mergedText.length}</span>
            <span>Approx Tokens: {Math.round(mergedText.length / 4)} tokens</span>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Check className="w-4 h-4" /> Reconcile & Write to Vector DB
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
