import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Sparkles, 
  CheckCheck,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LLMVerdictBar } from './LLMVerdictBar';
import { SideBySideDiff } from './SideBySideDiff';
import { ManualMergeModal } from './ManualMergeModal';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';

export const QuarantineCenter: React.FC = () => {
  const { 
    conflicts, 
    selectedConflictId, 
    setSelectedConflictId, 
    resolveConflict, 
    selectedTenant,
    setLineageModalConflictId
  } = useApp();

  const [minSimilarity, setMinSimilarity] = useState<number>(0.85);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conflicts based on Tenant, Similarity threshold, Status, and Search
  const filteredConflicts = conflicts.filter(c => {
    if (selectedTenant !== 'ALL' && c.department !== selectedTenant) return false;
    if (c.similarityScore < minSimilarity) return false;
    if (statusFilter === 'PENDING' && c.status !== 'PENDING') return false;
    if (statusFilter === 'RESOLVED' && c.status === 'PENDING') return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchDocA = c.existingChunk.docName.toLowerCase().includes(query);
      const matchDocB = c.incomingChunk.docName.toLowerCase().includes(query);
      const matchExp = c.contradictionExplanation.toLowerCase().includes(query);
      if (!matchDocA && !matchDocB && !matchExp) return false;
    }
    return true;
  });

  const activeConflict = conflicts.find(c => c.id === selectedConflictId) || filteredConflicts[0];

  const handleAction = (action: 'ACCEPTED_INCOMING' | 'KEPT_EXISTING' | 'DISCARDED_BOTH') => {
    if (activeConflict) {
      resolveConflict(activeConflict.id, action);
    }
  };

  const handleConfirmMerge = (mergedText: string) => {
    if (activeConflict) {
      resolveConflict(activeConflict.id, 'MANUALLY_MERGED', mergedText);
      setMergeModalOpen(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Section Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Human-in-the-Loop Quarantine Resolution Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reviewing semantic collisions flagged by MiniLM vector comparison (85%–97% cosine similarity range).
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filters:</span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input 
              type="text"
              placeholder="Search document or terms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50 w-44"
            />
          </div>

          {/* Similarity Slider */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-slate-400 font-mono text-[11px]">Similarity: &gt;{(minSimilarity * 100).toFixed(0)}%</span>
            <input 
              type="range"
              min="0.80"
              max="0.95"
              step="0.01"
              value={minSimilarity}
              onChange={e => setMinSimilarity(parseFloat(e.target.value))}
              className="w-24 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 font-medium">
            {(['ALL', 'PENDING', 'RESOLVED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                  statusFilter === st 
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left Selector Sidebar + Right Split-View Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
            <span>Flagged Collision Pairs ({filteredConflicts.length})</span>
            <span className="text-[10px] text-amber-400 font-mono">85% - 97% Range</span>
          </div>

          {filteredConflicts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
              <CheckCheck className="w-8 h-8 mx-auto text-emerald-400 opacity-60" />
              <div>No quarantined conflicts match current filters</div>
            </div>
          ) : (
            filteredConflicts.map(c => {
              const isSelected = activeConflict?.id === c.id;
              const isPending = c.status === 'PENDING';
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedConflictId(c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-slate-900 border-cyan-500/50 glow-cyan' 
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                      {(c.similarityScore * 100).toFixed(1)}% Collision
                    </span>

                    <StatusBadge 
                      status={isPending ? 'pending' : 'clean'} 
                      label={isPending ? 'PENDING' : c.status.replace('_', ' ')}
                    />
                  </div>

                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {c.incomingChunk.docName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    vs {c.existingChunk.docName}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{c.department}</span>
                    <span>{c.createdAt.slice(11, 16)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Active Conflict Viewer & Action Bar (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeConflict ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeConflict.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 1. Conflict Analysis & LLM Verdict Bar */}
                <LLMVerdictBar 
                  conflict={activeConflict} 
                  onOpenLineageModal={(id) => setLineageModalConflictId(id)}
                />

                {/* 2. Side-by-Side Diff Viewer */}
                <SideBySideDiff 
                  existingChunk={activeConflict.existingChunk} 
                  incomingChunk={activeConflict.incomingChunk} 
                />

                {/* 3. Action Bar with 4 Resolution Buttons */}
                <GlassCard className="p-4 bg-slate-900/90 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 font-medium">
                    {activeConflict.status === 'PENDING' ? (
                      <span className="flex items-center gap-1.5 text-amber-400 font-mono">
                        <Sparkles className="w-4 h-4" /> Human Compliance Review Required
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                        <CheckCircle2 className="w-4 h-4" /> Resolved: {activeConflict.status}
                      </span>
                    )}
                  </div>

                  {/* Decision Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    {/* Button 1: Accept Incoming (Prune Old) */}
                    <button
                      onClick={() => handleAction('ACCEPTED_INCOMING')}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                      title="Keep Chunk B and delete Chunk A from vector store"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Accept Incoming (Prune Old)</span>
                    </button>

                    {/* Button 2: Keep Existing (Discard Incoming) */}
                    <button
                      onClick={() => handleAction('KEPT_EXISTING')}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                      title="Discard Chunk B and retain existing Chunk A"
                    >
                      <XCircle className="w-4 h-4 text-amber-400" />
                      <span>Keep Existing (Discard Incoming)</span>
                    </button>

                    {/* Button 3: Discard Both */}
                    <button
                      onClick={() => handleAction('DISCARDED_BOTH')}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/10"
                      title="Purge both chunks from pipeline"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Discard Both</span>
                    </button>

                    {/* Button 4: Edit & Merge Manually */}
                    <button
                      onClick={() => setMergeModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/10"
                      title="Edit reconciled text manually"
                    >
                      <Edit3 className="w-4 h-4 text-cyan-400" />
                      <span>Edit & Merge</span>
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500">
              Select a conflict pair from the left panel to review.
            </div>
          )}
        </div>
      </div>

      {/* Manual Merge Modal */}
      {activeConflict && (
        <ManualMergeModal
          conflict={activeConflict}
          isOpen={mergeModalOpen}
          onClose={() => setMergeModalOpen(false)}
          onConfirmMerge={handleConfirmMerge}
        />
      )}
    </div>
  );
};
