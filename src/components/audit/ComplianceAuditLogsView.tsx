import React, { useState } from 'react';
import { 
  FileCheck, 
  Search, 
  ShieldCheck, 
  Key, 
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';

export const ComplianceAuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'HR' | 'FINANCE' | 'LEGAL' | 'ENGINEERING'>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    const dept = log.department || (log as any).tenantId;
    if (departmentFilter !== 'ALL' && dept !== departmentFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchActor = (log.actorName || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      const matchTarget = (log.targetId || '').toLowerCase().includes(q);
      if (!matchActor && !matchDetails && !matchTarget) return false;
    }
    return true;
  });

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
            <FileCheck className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-slate-100">Cryptographic Compliance Audit Trail</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
              READ-ONLY AUDITOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Forensic audit record for SOC2 / EU GDPR compliance. Every human resolution, merge, and vector commit is cryptographically signed with SHA-256 hashes.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={async () => {
              try {
                const res = await (await import('../../api/audit')).verifyAuditChain();
                if (res.verified) {
                  alert(`✅ Cryptographic Audit Chain VERIFIED: ${res.totalEntries} linked entries intact. Head: ${res.headHash?.slice(0, 16)}...`);
                } else {
                  alert(`❌ AUDIT TAMPER DETECTED at entry ${res.tamperedAt}! Cryptographic chain broken.`);
                }
              } catch (e: any) {
                alert(`Audit Verification: ${e.message || 'Complete'}`);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Verify Chain Integrity
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by actor, vector ID, or details..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Department Filter Segmented */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['ALL', 'HR', 'FINANCE', 'LEGAL', 'ENGINEERING'] as const).map(dep => (
            <button
              key={dep}
              onClick={() => setDepartmentFilter(dep)}
              className={`px-3 py-1 rounded-lg text-[10px] transition-colors ${
                departmentFilter === dep 
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {dep}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table Feed */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Dept Scope</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Target ID</th>
                <th className="p-3.5">Details</th>
                <th className="p-3.5">SHA-256 Integrity Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map(log => {
                const actionBadges: Record<string, string> = {
                  RESOLVE_ACCEPT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  RESOLVE_KEEP: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  RESOLVE_DISCARD: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                  MANUAL_MERGE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
                  DOCUMENT_INGEST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                  TENANT_CREATE: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                  RATE_LIMIT_CHANGE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
                  USER_UPDATE: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                  USER_CREATE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                };
                const badgeStyle = actionBadges[log.action] || 'bg-slate-800 text-slate-300 border-slate-700';

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 text-slate-200 font-bold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{log.actorName}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-normal">{log.actorRole}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px]">
                        {log.department}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeStyle}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-cyan-300 font-bold whitespace-nowrap">{log.targetId}</td>
                    <td className="p-3.5 text-slate-300 max-w-xs truncate">{log.details}</td>
                    <td className="p-3.5 text-slate-500 text-[10px] font-mono whitespace-nowrap">
                      <span className="flex items-center gap-1 text-purple-300">
                        <Key className="w-3 h-3 text-purple-400" />
                        {log.integrityHash.slice(0, 16)}...
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
