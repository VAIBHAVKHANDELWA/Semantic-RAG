import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Sliders, 
  Lock,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import type { TenantScope, Tenant } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const TenantManagementView: React.FC = () => {
  const { tenants, addTenant, updateTenantRateLimit } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantCode, setTenantCode] = useState<TenantScope>('ENGINEERING');
  const [isolationLevel, setIsolationLevel] = useState<Tenant['isolationLevel']>('Hardware Isolated');
  const [rateLimit, setRateLimit] = useState(600);

  const handleSubmitNewTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenantName.trim()) {
      addTenant(tenantName.trim(), tenantCode, isolationLevel, rateLimit);
      setTenantName('');
      setModalOpen(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 space-y-6 max-w-7xl mx-auto font-sans"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">Enterprise Multi-Tenant Management</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
              SYSTEM ADMIN PRIVILEGED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Provision new department tenants, enforce vector hardware isolation boundaries, and adjust worker rate limits.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Tenant</span>
        </button>
      </div>

      {/* Active Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tenants.map(t => (
          <GlassCard key={t.id} glowColor="cyan" className="space-y-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  {t.code}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-1">{t.name}</h3>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Isolation Level:</span>
                <span className="text-slate-200 font-bold">{t.isolationLevel}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ingested Docs:</span>
                <span className="text-cyan-300 font-bold">{t.totalIngestedDocs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Conflicts:</span>
                <span className={`font-bold ${t.activeConflictsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {t.activeConflictsCount} pending
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Storage Used:</span>
                <span className="text-purple-300 font-bold">{t.storageUsedGb || 12.4} GB</span>
              </div>
            </div>

            {/* Rate Limit Control */}
            <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-amber-400" /> Worker Rate Limit:
                </span>
                <span className="text-amber-300 font-bold">{t.rateLimitReqPerMin || 600} req/min</span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={t.rateLimitReqPerMin || 600}
                onChange={e => updateTenantRateLimit(t.code, parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Provision New Tenant Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-slate-100">Provision New Department Tenant</h3>
                </div>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewTenant} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">Department / Tenant Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marketing & Operations"
                    value={tenantName}
                    onChange={e => setTenantName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Scope Code:</label>
                    <select
                      value={tenantCode}
                      onChange={e => setTenantCode(e.target.value as TenantScope)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="HR">HR</option>
                      <option value="FINANCE">FINANCE</option>
                      <option value="LEGAL">LEGAL</option>
                      <option value="ENGINEERING">ENGINEERING</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Isolation Boundary:</label>
                    <select
                      value={isolationLevel}
                      onChange={e => setIsolationLevel(e.target.value as any)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="Hardware Isolated">Hardware Isolated</option>
                      <option value="Logical Namespace">Logical Namespace</option>
                      <option value="Encrypted Tenant Context">Encrypted Tenant Context</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Worker Rate Limit ({rateLimit} req/min):</label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={rateLimit}
                    onChange={e => setRateLimit(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20"
                  >
                    Deploy Tenant Context
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
