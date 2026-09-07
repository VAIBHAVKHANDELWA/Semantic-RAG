import React from 'react';
import { motion } from 'framer-motion';
import { X, GitFork } from 'lucide-react';
import { LineageGraph } from './LineageGraph';
import { useApp } from '../../context/AppContext';

export const LineageGraphModal: React.FC = () => {
  const { lineageModalConflictId, setLineageModalConflictId } = useApp();

  if (!lineageModalConflictId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Data Lineage & Document Provenance Modal
            </h3>
          </div>
          <button
            onClick={() => setLineageModalConflictId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <LineageGraph 
            conflictId={lineageModalConflictId} 
            isModal={true}
            onCloseModal={() => setLineageModalConflictId(null)} 
          />
        </div>
      </motion.div>
    </div>
  );
};
