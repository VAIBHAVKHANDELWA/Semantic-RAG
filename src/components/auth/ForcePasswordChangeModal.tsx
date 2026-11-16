import React, { useState } from 'react';
import { ShieldAlert, Lock, CheckCircle2, XCircle, ArrowRight, LogOut, KeyRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { changePasswordApi } from '../../api/client';
import { motion } from 'framer-motion';

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, token, updateUserPassword, logout, addToast } = useApp();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If user does not require password change, do not render modal
  if (!user || !user.mustChangePassword) {
    return null;
  }

  // Real-time policy validation
  const hasMinLength = newPassword.length >= 10;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const isDifferentFromOld = newPassword.length > 0 && newPassword !== oldPassword;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isValidPolicy = hasMinLength && hasLetter && hasDigit && isDifferentFromOld && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidPolicy) {
      setErrorMessage('Please ensure all security policy criteria below are satisfied.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePasswordApi(oldPassword, newPassword, token);
      updateUserPassword(res.token);
      addToast({
        type: 'success',
        title: 'Password Updated',
        description: 'Your permanent password has been set. Full access granted.'
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to change password. Please verify current credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Amber Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Action Required: Set Permanent Password
            </h3>
            <p className="text-xs text-slate-400">
              Account: <span className="font-mono text-cyan-300">{user.email}</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          For security compliance, temporary or administrator-reset passwords must be replaced before you can access tenant documents or quarantine workflows.
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Current / Temporary Password
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter temporary password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 10 chars with letter & digit"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm text-slate-200 focus:outline-none transition-colors"
            />
          </div>

          {/* Real-time Policy Checklist */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-[11px] font-mono">
            <div className="text-slate-400 font-bold mb-1">Password Policy Requirements:</div>
            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
              {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>At least 10 characters long ({newPassword.length}/10)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasLetter && hasDigit ? 'text-emerald-400' : 'text-slate-500'}`}>
              {hasLetter && hasDigit ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>Contains at least one letter and at least one digit</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isDifferentFromOld ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isDifferentFromOld ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>Different from current password</span>
            </div>
            <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
              {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>New passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isValidPolicy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating Password...' : 'Save New Password & Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Cancel & Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};
