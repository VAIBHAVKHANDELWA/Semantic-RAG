import React, { useState } from 'react';
import { 
  Network, 
  ShieldCheck, 
  User as UserIcon, 
  Mail, 
  Lock, 
  Building2, 
  ArrowRight, 
  Key,
  UserCheck,
  Activity,
  FileCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { RbacTenant, RbacRole } from '../../types';
import { motion } from 'framer-motion';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { 
    loginWithProfile, 
    loginAsDataSteward, 
    loginAsSystemAdmin, 
    loginAsAuditor, 
    navigate 
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.rivera@enterprise.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState<RbacRole>('DATA_STEWARD');
  const [tenant, setTenant] = useState<RbacTenant>('HR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginWithProfile(email, role, tenant);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-2xl relative z-10 space-y-6"
      >
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div 
            onClick={() => navigate('/')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Network className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">
            {mode === 'login' ? 'JWT Enterprise Sign In' : 'Create Middleware Account'}
          </h2>
          <p className="text-xs text-slate-400">
            Enforce Role-Based Access Control (RBAC) & multi-tenant isolation.
          </p>
        </div>

        {/* 1-CLICK QUICK PERSONA LOGIN BUTTONS (REQUIRED BY PROMPT) */}
        <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 glow-cyan">
          <div className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-cyan-400" /> Instant Quick-Select Personas (Mock JWT)
          </div>

          <div className="space-y-2 text-xs">
            {/* Button 1: Data Steward (HR) */}
            <button
              onClick={loginAsDataSteward}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-slate-200 text-left flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-cyan-300">Login as Data Steward (HR)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Quarantine Queue & Tenant Vector Health</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Button 2: System Admin */}
            <button
              onClick={loginAsSystemAdmin}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-slate-200 text-left flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-300">Login as System Admin</div>
                  <div className="text-[10px] text-slate-500 font-mono">LLM API Costs, Cache Hits & Backpressure</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Button 3: Compliance Auditor */}
            <button
              onClick={loginAsAuditor}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-slate-200 text-left flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-purple-300">Login as Auditor</div>
                  <div className="text-[10px] text-slate-500 font-mono">Centered Vector Lineage Search & Provenance</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 font-medium text-xs">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login' 
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signup' 
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Register
          </button>
        </div>

        {/* Custom Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Corporate Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="name@enterprise.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50"
                required
              />
            </div>
          </div>

          {/* Profile Role Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>Select RBAC Persona</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as RbacRole)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
            >
              <option value="DATA_STEWARD">DATA_STEWARD (HR / Department Vector Health)</option>
              <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (Global Telemetry & API Cost)</option>
              <option value="COMPLIANCE_AUDITOR">COMPLIANCE_AUDITOR (Vector Lineage Search)</option>
            </select>
          </div>

          {/* Department / Tenant Scope Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>Tenant Scope Scope</span>
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            </label>
            <select
              value={tenant}
              onChange={e => setTenant(e.target.value as RbacTenant)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
            >
              <option value="HR">HR (Isolated Human Resources Scope)</option>
              <option value="LEGAL">LEGAL (Legal & Compliance)</option>
              <option value="FINANCE">FINANCE (Finance & Procurement)</option>
              <option value="GLOBAL">GLOBAL (Multi-Tenant Scope)</option>
            </select>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
          >
            <span>{mode === 'login' ? 'Issue JWT & Authenticate' : 'Register & Issue JWT'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
