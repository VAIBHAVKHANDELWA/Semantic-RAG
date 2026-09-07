import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    amber: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    rose: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />
  };

  const borderMap = {
    success: 'border-emerald-500/40 bg-slate-900/90 text-slate-100',
    amber: 'border-amber-500/40 bg-slate-900/90 text-slate-100',
    rose: 'border-rose-500/40 bg-slate-900/90 text-slate-100',
    info: 'border-cyan-500/40 bg-slate-900/90 text-slate-100'
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${borderMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-wide">{toast.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.description}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
