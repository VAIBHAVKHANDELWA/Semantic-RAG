import React, { useState, useRef, useEffect } from 'react';
import { 
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
  Brain,
  Users,
  MessageSquareText,
  LogOut,
  ExternalLink,
  Key,
  ChevronUp,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { AppLogo } from '../common/AppLogo';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, conflicts, selectedTenant, tenants, user, logout, navigate } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const pendingConflictsCount = conflicts.filter(c => c.status === 'PENDING').length;
  const currentTenantObj = tenants.find(t => t.code === selectedTenant);

  // Close profile popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

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
            id: 'rag_chat',
            label: 'Ask the Policies (RAG)',
            icon: MessageSquareText,
            badge: 'Active Only',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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
            id: 'rag_chat',
            label: 'Ask the Policies (RAG)',
            icon: MessageSquareText,
            badge: 'Active Only',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          },
          {
            id: 'user_mgmt',
            label: 'User Governance',
            icon: Users
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
            id: 'rag_chat',
            label: 'Ask the Policies (RAG)',
            icon: MessageSquareText,
            badge: 'Active Only',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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
          <div className="flex items-center overflow-hidden">
            <AppLogo size="sm" showWordmark={!collapsed} subtitle="ENTERPRISE SENTINEL" />
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Role-Driven Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent text-cyan-200 border-l-2 border-cyan-400 font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 hover:translate-x-0.5'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]' : 'text-slate-400 group-hover:text-slate-200'}`} />
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

      {/* Bottom Section: User Profile & Scope Isolation */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/90 space-y-2 relative" ref={profileRef}>
        {/* Scope Isolation status */}
        {!collapsed ? (
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[120px]">{selectedTenant === 'ALL' ? 'Global Scope' : `${selectedTenant} Scope`}</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">ACTIVE</span>
          </div>
        ) : null}

        {/* User Profile Trigger Button */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`w-full flex items-center rounded-xl transition-all cursor-pointer ${
                collapsed 
                  ? 'justify-center p-2 hover:bg-slate-900 border border-transparent hover:border-slate-800' 
                  : 'gap-2.5 p-2 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left'
              } ${profileOpen ? 'border-cyan-500/50 ring-1 ring-cyan-500/30' : ''}`}
              title={collapsed ? `${user.name} (${user.role})` : undefined}
            >
              {/* Circular Avatar with Active Pulse */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-slate-950 font-extrabold flex items-center justify-center text-xs shadow-md shadow-cyan-500/20">
                  {user.name.slice(0, 1)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
              </div>

              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
                      <span className="text-cyan-400 font-semibold">{user.tenant}</span> • {user.role}
                    </div>
                  </div>
                  <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                </>
              )}
            </button>

            {/* Profile Popover Menu */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute z-50 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden py-1 ${
                    collapsed 
                      ? 'left-full ml-3 bottom-0 w-72' 
                      : 'left-0 right-0 bottom-full mb-2 w-full min-w-[240px]'
                  }`}
                >
                  {/* Profile Header Details */}
                  <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-md shadow-cyan-500/20 shrink-0">
                        {user.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-100 text-xs truncate">{user.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {user.email || `${user.id.toLowerCase()}@enterprise.com`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                        {user.tenant}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                        {user.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono pt-0.5">
                      <Key className="w-3 h-3 shrink-0" />
                      <span>Real Session Active • Signed JWT</span>
                    </div>
                  </div>

                  {/* Actions: Workspace Config & Sign Out */}
                  <div className="p-2 space-y-1 text-xs">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/onboarding');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-medium">Workspace Config</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out (Switch Account)</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all text-center block"
          >
            {collapsed ? 'In' : 'Sign In'}
          </button>
        )}
      </div>
    </aside>
  );
};
