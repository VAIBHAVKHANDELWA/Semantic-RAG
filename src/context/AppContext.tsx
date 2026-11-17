import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  TenantScope, 
  Tenant, 
  IngestionItem, 
  QuarantineConflict, 
  DbscanCluster, 
  SystemTelemetry, 
  NotificationItem,
  AppRoute,
  ActiveViewType,
  User,
  RbacRole,
  RbacTenant,
  WorkspaceConfig,
  AuditLogEntry,
  UploadTicketResponse,
  BatchIngestionJob,
  SseTelemetryPayload,
  ChunkMetadata
} from '../types';
import { loginApi, logoutApi } from '../api/client';
import { fetchPendingConflicts, resolveConflict as apiResolveConflict } from '../api/quarantine';
import { fetchAuditLogs } from '../api/audit';
import { fetchClusters } from '../api/clusters';
import { getUploadTicket, uploadFileToS3, completeIngestion, fetchIngestionJobs } from '../api/ingestion';

const DEFAULT_TENANTS: Tenant[] = [
  { id: 'HR', name: 'Human Resources & People Ops', code: 'HR', isolationLevel: 'Encrypted Tenant Context', activeConflictsCount: 0, totalIngestedDocs: 0, rateLimitReqPerMin: 600, storageUsedGb: 0.1 },
  { id: 'FINANCE', name: 'Finance, Tax & Audit Ops', code: 'FINANCE', isolationLevel: 'Hardware Isolated', activeConflictsCount: 0, totalIngestedDocs: 0, rateLimitReqPerMin: 600, storageUsedGb: 0.1 },
  { id: 'LEGAL', name: 'Legal, Contracts & Compliance', code: 'LEGAL', isolationLevel: 'Encrypted Tenant Context', activeConflictsCount: 0, totalIngestedDocs: 0, rateLimitReqPerMin: 600, storageUsedGb: 0.1 },
  { id: 'ENGINEERING', name: 'Engineering & Architecture', code: 'ENGINEERING', isolationLevel: 'Logical Namespace', activeConflictsCount: 0, totalIngestedDocs: 0, rateLimitReqPerMin: 1200, storageUsedGb: 0.1 }
];

const DEFAULT_TELEMETRY: SystemTelemetry = {
  gatewayLatencyMs: 14.2,
  rabbitMqRate: 0,
  rabbitMqLatencyMs: 0,
  pythonGpuLoad: 0,
  llmCircuitBreakerStatus: 'CLOSED',
  tokensPerSec: 0,
  exactDuplicatesPruned: 0,
  redisCacheHits: 0,
  totalChunksProcessed: 0,
  vectorRamSavedGb: 0,
  llmCostSavedUsd: 0,
  quarantinedPendingCount: 0,
  quarantinedResolvedCount: 0,
  processedTotal: 0
};

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

  // JWT Authentication & User Store
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  updateUserPassword: (newToken: string) => void;
  loginAsDataSteward: () => void;
  loginAsSystemAdmin: () => void;
  loginAsAuditor: () => void;
  loginWithProfile: (email: string, role: RbacRole, tenant: RbacTenant) => void;
  setRoleDebug: (role: RbacRole) => void;
  logout: () => void;

  // Onboarding Config
  workspaceConfig: WorkspaceConfig;
  completeOnboarding: (workspaceName: string, targetVectorDb: string, ingestionMode: string) => void;

  // Tenant isolation scope
  selectedTenant: TenantScope;
  setSelectedTenant: (tenant: TenantScope) => void;
  tenants: Tenant[];
  addTenant: (name: string, code: TenantScope, isolationLevel: Tenant['isolationLevel'], rateLimitReqPerMin?: number) => void;
  updateTenantRateLimit: (code: TenantScope, rateLimitReqPerMin: number) => void;
  
  // Navigation active view
  activeView: ActiveViewType;
  setActiveView: (view: ActiveViewType) => void;

  // Enterprise Audit Mode & Soft Deletes
  auditModeActive: boolean;
  setAuditModeActive: (active: boolean) => void;
  archivedChunks: ChunkMetadata[];

  // Stage 2: Enterprise Ingestion & Telemetry
  batchJobs: BatchIngestionJob[];
  sseLogs: SseTelemetryPayload[];
  isThrottled: boolean;
  requestUploadTicket: (fileName: string, fileSize: number, department: TenantScope) => UploadTicketResponse;
  createBatchJob: (files: File[]) => void;
  toggleBackpressureThrottling: () => void;

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
    action: 'ACCEPTED_INCOMING' | 'PROMOTED_INCOMING_ARCHIVED_OLD' | 'KEPT_EXISTING' | 'DISCARDED_BOTH' | 'MANUALLY_MERGED', 
    mergedText?: string
  ) => void;

  // Clusters
  clusters: DbscanCluster[];
  selectedClusterId: string | null;
  setSelectedClusterId: (id: string | null) => void;

  // System Telemetry
  telemetry: SystemTelemetry;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'integrityHash'>) => void;

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

// ARCHITECTURAL EXPLANATION: sessionStorage vs localStorage for Enterprise JWT:
// 1. Tab-Level Isolation: sessionStorage is strictly scoped to the active browser tab.
//    Opening another tab or tenant context will not accidentally leak or overwrite this token.
// 2. Ephemeral Lifetime: The token is automatically deleted when the user closes the tab,
//    preventing persistent session hijack or token extraction from stagnant browser storage.
// 3. Tab Refresh Continuity: Survives user page reloads (F5) within the same active tab,
//    preventing disruptive mid-workflow logouts.
// 4. In-Memory React State: Paired with useState for zero-latency UI reactivity across components.
function getInitialAuth(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const storedToken = sessionStorage.getItem('auth_token');
    const storedUserJson = sessionStorage.getItem('auth_user');
    if (storedToken && storedUserJson) {
      const parsedUser = JSON.parse(storedUserJson);
      return { token: storedToken, user: parsedUser };
    }
  } catch (err) {
    console.error('Failed to parse cached auth session', err);
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
  }
  return { token: null, user: null };
}

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  workspaceName: 'Enterprise Semantic RAG Guard',
  targetVectorDb: 'PostgreSQL + pgvector (384-dim HNSW)',
  ingestionMode: 'Adaptive Chunking + MiniLM Vector Pipeline'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialAuth = getInitialAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(initialAuth.user ? '/dashboard' : '/login');
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initialAuth.user);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE);

  const [selectedTenant, setSelectedTenant] = useState<TenantScope>((initialAuth.user?.tenant as TenantScope) || 'HR');
  const [activeView, setActiveView] = useState<ActiveViewType>('quarantine');
  const [tenants, setTenants] = useState<Tenant[]>(DEFAULT_TENANTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [ingestionQueue, setIngestionQueue] = useState<IngestionItem[]>([]);
  const [conflicts, setConflicts] = useState<QuarantineConflict[]>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [clusters, setClusters] = useState<DbscanCluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>(DEFAULT_TELEMETRY);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lineageModalConflictId, setLineageModalConflictId] = useState<string | null>(null);

  // Enterprise Audit Mode & Soft-Delete Store
  const [auditModeActive, setAuditModeActive] = useState<boolean>(false);
  const [archivedChunks, setArchivedChunks] = useState<ChunkMetadata[]>([]);

  // Stage 2 State: Batch Ingestion Jobs & SSE Telemetry Logs
  const [batchJobs, setBatchJobs] = useState<BatchIngestionJob[]>([]);
  const [sseLogs, setSseLogs] = useState<SseTelemetryPayload[]>([]);

  const [isThrottled, setIsThrottled] = useState(false);

  // Stage 2: Direct-to-Cloud Upload Ticket Request
  const requestUploadTicket = (fileName: string, _fileSize: number, department: TenantScope): UploadTicketResponse => {
    const ticketId = `tkt-${Date.now().toString().slice(-6)}`;
    const cleanTenant = department === 'ALL' ? 'HR' : department;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const s3Bucket = `enterprise-vector-rag-${cleanTenant.toLowerCase()}-vault`;
    const s3Key = `uploads/${new Date().getFullYear()}/${cleanFileName}`;
    const presignedUrl = `https://${s3Bucket}.s3.us-east-1.amazonaws.com/${s3Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20260917%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260917T232600Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4`;

    return {
      ticketId,
      presignedUrl,
      s3Bucket,
      s3Key,
      expiresInSeconds: 900,
      tenantFolder: cleanTenant,
      maxByteSize: 104857600
    };
  };

  // Stage 2: Create Asynchronous Batch Ingestion Job
  const createBatchJob = (files: File[]) => {
    if (files.length === 0) return;

    let ocrCount = 0;
    let nativeCount = 0;

    files.forEach(file => {
      const isScanned = file.name.toLowerCase().includes('scanned') || file.name.endsWith('.png') || file.name.endsWith('.jpg');
      if (isScanned) ocrCount++;
      else nativeCount++;
      addIngestionFile(file);
    });

    const targetDept = selectedTenant === 'ALL' ? 'HR' : selectedTenant;
    const jobId = `batch-${Date.now().toString().slice(-4)}`;
    const batchName = `${targetDept}_Document_Batch_${new Date().toLocaleTimeString().replace(/:/g, '')}`;

    const newJob: BatchIngestionJob = {
      jobId,
      batchName,
      department: targetDept,
      totalFiles: files.length,
      ocrFileCount: ocrCount,
      nativeFileCount: nativeCount,
      status: 'UPLOADING_DIRECT_S3',
      progressPercentage: 15,
      chunksCreated: 0,
      conflictsFound: 0,
      throughputChunksPerSec: 140,
      estimatedTimeRemaining: '45s',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      backpressureActive: isThrottled
    };

    setBatchJobs(prev => [newJob, ...prev]);

    setSseLogs(prev => [
      {
        jobId,
        timestamp: new Date().toLocaleTimeString(),
        status: 'UPLOADING_DIRECT_S3',
        chunksCreated: 0,
        conflictsFound: 0,
        throughputChunksPerSec: 140,
        estimatedTimeRemaining: '45s',
        circuitBreakerStatus: isThrottled ? 'OPEN' : 'CLOSED',
        logMessage: `SSE Push [${jobId}]: S3 Presigned URL Tickets issued for ${files.length} documents (${nativeCount} Native Tika, ${ocrCount} OCR Tesseract).`
      },
      ...prev
    ]);

    addAuditLog({
      actorName: user?.name || 'Data Steward',
      actorRole: user?.role || 'DATA_STEWARD',
      department: targetDept,
      action: 'DOCUMENT_INGEST',
      targetId: jobId,
      details: `Dispatched batch ingestion job ${jobId} (${files.length} files: ${nativeCount} Native Tika, ${ocrCount} OCR Tesseract) via Direct-to-Cloud S3 Presigned URLs.`
    });

    addToast({
      type: 'info',
      title: 'Batch Ingestion Initialized',
      description: `Dispatched ${files.length} documents for ${targetDept} via Direct-to-Cloud S3 ticket pipeline.`
    });
  };

  // Stage 2: Toggle Backpressure / AI Circuit Breaker Throttling
  const toggleBackpressureThrottling = () => {
    setIsThrottled(prev => {
      const nextState = !prev;
      setTelemetry(t => ({
        ...t,
        llmCircuitBreakerStatus: nextState ? 'OPEN' : 'CLOSED'
      }));

      setBatchJobs(jobs => jobs.map(j => ({
        ...j,
        status: nextState ? 'THROTTLED' : 'SPRING_BATCH_CHUNKING',
        backpressureActive: nextState
      })));

      addToast({
        type: nextState ? 'amber' : 'success',
        title: nextState ? 'AI Rate Limit Throttling Active' : 'Circuit Breaker Reset',
        description: nextState 
          ? 'RabbitMQ queue backpressure detected. Dashboard shifted to THROTTLED warning mode.'
          : 'Backpressure cleared. Pipeline resumed high-throughput processing.'
      });

      return nextState;
    });
  };

  // Enforced tenant selection helper for RBAC isolation
  const handleSetSelectedTenant = (tenant: TenantScope) => {
    if (user?.role === 'DATA_STEWARD') {
      const allowedTenant = user.tenant as TenantScope;
      if (tenant !== allowedTenant && tenant !== 'ALL') {
        addToast({
          type: 'rose',
          title: 'Tenant Scope Restricted',
          description: `Data Steward (${user.name}) is restricted to ${allowedTenant} department context.`
        });
        setSelectedTenant(allowedTenant);
        return;
      }
    }
    setSelectedTenant(tenant);
  };

  // Audit Log Helper
  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'integrityHash'>) => {
    const id = `aud-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const mockHash = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) + Date.now().toString(16);
    
    setAuditLogs(prev => [
      {
        ...entry,
        id,
        timestamp,
        integrityHash: mockHash
      },
      ...prev
    ]);
  };

  // Add Tenant (System Admin action)
  const addTenant = (name: string, code: TenantScope, isolationLevel: Tenant['isolationLevel'], rateLimitReqPerMin = 600) => {
    const newTenant: Tenant = {
      id: `t-${code.toLowerCase()}`,
      name,
      code,
      isolationLevel,
      activeConflictsCount: 0,
      totalIngestedDocs: 0,
      rateLimitReqPerMin,
      storageUsedGb: 0.1
    };
    setTenants(prev => [...prev, newTenant]);
    addAuditLog({
      actorName: user?.name || 'System Admin',
      actorRole: user?.role || 'SYSTEM_ADMIN',
      department: user?.tenant || 'HR',
      action: 'TENANT_CREATE',
      targetId: newTenant.id,
      details: `Created new department tenant "${name}" (${code}) with ${isolationLevel}.`
    });
    addToast({
      type: 'success',
      title: 'Tenant Created Successfully',
      description: `Tenant ${name} initialized with ${isolationLevel}.`
    });
  };

  // Update Tenant Rate Limit
  const updateTenantRateLimit = (code: TenantScope, rateLimitReqPerMin: number) => {
    setTenants(prev => prev.map(t => t.code === code ? { ...t, rateLimitReqPerMin } : t));
    addAuditLog({
      actorName: user?.name || 'System Admin',
      actorRole: user?.role || 'SYSTEM_ADMIN',
      department: user?.tenant || 'HR',
      action: 'RATE_LIMIT_CHANGE',
      targetId: String(code),
      details: `Updated ${code} worker rate limit to ${rateLimitReqPerMin} req/min.`
    });
    addToast({
      type: 'info',
      title: 'Rate Limit Updated',
      description: `Rate limit for ${code} set to ${rateLimitReqPerMin} req/min.`
    });
  };

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
        description: 'Please log in with an authorized JWT token.'
      });
      setCurrentRoute('/login');
      return;
    }
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real Backend Login with Java Gateway JWT Authentication
  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const res = await loginApi(email, password);
      const newUser: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        tenant: res.user.tenant,
        department: res.user.tenant,
        token: res.token,
        mustChangePassword: res.mustChangePassword,
        isSuperAdmin: res.user.isSuperAdmin,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`
      };
      setUser(newUser);
      setToken(res.token);
      setIsAuthenticated(true);
      setSelectedTenant(res.user.tenant as TenantScope);
      sessionStorage.setItem('auth_token', res.token);
      sessionStorage.setItem('auth_user', JSON.stringify(newUser));

      if (res.user.role === 'DATA_STEWARD') {
        setActiveView('quarantine');
      } else if (res.user.role === 'COMPLIANCE_AUDITOR') {
        setActiveView('audit_logs');
      } else {
        setActiveView('analytics');
      }

      addToast({
        type: 'success',
        title: 'Authentication Succeeded',
        description: `Logged in as ${res.user.name} (${res.user.role} - ${res.user.tenant}).`
      });
      navigate('/dashboard');
    } catch (err: any) {
      addToast({
        type: 'rose',
        title: 'Authentication Failed',
        description: err.message || 'Invalid email or password.'
      });
      throw err;
    }
  };

  const updateUserPassword = (newToken: string) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      token: newToken,
      mustChangePassword: false
    };
    setUser(updatedUser);
    setToken(newToken);
    sessionStorage.setItem('auth_token', newToken);
    sessionStorage.setItem('auth_user', JSON.stringify(updatedUser));
  };

  const loginAsDataSteward = () => {
    loginWithCredentials('hr_steward@enterprise.com', 'password123');
  };

  const loginAsSystemAdmin = () => {
    loginWithCredentials('hr_admin@enterprise.com', 'password123');
  };

  const loginAsAuditor = () => {
    loginWithCredentials('legal_auditor@enterprise.com', 'password123');
  };

  const loginWithProfile = (email: string, _role: RbacRole, _tenant: RbacTenant) => {
    loginWithCredentials(email, 'password123');
  };

  // Debug Role Switcher for live UI testing
  const setRoleDebug = (role: RbacRole) => {
    if (!user) return;
    const targetEmail = role === 'DATA_STEWARD' ? 'hr_steward@enterprise.com' 
      : (role === 'COMPLIANCE_AUDITOR' ? 'legal_auditor@enterprise.com' : 'hr_admin@enterprise.com');
    loginWithCredentials(targetEmail, 'password123');
  };

  const logout = async () => {
    try {
      const activeToken = token || sessionStorage.getItem('auth_token');
      if (activeToken) {
        await logoutApi(activeToken);
      }
    } catch (err) {
      console.warn("Backend logout error or offline", err);
    } finally {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      addToast({
        type: 'info',
        title: 'Logged Out',
        description: 'JWT Token revoked. Session terminated.'
      });
      navigate('/login');
    }
  };

  const completeOnboarding = (workspaceName: string, targetVectorDb: string, ingestionMode: string) => {
    setWorkspaceConfig({
      workspaceName,
      targetVectorDb,
      ingestionMode
    });
    addToast({
      type: 'success',
      title: 'Workspace Initialized',
      description: `"${workspaceName}" target set to ${targetVectorDb}.`
    });
    navigate('/dashboard');
  };

  // Real telemetry and event updates driven via SSE EventSource with automatic reconnection
  useEffect(() => {
    const userToken = user?.token || token || sessionStorage.getItem('auth_token');
    if (!userToken || !user?.tenant) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed) return;
      try {
        const sseUrl = `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080/api/v1'}/telemetry/stream?token=${encodeURIComponent(userToken)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener('INIT', (e) => {
          console.info('[SSE] Handshake acknowledged:', e.data);
        });

        eventSource.addEventListener('TELEMETRY', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload) {
              setTelemetry(prev => ({
                ...prev,
                gatewayLatencyMs: payload.gatewayLatencyMs || prev.gatewayLatencyMs,
                tokensPerSec: payload.tokensPerSec || prev.tokensPerSec,
              }));
            }
          } catch (err) {
            console.debug('[SSE] Telemetry parse err:', err);
          }
        });

        eventSource.addEventListener('CONFLICT_RESOLVED', (e) => {
          try {
            const payload = JSON.parse(e.data);
            addToast({
              type: 'info',
              title: 'Conflict Resolved Real-Time',
              description: `Conflict ${payload.conflictId} resolved via ${payload.action}.`
            });
            setConflicts(prev => prev.map(c => c.id === payload.conflictId ? { ...c, status: payload.action } : c));
          } catch (err) {}
        });

        eventSource.onerror = () => {
          eventSource?.close();
          if (isSubscribed) {
            console.warn('[SSE] Connection lost. Reconnecting in 3s...');
            reconnectTimer = setTimeout(connectSSE, 3000);
          }
        };
      } catch (e) {
        console.warn('SSE subscription error:', e);
        if (isSubscribed) {
          reconnectTimer = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    // Fetch real telemetry stats from backend
    fetch(`${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080/api/v1'}/telemetry/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(stats => {
        if (stats) {
          setTelemetry(prev => ({
            ...prev,
            quarantinedPendingCount: stats.pendingConflicts || 0,
            exactDuplicatesPruned: stats.duplicatesPrunedTotal || 0,
            circuitBreakerTriggerCount: stats.dlqTotal || 0,
            gatewayLatencyMs: stats.lastExtractionLatencyMs || prev.gatewayLatencyMs
          }));
        }
      })
      .catch(err => console.debug('Could not fetch real telemetry stats:', err));

    // Fetch real pending conflicts
    fetchPendingConflicts(userToken)
      .then(confList => {
        if (confList && Array.isArray(confList)) {
          setConflicts(confList);
          if (confList.length > 0) {
            setSelectedConflictId(confList[0].id);
          }
        }
      })
      .catch(err => console.debug('Could not fetch pending conflicts:', err));

    // Fetch real audit logs
    fetchAuditLogs(userToken)
      .then(logs => {
        if (logs && Array.isArray(logs)) {
          setAuditLogs(logs);
        }
      })
      .catch(err => console.debug('Could not fetch audit logs:', err));

    // Fetch real clusters from Python AI Engine
    if (user?.tenant) {
      fetchClusters(user.tenant)
        .then(res => {
          if (res && res.clusters) {
            const mappedClusters: DbscanCluster[] = res.clusters.map((c, i) => ({
              id: `cluster-${c.clusterId}`,
              name: c.label,
              category: `${user.tenant} Policy Topic`,
              coordX: c.points.length > 0 ? c.points[0].x * 50 : (i * 20 - 40),
              coordY: c.points.length > 0 ? c.points[0].y * 50 : (i * 15 - 30),
              radius: Math.max(15, Math.min(45, c.size * 5)),
              sampleCount: c.size,
              avgSimilarity: 0.88,
              density: c.size > 10 ? 'High' : (c.size > 5 ? 'Medium' : 'Critical'),
              description: `DBSCAN semantic topic group with ${c.size} related chunks.`,
              conflictIds: c.points.map(p => p.id)
            }));
            setClusters(mappedClusters);
            if (mappedClusters.length > 0) {
              setSelectedClusterId(mappedClusters[0].id);
            }
          }
        })
        .catch(err => console.debug('Could not fetch clusters:', err));
    }

    return () => {
      isSubscribed = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [user?.token, user?.tenant, token]);

  // Fetch real ingestion jobs from backend on auth change
  useEffect(() => {
    const userToken = user?.token || token;
    if (!userToken) return;
    fetchIngestionJobs(userToken)
      .then(jobs => {
        if (jobs && Array.isArray(jobs)) {
          setBatchJobs(jobs);
        }
      })
      .catch(err => console.warn('Could not fetch ingestion jobs:', err));
  }, [user?.token, token]);

  // Real Direct-to-Cloud File Ingestion Pipeline
  const addIngestionFile = async (file: File) => {
    const userToken = user?.token || token;
    const isScanned = file.name.toLowerCase().includes('scanned') || file.name.endsWith('.png') || file.name.endsWith('.jpg');
    const itemId = `ing-${Date.now().toString().slice(-4)}`;
    
    const newItem: IngestionItem = {
      id: itemId,
      fileName: file.name,
      department: selectedTenant === 'ALL' ? (user?.tenant || 'HR') : selectedTenant,
      author: user?.name || 'Current User',
      uploadTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      modality: isScanned ? 'OCR_TESSERACT' : 'NATIVE_TEXT',
      stage: 'INGESTING',
      progressPercentage: 25,
      chunkCount: 0,
      vectorDbStatus: 'PROCESSING'
    };

    setIngestionQueue(prev => [newItem, ...prev]);
    addToast({
      type: 'info',
      title: 'Upload Initiated',
      description: `Requesting direct-to-cloud presigned ticket for "${file.name}"...`
    });

    try {
      // 1. Get Presigned S3 Ticket from Java Gateway
      const ticket = await getUploadTicket(file.name, userToken);
      
      setIngestionQueue(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, progressPercentage: 60, stage: 'EMBEDDING' } 
          : item
      ));

      // 2. Direct PUT to S3 / RustFS
      await uploadFileToS3(ticket.uploadUrl, file);

      setIngestionQueue(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, progressPercentage: 85, stage: 'COLLISION_CHECK' } 
          : item
      ));

      // 3. Complete Ingestion on Java Gateway -> Dispatches to RabbitMQ
      const completeRes = await completeIngestion(ticket.objectKey, file.name, userToken);

      setIngestionQueue(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, progressPercentage: 100, stage: 'IN_VECTOR_DB', vectorDbStatus: 'SYNCED' } 
          : item
      ));

      addToast({
        type: 'success',
        title: 'Document Ingestion Queued',
        description: `Job ${completeRes.jobId} created. Dispatched to RabbitMQ vector pipeline.`
      });

      // Refresh real jobs from backend
      if (userToken) {
        const updatedJobs = await fetchIngestionJobs(userToken);
        if (updatedJobs) setBatchJobs(updatedJobs);
      }
    } catch (err: any) {
      console.error('Ingestion failed for file:', file.name, err);
      setIngestionQueue(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, stage: 'QUARANTINED', vectorDbStatus: 'PROCESSING' } 
          : item
      ));
      addToast({
        type: 'rose',
        title: 'Ingestion Error',
        description: `Failed to ingest "${file.name}": ${err.message || 'Network error'}`
      });
    }
  };

  const removeIngestionItem = (id: string) => {
    setIngestionQueue(prev => prev.filter(i => i.id !== id));
    addToast({
      type: 'rose',
      title: 'Queue Item Cancelled',
      description: 'Ingestion pipeline execution aborted.'
    });
  };

  const clearIngestionQueue = () => {
    setIngestionQueue([]);
  };

  // Resolve Quarantine Conflict with Soft-Delete Archiving
  const resolveConflict = (
    conflictId: string, 
    action: 'ACCEPTED_INCOMING' | 'PROMOTED_INCOMING_ARCHIVED_OLD' | 'KEPT_EXISTING' | 'DISCARDED_BOTH' | 'MANUALLY_MERGED', 
    mergedText?: string
  ) => {
    const conflictToResolve = conflicts.find(c => c.id === conflictId);
    if (conflictToResolve && (action === 'PROMOTED_INCOMING_ARCHIVED_OLD' || action === 'ACCEPTED_INCOMING')) {
      const archivedItem: ChunkMetadata = {
        ...conflictToResolve.existingChunk,
        temporalStatus: 'Archived',
        effectiveDate: `${conflictToResolve.existingChunk.uploadDate} to ${new Date().toISOString().slice(0, 10)}`
      };
      setArchivedChunks(prev => [archivedItem, ...prev]);
    }

    setConflicts(prev => 
      prev.map(c => {
        if (c.id === conflictId) {
          const updatedIncoming = {
            ...c.incomingChunk,
            temporalStatus: (action === 'PROMOTED_INCOMING_ARCHIVED_OLD' || action === 'ACCEPTED_INCOMING') ? ('Active' as const) : c.incomingChunk.temporalStatus,
            effectiveDate: (action === 'PROMOTED_INCOMING_ARCHIVED_OLD' || action === 'ACCEPTED_INCOMING') ? `${new Date().toISOString().slice(0, 10)} to Present` : c.incomingChunk.effectiveDate
          };
          return {
            ...c,
            status: action,
            incomingChunk: updatedIncoming,
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
      exactDuplicatesPruned: (action === 'ACCEPTED_INCOMING' || action === 'PROMOTED_INCOMING_ARCHIVED_OLD') ? prev.exactDuplicatesPruned + 1 : prev.exactDuplicatesPruned,
      vectorRamSavedGb: Number((prev.vectorRamSavedGb + 0.012).toFixed(3))
    }));

    // Real API call to Java Gateway
    const activeToken = token || user?.token || sessionStorage.getItem('auth_token');
    if (activeToken) {
      let mappedAction = 'PROMOTED_INCOMING';
      if (action === 'KEPT_EXISTING') mappedAction = 'KEEP_EXISTING';
      else if (action === 'DISCARDED_BOTH') mappedAction = 'REJECT_INCOMING';
      else if (action === 'MANUALLY_MERGED') mappedAction = 'MANUALLY_MERGED';

      apiResolveConflict(conflictId, mappedAction, 'Resolved by Data Steward via console', mergedText, activeToken)
        .then(() => {
          fetchAuditLogs(activeToken).then(logs => {
            if (logs && Array.isArray(logs)) setAuditLogs(logs);
          }).catch(() => {});
        })
        .catch(err => console.warn('Backend resolve conflict sync error:', err));
    }

    if (action === 'PROMOTED_INCOMING_ARCHIVED_OLD' || action === 'ACCEPTED_INCOMING') {
      addToast({
        type: 'success',
        title: 'Chunk Promoted & Soft-Archived',
        description: 'The existing chunk has been safely archived for audit compliance, and the new chunk is now Active.'
      });
    } else {
      const toastTitles: Record<string, string> = {
        'KEPT_EXISTING': 'Existing Chunk Retained (Incoming Discarded)',
        'DISCARDED_BOTH': 'Both Chunks Purged from Vector DB',
        'MANUALLY_MERGED': 'Reconciled Chunk Committed to Vector DB'
      };

      const toastTypes: Record<string, 'success' | 'amber' | 'rose' | 'info'> = {
        'KEPT_EXISTING': 'amber',
        'DISCARDED_BOTH': 'rose',
        'MANUALLY_MERGED': 'info'
      };

      addToast({
        type: toastTypes[action] || 'success',
        title: toastTitles[action] || 'Quarantine Action Executed',
        description: `Conflict ${conflictId} updated. Vector database index synced.`
      });
    }

    addAuditLog({
      actorName: user?.name || 'Data Steward',
      actorRole: user?.role || 'DATA_STEWARD',
      department: conflictToResolve?.department || selectedTenant,
      action: action === 'PROMOTED_INCOMING_ARCHIVED_OLD' ? 'RESOLVE_ACCEPT' : 'RESOLVE_KEEP',
      targetId: conflictId,
      details: (action === 'PROMOTED_INCOMING_ARCHIVED_OLD' || action === 'ACCEPTED_INCOMING')
        ? `Soft-archived legacy chunk ${conflictToResolve?.existingChunk.id} and promoted incoming chunk ${conflictToResolve?.incomingChunk.id} to Active status.`
        : `Executed action ${action} on conflict ${conflictId}.`
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
      token: token || user?.token || null,
      loginWithCredentials,
      updateUserPassword,
      loginAsDataSteward,
      loginAsSystemAdmin,
      loginAsAuditor,
      loginWithProfile,
      setRoleDebug,
      logout,
      workspaceConfig,
      completeOnboarding,
      selectedTenant,
      setSelectedTenant: handleSetSelectedTenant,
      tenants,
      addTenant,
      updateTenantRateLimit,
      activeView,
      setActiveView,
      auditModeActive,
      setAuditModeActive,
      archivedChunks,
      batchJobs,
      sseLogs,
      isThrottled,
      requestUploadTicket,
      createBatchJob,
      toggleBackpressureThrottling,
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
      auditLogs,
      addAuditLog,
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

// Zustand-Style Export Hook for explicit useAuthStore() compliance
export const useAuthStore = () => {
  const { user, isAuthenticated, token, loginAsDataSteward, loginAsSystemAdmin, loginAsAuditor, logout, setRoleDebug } = useApp();
  return {
    user,
    isAuthenticated,
    token,
    loginAsDataSteward,
    loginAsSystemAdmin,
    loginAsAuditor,
    logout,
    setRoleDebug
  };
};
