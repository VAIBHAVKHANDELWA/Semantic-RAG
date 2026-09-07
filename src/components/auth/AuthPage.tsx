import React, { useState } from 'react';
import { 
  Network, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Building2, 
  ArrowRight, 
  Key
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TenantScope, UserRole } from '../../types';
import { motion } from 'framer-motion';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { login, signup, navigate } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.rivera@enterprise.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState<UserRole>('IT_ADMIN');
  const [tenant, setTenant] = useState<TenantScope>('HR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      login(email, password, role, tenant);
    } else {
      signup(name || 'Enterprise User', email, password, role, tenant);
    }
  };

  const handleDemoQuickLogin = (demoRole: UserRole, demoTenant: TenantScope, demoEmail: string) => {
    login(demoEmail, 'demo123', demoRole, demoTenant);
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
            {mode === 'login' ? 'Enterprise Sign In' : 'Create Middleware Account'}
          </h2>
          <p className="text-xs text-slate-400">
            Enforce multi-tenant isolation & conflict-aware document pruning.
          </p>
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
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signup' 
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
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
              <span>Select Profile Role</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
            >
              <option value="IT_ADMIN">IT Admin & Infrastructure Security</option>
              <option value="COMPLIANCE_AUDITOR">Compliance & Regulatory Auditor</option>
              <option value="AI_ARCHITECT">Lead AI & RAG Architect</option>
              <option value="LEGAL_COUNSEL">Enterprise Legal Counsel</option>
            </select>
          </div>

          {/* Department / Tenant Isolation Scope Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>Tenant Scope Enforced</span>
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            </label>
            <select
              value={tenant}
              onChange={e => setTenant(e.target.value as TenantScope)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
            >
              <option value="HR">HR & People Operations (Isolated)</option>
              <option value="LEGAL">Legal & Regulatory Compliance</option>
              <option value="FINANCE">Finance & Procurement</option>
              <option value="ENGINEERING">Engineering & Architecture</option>
              <option value="ALL">Global Multi-Tenant Scope</option>
            </select>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
          >
            <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Enterprise Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick-Login Shortcuts */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider text-center flex items-center justify-center gap-1">
            <Key className="w-3 h-3 text-cyan-400" /> Demo 1-Click Quick Roles
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <button
              onClick={() => handleDemoQuickLogin('IT_ADMIN', 'HR', 'alex.rivera@enterprise.ai')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left transition-colors truncate"
            >
              <div className="font-bold text-cyan-400">IT Admin</div>
              <div className="text-[9px] text-slate-500 truncate">HR Scope</div>
            </button>
            <button
              onClick={() => handleDemoQuickLogin('LEGAL_COUNSEL', 'LEGAL', 'marcus.vance@legal.ai')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left transition-colors truncate"
            >
              <div className="font-bold text-amber-400">Legal Counsel</div>
              <div className="text-[9px] text-slate-500 truncate">Legal Scope</div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
