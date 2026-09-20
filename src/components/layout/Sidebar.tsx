import React, { useState } from 'react';
import { 
  Network, 
  UploadCloud, 
  ShieldAlert, 
  GitFork, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Lock,
  Sliders,
  CreditCard,
  Building2,
  FileCheck,
  Activity,
  UserCheck,
  Brain
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, conflicts, selectedTenant, tenants, user, setRoleDebug } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const pendingConflictsCount = conflicts.filter(c => c.status === 'PENDING').length;
  const currentTenantObj = tenants.find(t => t.code === selectedTenant);

  // Dynamic Navigation Items based on user.role
  const getNavItems = () => {
    const role = user?.role || 'DATA_STEWARD';

    switch (role) {
      case 'DATA_STEWARD':
        return [
          {
            id: 'quarantine',
            label: 'Quarantine Queue',
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
            id: 'ai_pipeline',
            label: 'AI Processing Pipeline',
            icon: Brain
          },
          {
            id: 'lineage',
            label: 'Document Lineage',
            icon: GitFork
          },
          {
            id: 'audit_logs',
            label: 'Soft-Deleted Vector Audit Vault',
            icon: FileCheck,
            badge: 'Audit',
            badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          },
          {
            id: 'settings',
            label: 'Tenant Settings & Scope',
            icon: Building2
          }
        ];

      case 'SYSTEM_ADMIN':
        return [
          {
            id: 'analytics',
            label: 'Global Health & Metrics',
            icon: Activity
          },
          {
            id: 'billing',
            label: 'Billing & API Rate Limits',
            icon: CreditCard
          },
          {
            id: 'ai_pipeline',
            label: 'AI Pipeline Engine',
            icon: Brain
          },
          {
            id: 'tenant_mgmt',
            label: 'Tenant Management',
            icon: Building2
          },
          {
            id: 'system_logs',
            label: 'System Logs & Telemetry',
            icon: Sliders
          }
        ];

      case 'COMPLIANCE_AUDITOR':
        return [
          {
            id: 'lineage',
            label: 'Lineage Traceability',
            icon: GitFork,
            badge: 'Audit',
            badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          },
          {
            id: 'analytics',
            label: 'DBSCAN Topic Clusters',
            icon: BarChart3
          },
          {
            id: 'audit_logs',
            label: 'Compliance Audit Logs',
            icon: FileCheck
          }
        ];

      default:
        return [
          { id: 'quarantine', label: 'Quarantine Center', icon: ShieldAlert },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
        ];
    }
  };

  const navItems = getNavItems();

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
                <p className="text-[10px] text-cyan-400 font-mono tracking-tight">PRUNING ENGINE</p>
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

        {/* Persona Indicator Banner */}
        {!collapsed && user && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> {user.role}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {user.tenant}
            </span>
          </div>
        )}

        {/* Role-Driven Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/5 font-bold' 
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

      {/* Bottom Section: Active Tenant Isolation Status & Debug Persona Switcher */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        {!collapsed ? (
          <>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Scope Isolation
                </span>
                <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
                {selectedTenant === 'ALL' || selectedTenant === 'GLOBAL' ? 'Global Multi-Tenant' : currentTenantObj?.isolationLevel}
              </div>
            </div>

            {/* Quick Debug Switcher for Effortless Persona Testing */}
            <div className="pt-1">
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 px-1">
                Debug Switch Persona:
              </div>
              <div className="grid grid-cols-3 gap-1 text-[9px] font-mono font-bold">
                <button
                  onClick={() => setRoleDebug('DATA_STEWARD')}
                  className={`py-1 rounded border transition-colors ${
                    user?.role === 'DATA_STEWARD' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Switch to Data Steward"
                >
                  STEWARD
                </button>
                <button
                  onClick={() => setRoleDebug('SYSTEM_ADMIN')}
                  className={`py-1 rounded border transition-colors ${
                    user?.role === 'SYSTEM_ADMIN' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Switch to System Admin"
                >
                  ADMIN
                </button>
                <button
                  onClick={() => setRoleDebug('COMPLIANCE_AUDITOR')}
                  className={`py-1 rounded border transition-colors ${
                    user?.role === 'COMPLIANCE_AUDITOR' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Switch to Compliance Auditor"
                >
                  AUDITOR
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
  );
};
