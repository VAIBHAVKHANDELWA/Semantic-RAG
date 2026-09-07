import React, { useState } from 'react';
import { 
  Network, 
  UploadCloud, 
  ShieldAlert, 
  GitFork, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, conflicts, selectedTenant, tenants } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const pendingConflictsCount = conflicts.filter(c => c.status === 'PENDING').length;
  const currentTenantObj = tenants.find(t => t.code === selectedTenant);

  const navItems = [
    {
      id: 'quarantine',
      label: 'Quarantine Center',
      icon: ShieldAlert,
      badge: pendingConflictsCount > 0 ? pendingConflictsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    {
      id: 'ingestion',
      label: 'Multi-Modal Ingestion',
      icon: UploadCloud
    },
    {
      id: 'lineage',
      label: 'Data Lineage Graph',
      icon: GitFork
    },
    {
      id: 'analytics',
      label: 'System Analytics & DBSCAN',
      icon: BarChart3
    }
  ];

  return (
    <aside 
      className={`h-screen border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between transition-all duration-300 relative z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Section: App Logo & Collapse Toggle */}
      <div>
        <div className="h-16 border-b border-slate-800/80 px-4 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">Semantic RAG</h1>
                <p className="text-[10px] text-cyan-400 font-mono tracking-tight">DATA PRUNING ENGINE</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <Network className="w-5 h-5 text-white" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/5' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge !== undefined && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Active Tenant Isolation Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scope Isolation</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">
              {selectedTenant === 'ALL' ? 'Multi-Tenant Cross Check' : currentTenantObj?.isolationLevel}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-cyan-400" /> Vector Index
              </span>
              <span className="text-emerald-400 font-mono">Isolated</span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
};
