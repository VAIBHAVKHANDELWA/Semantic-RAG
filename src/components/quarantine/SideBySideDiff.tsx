import React from 'react';
import { FileText, Calendar, User, Database, Hash, ArrowUpRight, ArrowDownRight, Lock, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ChunkMetadata } from '../../types';
import { useApp } from '../../context/AppContext';

interface SideBySideDiffProps {
  existingChunk: ChunkMetadata;
  incomingChunk: ChunkMetadata;
}

export const SideBySideDiff: React.FC<SideBySideDiffProps> = ({ existingChunk, incomingChunk }) => {
  const { user } = useApp();
  const isAdmin = user?.role === 'SYSTEM_ADMIN';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card: Existing Chunk A (Legacy Vector Store Candidate) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 relative overflow-hidden">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Existing Vector Chunk A (In Vector DB)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {existingChunk.temporalStatus || 'Active'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono">
              {existingChunk.docYear} Baseline
            </span>
          </div>
        </div>

        {/* Document Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-mono">
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" /> Source Doc
            </div>
            <div className="text-slate-200 truncate font-semibold mt-0.5">{existingChunk.docName}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3 text-purple-400" /> Author / Owner
            </div>
            <div className="text-slate-200 truncate mt-0.5">{existingChunk.author}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" /> Upload Date
            </div>
            <div className="text-slate-200 mt-0.5">{existingChunk.uploadDate}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Effective Range
            </div>
            <div className="text-emerald-300 font-semibold mt-0.5 truncate">{existingChunk.effectiveDate || `${existingChunk.uploadDate} to Present`}</div>
          </div>
        </div>

        {/* Chunk Text Body with Highlighted Diff */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Raw Parsed Text Content</span>
            <span className="text-[10px] text-rose-400 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Flagged Superseded Terms
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed min-h-[140px] whitespace-pre-wrap">
            {isAdmin ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center justify-center gap-2 h-28 text-center">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-amber-300">[RESTRICTED_DATA - TENANT PRIVACY ENFORCED]</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                    System Admins can only view document metadata. Raw chunk text is restricted by zero-trust RBAC policy.
                  </div>
                </div>
              </div>
            ) : existingChunk.highlightedDiffRanges ? (
              existingChunk.highlightedDiffRanges.map((range, idx) => (
                <span 
                  key={idx}
                  className={range.type === 'removed' ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/50 px-1 py-0.5 rounded font-bold' : ''}
                >
                  {range.text}
                </span>
              ))
            ) : (
              existingChunk.text
            )}
          </div>
        </div>

        {/* Vector Embedding Preview Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" /> Vector ID: <span className="text-slate-400">{existingChunk.embeddingId}</span>
          </span>
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-400" /> {existingChunk.tokenCount} tokens
          </span>
        </div>
      </div>

      {/* Right Card: Incoming Chunk B (Fresh Upload Candidate) */}
      <div className="rounded-2xl bg-slate-900/80 border border-cyan-500/30 p-5 space-y-4 relative overflow-hidden glow-cyan">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Incoming Chunk B (Quarantined Pipeline)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              {incomingChunk.temporalStatus || 'Quarantined'}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono">
              {incomingChunk.docYear} Revision
            </span>
          </div>
        </div>

        {/* Document Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 font-mono">
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" /> Source Doc
            </div>
            <div className="text-slate-200 truncate font-semibold mt-0.5">{incomingChunk.docName}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3 text-purple-400" /> Author / Owner
            </div>
            <div className="text-slate-200 truncate mt-0.5">{incomingChunk.author}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" /> Upload Date
            </div>
            <div className="text-slate-200 mt-0.5">{incomingChunk.uploadDate}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Target Effective Date
            </div>
            <div className="text-cyan-300 font-semibold mt-0.5 truncate">{incomingChunk.effectiveDate || `${incomingChunk.uploadDate} (Pending)`}</div>
          </div>
        </div>

        {/* Chunk Text Body with Highlighted Diff */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Raw Parsed Text Content</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Proposed Policy Additions
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed min-h-[140px] whitespace-pre-wrap">
            {isAdmin ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center justify-center gap-2 h-28 text-center">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-amber-300">[RESTRICTED_DATA - TENANT PRIVACY ENFORCED]</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                    System Admins can only view document metadata. Raw chunk text is restricted by zero-trust RBAC policy.
                  </div>
                </div>
              </div>
            ) : incomingChunk.highlightedDiffRanges ? (
              incomingChunk.highlightedDiffRanges.map((range, idx) => (
                <span 
                  key={idx}
                  className={range.type === 'added' ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/50 px-1 py-0.5 rounded font-bold' : ''}
                >
                  {range.text}
                </span>
              ))
            ) : (
              incomingChunk.text
            )}
          </div>
        </div>

        {/* Vector Embedding Preview Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" /> Vector ID: <span className="text-slate-400">{incomingChunk.embeddingId}</span>
          </span>
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-400" /> {incomingChunk.tokenCount} tokens
          </span>
        </div>
      </div>
    </div>
  );
};
