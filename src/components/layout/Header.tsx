import React, { useState } from 'react';
import { 
  Building2, 
  Bell, 
  Cpu, 
  Zap, 
  Activity, 
  ShieldCheck, 
  ChevronDown, 
  CheckCheck,
  Server,
  Layers,
  LogOut,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TenantScope } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const Header: React.FC = () => {
  const { 
    selectedTenant, 
    setSelectedTenant, 
    tenants, 
    telemetry, 
    notifications, 
    markNotificationAsRead, 
    clearNotifications,
    setSelectedConflictId,
    setActiveView,
    user,
    logout,
    navigate
  } = useApp();

  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentTenantObj = tenants.find(t => t.code === selectedTenant);

  const handleSelectTenant = (code: TenantScope) => {
    setSelectedTenant(code);
    setTenantDropdownOpen(false);
  };

  const handleNotificationClick = (conflictId?: string, notifId?: string) => {
    if (notifId) markNotificationAsRead(notifId);
    if (conflictId) {
      setSelectedConflictId(conflictId);
      setActiveView('quarantine');
      setNotificationsOpen(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Real-time Gateway Health & Workspace Name */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full block" />
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full block absolute inset-0 animate-ping opacity-75" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Gateway Health</span>
        </div>

        {/* Telemetry Micro-Pills */}
        <div className="hidden xl:flex items-center gap-4 text-xs">
          {/* Java Ingestion Gateway */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Java Ingestion:</span>
            <span className="font-mono text-cyan-300 font-semibold">{telemetry.gatewayLatencyMs}ms</span>
          </div>

          {/* RabbitMQ Queue */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">RabbitMQ:</span>
            <span className="font-mono text-amber-300 font-semibold">{(telemetry.rabbitMqRate / 1000).toFixed(1)}k msg/s</span>
            <span className="text-slate-500 font-mono">({telemetry.rabbitMqLatencyMs}ms)</span>
          </div>

          {/* Python AI Engine Load */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">AI Engine Load:</span>
            <span className="font-mono text-purple-300 font-semibold">{telemetry.pythonGpuLoad}%</span>
          </div>
        </div>
      </div>

      {/* Right Actions: Tenant Selector, Notifications & User Profile Badge */}
      <div className="flex items-center gap-3">
        {/* Tenant Scope Switcher */}
        <div className="relative">
          <button
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 transition-all text-xs font-medium text-slate-200"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {selectedTenant === 'ALL' ? 'All Contexts' : currentTenantObj?.name}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/30">
              {selectedTenant === 'ALL' ? 'GLOBAL' : currentTenantObj?.code}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {tenantDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
              >
                <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Enforced Tenant Isolation</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                <button
                  onClick={() => handleSelectTenant('ALL')}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800/60 transition-colors ${selectedTenant === 'ALL' ? 'bg-cyan-500/10 text-cyan-300 font-semibold' : 'text-slate-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <div>
                      <div>All Tenants Scope</div>
                      <div className="text-[10px] text-slate-500 font-normal">Cross-tenant conflict detection</div>
                    </div>
                  </div>
                </button>

                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTenant(t.code)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800/60 transition-colors ${selectedTenant === t.code ? 'bg-cyan-500/10 text-cyan-300 font-semibold' : 'text-slate-300'}`}
                  >
                    <div>
                      <div className="font-medium text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.isolationLevel}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 border border-slate-700 font-mono">
                      {t.activeConflictsCount} conflicts
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Quarantine Alert Bell Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>Quarantine Alert Stream</span>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No active quarantine notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.conflictId, n.id)}
                        className={`p-3 text-xs transition-colors cursor-pointer hover:bg-slate-800/50 ${!n.read ? 'bg-amber-500/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold ${n.type === 'ALERT' ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">{n.message}</p>
                        {n.conflictId && (
                          <div className="mt-2 text-[10px] text-cyan-400 font-medium hover:underline flex items-center gap-1">
                            Review Conflict Pair →
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Badge & Dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
                {user.name.slice(0, 1)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-semibold text-slate-200 text-xs">{user.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">{user.roleLabel}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                >
                  <div className="p-3 bg-slate-950 border-b border-slate-800">
                    <div className="font-bold text-slate-200 text-xs">{user.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                      <Sparkles className="w-3 h-3" /> {user.roleLabel}
                    </div>
                  </div>

                  <div className="p-2 space-y-1 text-xs">
                    <button
                      onClick={() => {
                        navigate('/onboarding');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> Workspace Config
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
