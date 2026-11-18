import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Database,
  Cpu,
  Server
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppLogo } from '../common/AppLogo';
import { motion } from 'framer-motion';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = () => {
  const { loginWithCredentials } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email (ID) and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithCredentials(email.trim().toLowerCase(), password);
      // Automatic role-directed dashboard routing is handled in loginWithCredentials
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid enterprise credentials. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Cyber Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #22d3ee 1px, transparent 0)`,
          backgroundSize: '36px 36px'
        }}
      />

      {/* Dynamic Ambient Gradient Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.12, 0.2, 0.12]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/25 via-blue-600/15 to-transparent rounded-full blur-[160px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          scale: [1.15, 1, 1.15],
          opacity: [0.15, 0.22, 0.15]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-600/25 via-cyan-500/15 to-transparent rounded-full blur-[160px] pointer-events-none"
      />

      {/* Main Glassmorphic Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl bg-slate-900/80 border border-slate-800/90 p-8 shadow-2xl shadow-cyan-500/5 backdrop-blur-2xl relative z-10 space-y-6"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <AppLogo size="xl" showWordmark={true} subtitle="ENTERPRISE SEMANTIC SENTINEL" animated={true} />
          
          <div className="pt-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Enterprise Access Portal
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Authenticate with your enterprise ID to access your role-governed workspace.
            </p>
          </div>
        </div>

        {/* Live Infrastructure Trust Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/70 text-[10px] font-mono text-slate-400 text-center">
          <div className="flex items-center justify-center gap-1">
            <Database className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-semibold">pgvector 16</span>
          </div>
          <div className="flex items-center justify-center gap-1 border-x border-slate-800">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300 font-semibold">MiniLM+DeBERTa</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <Server className="w-3 h-3 text-purple-400" />
            <span className="text-purple-300 font-semibold">Zero-Trust</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2.5 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* Interactive Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Work Email / User ID */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Enterprise Work Email / ID
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Mapped to 1 Role</span>
            </label>
            <div className="relative group">
              <input 
                type="email" 
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. karan.singh@enterprise.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Password
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-500 hover:text-cyan-300 transition-colors flex items-center gap-1 font-mono"
              >
                {showPassword ? <EyeOff className="w-3 h-3 text-cyan-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Sign In Button with Sweep Glow Effect */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Authenticating & Routing...</span>
              </span>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Enforcement Notice */}
        <div className="pt-3 border-t border-slate-800/80 text-center space-y-1.5">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Automatic role routing & tenant isolation via signed JWT</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Default test password: <span className="text-slate-300 font-bold">password123</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
