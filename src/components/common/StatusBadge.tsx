import React from 'react';

interface StatusBadgeProps {
  status: 'clean' | 'quarantined' | 'pruned' | 'processing' | 'ocr' | 'native' | 'closed' | 'open' | 'pending';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const styles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    clean: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400'
    },
    quarantined: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400 animate-pulse'
    },
    pruned: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400'
    },
    processing: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      dot: 'bg-cyan-400 animate-ping'
    },
    ocr: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      dot: 'bg-purple-400'
    },
    native: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
      dot: 'bg-blue-400'
    },
    closed: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400'
    },
    open: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400 animate-pulse'
    },
    pending: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400'
    }
  };

  const style = styles[status] || styles.processing;
  const displayLabel = label || status.toUpperCase();
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${paddingClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {displayLabel}
    </span>
  );
};
