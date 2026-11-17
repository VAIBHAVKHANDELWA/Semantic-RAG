import React, { useState, useEffect } from 'react';
import { Archive, Search, Clock, Database, Eye, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import type { ChunkMetadata } from '../../types';
import { verifyAuditChain, fetchArchivedChunks } from '../../api/audit';

export const ArchivedChunksView: React.FC = () => {
  const { archivedChunks: contextArchivedChunks, selectedTenant, user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChunk, setSelectedChunk] = useState<ChunkMetadata | null>(null);
  const [liveArchivedChunks, setLiveArchivedChunks] = useState<ChunkMetadata[]>([]);
  const [auditStatus, setAuditStatus] = useState<{ verified: boolean; totalEntries: number; message?: string } | null>(null);

  useEffect(() => {
    fetchArchivedChunks(user?.token).then(chunks => {
      if (chunks && chunks.length > 0) {
        setLiveArchivedChunks(chunks);
      }
    });

    verifyAuditChain(user?.token).then(res => {
      if (res) {
        setAuditStatus(res);
      }
    }).catch(err => console.debug('Audit chain verify ping:', err));
  }, [user?.token, selectedTenant]);

  const sourceChunks = liveArchivedChunks.length > 0 ? liveArchivedChunks : contextArchivedChunks;

  const filteredChunks = sourceChunks.filter(c => {
    if (selectedTenant !== 'ALL' && c.tenantId !== selectedTenant) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDoc = c.docName.toLowerCase().includes(q);
      const matchText = c.text.toLowerCase().includes(q);
      const matchAuthor = c.author.toLowerCase().includes(q);
      if (!matchDoc && !matchText && !matchAuthor) return false;
    }
    return true;
  });

  // Compute real date window
  const years = filteredChunks
    .map(c => c.docYear || (c.uploadDate ? parseInt(c.uploadDate.slice(0, 4)) : null))
    .filter((y): y is number => y !== null && !isNaN(y));
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;
  const temporalWindow = minYear && maxYear ? (minYear === maxYear ? `${minYear}` : `${minYear} – ${maxYear}`) : 'N/A';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl glow-amber">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
              Time-Travel Search & Historical Vector Audit Trail
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30 uppercase tracking-widest">
                Soft-Deleted Vault
              </span>
            </h2>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Querying legacy archived document vectors excluded from live AI RAG production retrieval. Retained for SOC2 & regulatory audit compliance.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="relative">
          <Search className="w-4 h-4 text-amber-400/60 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search archived vectors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-950/80 border border-amber-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 w-64 font-mono placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 bg-slate-900/80 border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-100">{filteredChunks.length}</div>
            <div className="text-xs text-slate-400">Archived Vectors ({selectedTenant})</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-slate-900/80 border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${auditStatus?.verified !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
              {auditStatus ? (auditStatus.verified ? 'Verified' : 'Tampered') : 'Verifying...'}
            </div>
            <div className="text-xs text-slate-400">
              Audit Chain Integrity ({auditStatus?.totalEntries ?? 0} entries)
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-slate-900/80 border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-cyan-300">{temporalWindow}</div>
            <div className="text-xs text-slate-400">Temporal Coverage Window</div>
          </div>
        </GlassCard>
      </div>

      {/* Main Table */}
      <GlassCard className="p-6 bg-slate-900/80 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Chunk Vector ID</th>
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Effective Date Range</th>
                <th className="py-3 px-4">Author / Owner</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredChunks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No soft-archived vectors found matching current search query or tenant scope.
                  </td>
                </tr>
              ) : (
                filteredChunks.map(chunk => (
                  <tr key={chunk.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3.5 px-4 font-bold text-amber-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-400/70" />
                      {chunk.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-semibold max-w-[200px] truncate">
                      {chunk.docName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 text-[11px]">
                        {chunk.effectiveDate || `${chunk.uploadDate} to Archived`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {chunk.author}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        {chunk.tenantId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                        <Archive className="w-3 h-3 text-amber-400" />
                        Archived
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedChunk(chunk)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 ml-auto transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Text
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Chunk Detail Modal */}
      {selectedChunk && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 glow-amber relative">
            <button
              onClick={() => setSelectedChunk(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Archive className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-amber-300 font-mono">
                Archived Vector Detail [{selectedChunk.id}]
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Document:</span> <span className="text-slate-200 font-semibold">{selectedChunk.docName}</span>
              </div>
              <div>
                <span className="text-slate-500">Author:</span> <span className="text-slate-200">{selectedChunk.author}</span>
              </div>
              <div>
                <span className="text-slate-500">Effective Range:</span> <span className="text-amber-300 font-semibold">{selectedChunk.effectiveDate}</span>
              </div>
              <div>
                <span className="text-slate-500">Tenant Scope:</span> <span className="text-slate-200">{selectedChunk.tenantId}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
                <span>Historical Soft-Deleted Chunk Content</span>
                <span className="text-[10px] text-amber-400">Excluded from Live RAG</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {user?.role === 'SYSTEM_ADMIN' ? (
                  <span className="text-amber-400 italic">[RESTRICTED_DATA - System Admin zero-trust text masking active]</span>
                ) : (
                  selectedChunk.text
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedChunk(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
