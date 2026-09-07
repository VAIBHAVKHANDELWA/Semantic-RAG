import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  TenantScope, 
  Tenant, 
  IngestionItem, 
  QuarantineConflict, 
  DbscanCluster, 
  SystemTelemetry, 
  NotificationItem,
  PipelineStage,
  AppRoute,
  UserProfile,
  UserRole,
  WorkspaceConfig 
} from '../types';
import { 
  INITIAL_TENANTS, 
  INITIAL_INGESTION_QUEUE, 
  INITIAL_QUARANTINE_CONFLICTS, 
  INITIAL_DBSCAN_CLUSTERS, 
  INITIAL_TELEMETRY, 
  INITIAL_NOTIFICATIONS 
} from '../data/mockData';

export interface ToastMessage {
  id: string;
  type: 'success' | 'amber' | 'rose' | 'info';
  title: string;
  description: string;
}

interface AppContextType {
  // Navigation & Route Guard
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;

  // Mock Authentication & Profile State
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole, tenant: TenantScope) => void;
  signup: (name: string, email: string, password: string, role: UserRole, tenant: TenantScope) => void;
  logout: () => void;

  // Onboarding Config
  workspaceConfig: WorkspaceConfig;
  completeOnboarding: (workspaceName: string, targetVectorDb: string, ingestionMode: string) => void;

  // Tenant isolation scope
  selectedTenant: TenantScope;
  setSelectedTenant: (tenant: TenantScope) => void;
  tenants: Tenant[];
  
  // Navigation active dashboard view
  activeView: 'ingestion' | 'quarantine' | 'lineage' | 'analytics';
  setActiveView: (view: 'ingestion' | 'quarantine' | 'lineage' | 'analytics') => void;

  // Active conflict selected for Lineage modal or Diff viewer
  selectedConflictId: string | null;
  setSelectedConflictId: (id: string | null) => void;

  // Ingestion Queue
  ingestionQueue: IngestionItem[];
  addIngestionFile: (file: File) => void;
  removeIngestionItem: (id: string) => void;
  clearIngestionQueue: () => void;

  // Quarantine Conflicts
  conflicts: QuarantineConflict[];
  resolveConflict: (
    conflictId: string, 
    action: 'ACCEPTED_INCOMING' | 'KEPT_EXISTING' | 'DISCARDED_BOTH' | 'MANUALLY_MERGED', 
    mergedText?: string
  ) => void;

  // Clusters
  clusters: DbscanCluster[];
  selectedClusterId: string | null;
  setSelectedClusterId: (id: string | null) => void;

  // System Telemetry
  telemetry: SystemTelemetry;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Lineage modal trigger
  lineageModalConflictId: string | null;
  setLineageModalConflictId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Default User Profile for immediate testing accessibility
const DEFAULT_USER: UserProfile = {
  id: 'usr-901',
  name: 'Alex Rivera',
  email: 'alex.rivera@enterprise.ai',
  role: 'IT_ADMIN',
  roleLabel: 'IT Admin & Infrastructure Security',
  tenant: 'HR',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  workspaceName: 'Acme Enterprise Vector Guard',
  targetVectorDb: 'Qdrant (Isolated HR & Legal Collection)',
  ingestionMode: 'Adaptive Chunking + MiniLM Vector Pipeline'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('/');
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE);

  const [selectedTenant, setSelectedTenant] = useState<TenantScope>('ALL');
  const [activeView, setActiveView] = useState<'ingestion' | 'quarantine' | 'lineage' | 'analytics'>('quarantine');
  const [tenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [ingestionQueue, setIngestionQueue] = useState<IngestionItem[]>(INITIAL_INGESTION_QUEUE);
  const [conflicts, setConflicts] = useState<QuarantineConflict[]>(INITIAL_QUARANTINE_CONFLICTS);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>('conf-8901');
  const [clusters] = useState<DbscanCluster[]>(INITIAL_DBSCAN_CLUSTERS);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>(INITIAL_TELEMETRY);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lineageModalConflictId, setLineageModalConflictId] = useState<string | null>(null);

  // Toast Helper
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { ...toast, id }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Protected Route Navigation Helper
  const navigate = (route: AppRoute) => {
    if ((route === '/dashboard' || route === '/onboarding') && !isAuthenticated) {
      addToast({
        type: 'amber',
        title: 'Authentication Required',
        description: 'Please sign in or select a profile role to access the workspace.'
      });
      setCurrentRoute('/login');
      return;
    }
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Role Label Formatting Helper
  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'IT_ADMIN': return 'IT Admin & Infra Security';
      case 'COMPLIANCE_AUDITOR': return 'Compliance & Regulatory Auditor';
      case 'AI_ARCHITECT': return 'Lead AI & RAG Architect';
      case 'LEGAL_COUNSEL': return 'Enterprise Legal Counsel';
      default: return role;
    }
  };

  // Auth Methods
  const login = (email: string, _password: string, role: UserRole, tenant: TenantScope) => {
    const userName = email.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase());
    const newUser: UserProfile = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: userName || 'Enterprise Admin',
      email,
      role,
      roleLabel: getRoleLabel(role),
      tenant,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };

    setUser(newUser);
    setIsAuthenticated(true);
    if (tenant !== 'ALL') setSelectedTenant(tenant);

    addToast({
      type: 'success',
      title: 'Authentication Successful',
      description: `Logged in as ${newUser.name} (${newUser.roleLabel}) in ${tenant} scope.`
    });

    navigate('/onboarding');
  };

  const signup = (name: string, email: string, _password: string, role: UserRole, tenant: TenantScope) => {
    const newUser: UserProfile = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name,
      email,
      role,
      roleLabel: getRoleLabel(role),
      tenant,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };

    setUser(newUser);
    setIsAuthenticated(true);
    if (tenant !== 'ALL') setSelectedTenant(tenant);

    addToast({
      type: 'success',
      title: 'Enterprise Account Created',
      description: `Welcome ${name}! Department scope set to ${tenant}.`
    });

    navigate('/onboarding');
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    addToast({
      type: 'info',
      title: 'Logged Out',
      description: 'You have been signed out of your enterprise session.'
    });
    navigate('/login');
  };

  const completeOnboarding = (workspaceName: string, targetVectorDb: string, ingestionMode: string) => {
    setWorkspaceConfig({
      workspaceName,
      targetVectorDb,
      ingestionMode
    });
    addToast({
      type: 'success',
      title: 'Workspace Configured',
      description: `"${workspaceName}" is initialized and connected to ${targetVectorDb}.`
    });
    navigate('/dashboard');
  };

  // Real-time telemetry pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        gatewayLatencyMs: Math.max(10, Math.min(24, Math.round(prev.gatewayLatencyMs + (Math.random() * 4 - 2)))),
        rabbitMqLatencyMs: Number((prev.rabbitMqLatencyMs + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        pythonGpuLoad: Number(Math.max(40, Math.min(95, prev.pythonGpuLoad + (Math.random() * 3 - 1.5))).toFixed(1)),
        tokensPerSec: Math.round(prev.tokensPerSec + (Math.random() * 200 - 100))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulating ingestion pipeline progress
  useEffect(() => {
    const interval = setInterval(() => {
      setIngestionQueue(prev => 
        prev.map(item => {
          if (item.stage === 'IN_VECTOR_DB' || item.stage === 'QUARANTINED') return item;
          const nextProgress = Math.min(100, item.progressPercentage + 8);
          let nextStage: PipelineStage = item.stage;
          if (nextProgress > 25 && item.stage === 'INGESTING') nextStage = 'CHUNK_ADAPTIVE';
          else if (nextProgress > 50 && item.stage === 'CHUNK_ADAPTIVE') nextStage = 'EMBEDDING';
          else if (nextProgress > 75 && item.stage === 'EMBEDDING') nextStage = 'COLLISION_CHECK';
          else if (nextProgress >= 100 && item.stage === 'COLLISION_CHECK') nextStage = 'IN_VECTOR_DB';

          return {
            ...item,
            progressPercentage: nextProgress,
            stage: nextStage,
            vectorDbStatus: nextStage === 'IN_VECTOR_DB' ? 'SYNCED' : 'PROCESSING'
          };
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Add File to Queue
  const addIngestionFile = (file: File) => {
    const isScanned = file.name.toLowerCase().includes('scanned') || file.name.endsWith('.png') || file.name.endsWith('.jpg');
    const newItem: IngestionItem = {
      id: `ing-${Date.now().toString().slice(-4)}`,
      fileName: file.name,
      department: selectedTenant === 'ALL' ? 'HR' : selectedTenant,
      author: user?.name || 'Current User',
      uploadTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      modality: isScanned ? 'OCR_TESSERACT' : 'NATIVE_TEXT',
      stage: 'INGESTING',
      progressPercentage: 10,
      chunkCount: Math.floor(Math.random() * 25) + 5,
      vectorDbStatus: 'PROCESSING'
    };

    setIngestionQueue(prev => [newItem, ...prev]);
    addToast({
      type: 'info',
      title: 'File Queued for Ingestion',
      description: `"${file.name}" sent to ${newItem.modality === 'OCR_TESSERACT' ? 'Tesseract OCR Pipeline' : 'Apache Tika Text Extractor'}`
    });
  };

  const removeIngestionItem = (id: string) => {
    setIngestionQueue(prev => prev.filter(i => i.id !== id));
    addToast({
      type: 'rose',
      title: 'Queue Item Cancelled',
      description: 'Ingestion pipeline execution aborted for document.'
    });
  };

  const clearIngestionQueue = () => {
    setIngestionQueue([]);
  };

  // Resolve Quarantine Conflict
  const resolveConflict = (
    conflictId: string, 
    action: 'ACCEPTED_INCOMING' | 'KEPT_EXISTING' | 'DISCARDED_BOTH' | 'MANUALLY_MERGED', 
    mergedText?: string
  ) => {
    setConflicts(prev => 
      prev.map(c => {
        if (c.id === conflictId) {
          return {
            ...c,
            status: action,
            mergedText: mergedText || c.mergedText
          };
        }
        return c;
      })
    );

    // Update Telemetry
    setTelemetry(prev => ({
      ...prev,
      quarantinedPendingCount: Math.max(0, prev.quarantinedPendingCount - 1),
      quarantinedResolvedCount: prev.quarantinedResolvedCount + 1,
      exactDuplicatesPruned: action === 'ACCEPTED_INCOMING' ? prev.exactDuplicatesPruned + 1 : prev.exactDuplicatesPruned,
      vectorRamSavedGb: Number((prev.vectorRamSavedGb + 0.012).toFixed(3))
    }));

    const toastTitles: Record<string, string> = {
      'ACCEPTED_INCOMING': 'Incoming Chunk Accepted (Legacy Pruned)',
      'KEPT_EXISTING': 'Existing Chunk Retained (Incoming Discarded)',
      'DISCARDED_BOTH': 'Both Chunks Purged from Vector DB',
      'MANUALLY_MERGED': 'Reconciled Chunk Committed to Vector DB'
    };

    const toastTypes: Record<string, 'success' | 'amber' | 'rose' | 'info'> = {
      'ACCEPTED_INCOMING': 'success',
      'KEPT_EXISTING': 'amber',
      'DISCARDED_BOTH': 'rose',
      'MANUALLY_MERGED': 'info'
    };

    addToast({
      type: toastTypes[action] || 'success',
      title: toastTitles[action] || 'Quarantine Action Executed',
      description: `Conflict ${conflictId} updated. Vector database index updated with high accuracy provenance tag.`
    });

    // Select next pending conflict if available
    const remainingPending = conflicts.filter(c => c.id !== conflictId && c.status === 'PENDING');
    if (remainingPending.length > 0) {
      setSelectedConflictId(remainingPending[0].id);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <AppContext.Provider value={{
      currentRoute,
      navigate,
      user,
      isAuthenticated,
      login,
      signup,
      logout,
      workspaceConfig,
      completeOnboarding,
      selectedTenant,
      setSelectedTenant,
      tenants,
      activeView,
      setActiveView,
      selectedConflictId,
      setSelectedConflictId,
      ingestionQueue,
      addIngestionFile,
      removeIngestionItem,
      clearIngestionQueue,
      conflicts,
      resolveConflict,
      clusters,
      selectedClusterId,
      setSelectedClusterId,
      telemetry,
      notifications,
      markNotificationAsRead,
      clearNotifications,
      toasts,
      addToast,
      removeToast,
      lineageModalConflictId,
      setLineageModalConflictId
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
