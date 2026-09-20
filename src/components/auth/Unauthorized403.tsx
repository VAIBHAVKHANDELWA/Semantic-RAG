import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, Sparkles, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { RbacRole } from '../../types';
import { motion } from 'framer-motion';

interface Unauthorized403Props {
  allowedRoles?: RbacRole[];
}

export const Unauthorized403: React.FC<Unauthorized403Props> = ({ allowedRoles = [] }) => {
  const { user, navigate, setRoleDebug, setActiveView } = useApp();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg rounded-3xl bg-slate-900/90 border border-rose-500/30 p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6 glow-rose relative z-10"
      >
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/20">
          <ShieldAlert className="w-9 h-9 animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5" /> HTTP 403 • FORBIDDEN RESOURCE
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100">Access Restricted by RBAC Policy</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Your current JWT persona does not hold the required security privileges to access this endpoint or widget.
          </p>
        </div>

        {/* Role Comparison Detail Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-left space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-slate-500">Your Current Persona:</span>
            <span className="text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              {user?.role || 'UNAUTHENTICATED'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-500">Required Allowed Roles:</span>
            <span className="text-cyan-400 font-bold">
              {allowedRoles.length > 0 ? allowedRoles.join(' | ') : 'SYSTEM_ADMIN'}
            </span>
          </div>
          <div className="text-[10px] text-slate-600 pt-1">
            Token: <span className="text-slate-500 truncate inline-block max-w-[280px] align-bottom">{user?.token || 'None'}</span>
          </div>
        </div>

        {/* Debug Quick Switch Action */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Switch Persona for Live Testing
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {allowedRoles.map(role => (
              <button
                key={role}
                onClick={() => {
                  setRoleDebug(role);
                  navigate('/dashboard');
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1.5 transition-colors font-mono"
              >
                <UserCheck className="w-3.5 h-3.5" /> Switch to {role}
              </button>
            ))}
          </div>

          <div>
            <button
              onClick={() => {
                setActiveView('quarantine');
                navigate('/dashboard');
              }}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Authorized Workspace
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
