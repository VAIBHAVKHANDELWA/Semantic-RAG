import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'none';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'none',
  onClick 
}) => {
  const glowClasses = {
    emerald: 'glass-panel border-emerald-500/30 hover:border-emerald-500/50 glow-emerald',
    amber: 'glass-panel border-amber-500/30 hover:border-amber-500/50 glow-amber',
    rose: 'glass-panel border-rose-500/30 hover:border-rose-500/50 glow-rose',
    cyan: 'glass-panel border-cyan-500/30 hover:border-cyan-500/50 glow-cyan',
    none: 'glass-panel border-slate-800/80 hover:border-slate-700/80'
  };

  return (
    <div 
      onClick={onClick} 
      className={`rounded-xl p-5 transition-all duration-300 ${glowClasses[glowColor]} ${className}`}
    >
      {children}
    </div>
  );
};
