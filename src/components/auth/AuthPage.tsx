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
    loginWithCredentials,
    navigate 
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('hr_steward@enterprise.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPersona = async (pEmail: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setEmail(pEmail);
    setPassword('password123');
    try {
      await loginWithCredentials(pEmail, 'password123');
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
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
            Enterprise JWT Authentication
          </h2>
          <p className="text-xs text-slate-400">
            Zero-trust Role-Based Access Control (RBAC) & tenant isolation gateway.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* 1-CLICK QUICK PERSONA LOGIN BUTTONS */}
        <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 glow-cyan">
          <div className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-cyan-400" /> Instant Role Personas (Gateway API)
          </div>

          <div className="space-y-2 text-xs">
            {/* Button 1: Data Steward (HR) */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPersona('hr_steward@enterprise.com')}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-slate-200 text-left flex items-center justify-between transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-cyan-300">Data Steward (HR Department)</div>
                  <div className="text-[10px] text-slate-500 font-mono">hr_steward@enterprise.com</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Button 2: System Admin */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPersona('hr_admin@enterprise.com')}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-slate-200 text-left flex items-center justify-between transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-300">System Admin (Full Privileges)</div>
                  <div className="text-[10px] text-slate-500 font-mono">hr_admin@enterprise.com</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Button 3: Compliance Auditor */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickPersona('legal_auditor@enterprise.com')}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-slate-200 text-left flex items-center justify-between transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-purple-300">Compliance Auditor (Legal Scope)</div>
                  <div className="text-[10px] text-slate-500 font-mono">legal_auditor@enterprise.com</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Traditional Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" /> Enterprise Work Email
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@enterprise.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Password
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Authenticating with Backend...' : 'Authenticate via Java API Gateway'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Default seed password: <code className="text-cyan-400 font-mono">password123</code>
        </div>
      </motion.div>
    </div>
  );
};
