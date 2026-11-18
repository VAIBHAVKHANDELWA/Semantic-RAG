import React from 'react';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  animated?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showWordmark = true,
  subtitle = 'ENTERPRISE SENTINEL',
  className = '',
  animated = false
}) => {
  const sizeMap = {
    xs: { emblem: 'w-6 h-6', title: 'text-xs', sub: 'text-[8px]' },
    sm: { emblem: 'w-8 h-8', title: 'text-sm', sub: 'text-[9px]' },
    md: { emblem: 'w-10 h-10', title: 'text-base', sub: 'text-[10px]' },
    lg: { emblem: 'w-12 h-12', title: 'text-lg', sub: 'text-[11px]' },
    xl: { emblem: 'w-16 h-16', title: 'text-2xl', sub: 'text-xs' }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Bespoke Geometric Vector Shield Emblem */}
      <div 
        className={`${currentSize.emblem} relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 shadow-lg shadow-cyan-500/20 overflow-hidden group`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-blue-600/10 to-indigo-600/20 pointer-events-none" />

        {/* Vector Shield SVG Emblem */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-[72%] h-[72%] relative z-10 ${animated ? 'animate-pulse' : ''}`}
        >
          <defs>
            <linearGradient id="vg-stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="vg-core-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="vg-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hexagonal Vector Boundary */}
          <path
            d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z"
            stroke="url(#vg-stroke-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Inner 3-Dimensional Lattice / Vector Rays */}
          <path
            d="M24 4V24M42 33.5L24 24M6 33.5L24 24"
            stroke="url(#vg-stroke-grad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />

          {/* Isometric Inner Vector Prism */}
          <path
            d="M24 14L33 19V29L24 34L15 29V19L24 14Z"
            fill="url(#vg-core-grad)"
            fillOpacity="0.25"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Radiant Vector Node */}
          <circle
            cx="24"
            cy="24"
            r="3.5"
            fill="#38bdf8"
            filter="url(#vg-glow)"
          />
          <circle
            cx="24"
            cy="24"
            r="1.5"
            fill="#ffffff"
          />
        </svg>
      </div>

      {/* Typography Brand Mark */}
      {showWordmark && (
        <div className="leading-tight text-left">
          <div className={`font-extrabold tracking-tight text-slate-100 flex items-center gap-1.5 ${currentSize.title}`}>
            <span>VectorGuard</span>
            <span className="px-1.5 py-0.2 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-black tracking-wider">
              AI
            </span>
          </div>
          {subtitle && (
            <div className={`font-mono text-cyan-400/80 font-bold tracking-widest uppercase mt-0.5 ${currentSize.sub}`}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
