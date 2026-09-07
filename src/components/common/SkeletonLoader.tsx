import React from 'react';

export const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-slate-800/60 rounded-lg w-full" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-slate-900/60 border border-slate-800/40 rounded-lg w-full flex items-center justify-between px-4">
          <div className="h-4 bg-slate-800 rounded w-1/4" />
          <div className="h-4 bg-slate-800 rounded w-1/6" />
          <div className="h-4 bg-slate-800 rounded w-1/6" />
          <div className="h-6 bg-slate-800 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-xl border border-slate-800/60 bg-slate-900/40 animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-5 bg-slate-800 rounded w-1/3" />
        <div className="h-5 bg-slate-800 rounded-full w-16" />
      </div>
      <div className="h-20 bg-slate-800/40 rounded-lg w-full" />
      <div className="h-8 bg-slate-800 rounded-lg w-full" />
    </div>
  );
};
