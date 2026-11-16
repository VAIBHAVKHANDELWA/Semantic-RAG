import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Copy, 
  Check, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  adminListUsers, 
  adminCreateUser, 
  adminPatchUser, 
  adminResetPassword
} from '../../api/client';
import type { AdminUserResponse, CreateUserRequest } from '../../api/client';
import type { RbacRole, RbacTenant } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const UserManagementView: React.FC = () => {
  const { user, token, addToast } = useApp();
  const queryClient = useQueryClient();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tempPasswordModalData, setTempPasswordModalData] = useState<{
    email: string;
    temporaryPassword: string;
    actionType: 'CREATED' | 'RESET';
  } | null>(null);

  // Form state for creating user
  const [createEmail, setCreateEmail] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createRole, setCreateRole] = useState<RbacRole>('DATA_STEWARD');
  const [createTenant, setCreateTenant] = useState<RbacTenant>(user?.tenant || 'HR');
  const [copied, setCopied] = useState(false);

  // 1. Fetch Users Query
  const { 
    data: users = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<AdminUserResponse[]>({
    queryKey: ['admin-users'],
    queryFn: () => adminListUsers(token),
    enabled: !!token && user?.role === 'SYSTEM_ADMIN',
  });

  // 2. Create User Mutation
  const createMutation = useMutation({
    mutationFn: (req: CreateUserRequest) => adminCreateUser(req, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateDisplayName('');
      addToast({
        type: 'success',
        title: 'User Account Created',
        description: `Account for ${res.email} successfully provisioned.`
      });
      if (res.temporaryPassword) {
        setTempPasswordModalData({
          email: res.email,
          temporaryPassword: res.temporaryPassword,
          actionType: 'CREATED'
        });
      }
    },
    onError: (err: any) => {
      addToast({
        type: 'rose',
        title: 'User Creation Failed',
        description: err.message || 'Could not provision new user account.'
      });
    }
  });

  // 3. Patch User (Role or Active status) Mutation
  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { role?: string; active?: boolean } }) => 
      adminPatchUser(id, patch, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast({
        type: 'info',
        title: 'User Profile Updated',
        description: `Updated status or privileges for ${res.email}.`
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'rose',
        title: 'Update Rejected',
        description: err.message || 'Operation forbidden or failed.'
      });
    }
  });

  // 4. Reset Password Mutation
  const resetMutation = useMutation({
    mutationFn: (id: string) => adminResetPassword(id, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast({
        type: 'amber',
        title: 'Password Reset Issued',
        description: `New temporary password generated for ${res.email}.`
      });
      if (res.temporaryPassword) {
        setTempPasswordModalData({
          email: res.email,
          temporaryPassword: res.temporaryPassword,
          actionType: 'RESET'
        });
      }
    },
    onError: (err: any) => {
      addToast({
        type: 'rose',
        title: 'Password Reset Failed',
        description: err.message || 'Could not reset password.'
      });
    }
  });

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      email: createEmail.trim(),
      displayName: createDisplayName.trim(),
      role: createRole,
      tenantId: user?.isSuperAdmin ? createTenant : (user?.tenant || 'HR')
    });
  };

  const handleCopyPassword = () => {
    if (tempPasswordModalData?.temporaryPassword) {
      navigator.clipboard.writeText(tempPasswordModalData.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Filter users based on search & selectors
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesTenant = tenantFilter === 'ALL' || u.tenantId === tenantFilter;
    return matchesSearch && matchesRole && matchesTenant;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const pendingChangeCount = users.filter(u => u.mustChangePassword).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                <span>User & Access Governance</span>
                {user?.isSuperAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                    SUPER ADMIN • ALL TENANTS
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                    TENANT: {user?.tenant}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                Manage enterprise identities, enforce zero-trust RBAC, and issue single-use temporary credentials.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh User List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Registered Users</div>
          <div className="text-2xl font-bold text-slate-100 font-mono">{totalUsers}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Active Accounts</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{activeUsers}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Pending Password Changes</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{pendingChangeCount}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, name or ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {user?.isSuperAdmin && (
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Tenants</option>
              <option value="HR">HR</option>
              <option value="FINANCE">FINANCE</option>
              <option value="LEGAL">LEGAL</option>
              <option value="ENGINEERING">ENGINEERING</option>
            </select>
          )}

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Roles</option>
            <option value="DATA_STEWARD">DATA_STEWARD</option>
            <option value="COMPLIANCE_AUDITOR">COMPLIANCE_AUDITOR</option>
            <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Password State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading verified user directory from database...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-rose-400 font-mono">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                    Failed to load users: {(error as Error)?.message || 'Forbidden'}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.email.toLowerCase() === user?.email?.toLowerCase();

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                            {u.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span>{u.displayName}</span>
                              {u.isSuperAdmin && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono border border-purple-500/30">
                                  SUPER
                                </span>
                              )}
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono border border-cyan-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          {u.tenantId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          disabled={patchMutation.isPending}
                          onChange={(e) => {
                            patchMutation.mutate({
                              id: u.id,
                              patch: { role: e.target.value }
                            });
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                        >
                          <option value="DATA_STEWARD">DATA_STEWARD</option>
                          <option value="COMPLIANCE_AUDITOR">COMPLIANCE_AUDITOR</option>
                          <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={patchMutation.isPending || isCurrentAdmin}
                          title={isCurrentAdmin ? "Cannot disable your own administrator account" : "Toggle active state"}
                          onClick={() => {
                            patchMutation.mutate({
                              id: u.id,
                              patch: { active: !u.active }
                            });
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all ${
                            u.active 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                          } ${isCurrentAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {u.active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>DISABLED</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.mustChangePassword ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Must Change
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          disabled={resetMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Reset password for ${u.email}? A temporary password will be generated.`)) {
                              resetMutation.mutate(u.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm">Provision New User Account</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs font-mono"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Work Email</label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="first.last@enterprise.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Full Display Name</label>
                  <input
                    type="text"
                    required
                    value={createDisplayName}
                    onChange={(e) => setCreateDisplayName(e.target.value)}
                    placeholder="e.g. Alex Turner"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Role</label>
                    <select
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as RbacRole)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 focus:outline-none font-mono"
                    >
                      <option value="DATA_STEWARD">DATA_STEWARD</option>
                      <option value="COMPLIANCE_AUDITOR">COMPLIANCE_AUDITOR</option>
                      <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-400">Tenant Department</label>
                    {user?.isSuperAdmin ? (
                      <select
                        value={createTenant}
                        onChange={(e) => setCreateTenant(e.target.value as RbacTenant)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 focus:outline-none font-mono"
                      >
                        <option value="HR">HR</option>
                        <option value="FINANCE">FINANCE</option>
                        <option value="LEGAL">LEGAL</option>
                        <option value="ENGINEERING">ENGINEERING</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={user?.tenant || 'HR'}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 font-mono"
                      />
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300">
                  A high-entropy temporary password will be cryptographically generated and returned once upon submission.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Provisioning...' : 'Provision Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TEMPORARY CREDENTIALS DISPLAY MODAL (SHOWS ONCE) */}
      <AnimatePresence>
        {tempPasswordModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {tempPasswordModalData.actionType === 'CREATED' ? 'Temporary Password Generated' : 'Password Reset Succeeded'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    User: <span className="text-cyan-300">{tempPasswordModalData.email}</span>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Copy this password now. For security reasons, it is hashed immediately in the database and will <strong>never</strong> be displayed again.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={tempPasswordModalData.temporaryPassword}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 font-mono text-sm text-amber-300 font-bold focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold font-mono transition-all ${
                      copied 
                        ? 'bg-emerald-500 text-slate-950' 
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                The user will be required to choose a new permanent password on their first login.
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setTempPasswordModalData(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
