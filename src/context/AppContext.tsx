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
import { 
  INITIAL_TENANTS, 
  INITIAL_INGESTION_QUEUE, 
  INITIAL_QUARANTINE_CONFLICTS, 
  INITIAL_DBSCAN_CLUSTERS, 
  INITIAL_TELEMETRY, 
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ARCHIVED_CHUNKS
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

  // Mock JWT Authentication & User Store
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
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

// Initial Default User Profile (Data Steward HR)
const DEFAULT_USER: User = {
  id: 'usr-steward-101',
  name: 'Sarah Jenkins',
  tenant: 'HR',
  department: 'HR',
  role: 'DATA_STEWARD',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMTAxIiwicm9sZSI6IkRBVEFfU1RFV0FSRCIsInRlbmFudCI6IkhSIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature',
  email: 'sarah.jenkins@enterprise.ai',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  workspaceName: 'Acme Enterprise Vector Guard',
  targetVectorDb: 'Qdrant (Isolated HR & Legal Collection)',
  ingestionMode: 'Adaptive Chunking + MiniLM Vector Pipeline'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('/dashboard');
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE);

  const [selectedTenant, setSelectedTenant] = useState<TenantScope>('HR');
  const [activeView, setActiveView] = useState<ActiveViewType>('quarantine');
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [ingestionQueue, setIngestionQueue] = useState<IngestionItem[]>(INITIAL_INGESTION_QUEUE);
  const [conflicts, setConflicts] = useState<QuarantineConflict[]>(INITIAL_QUARANTINE_CONFLICTS);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>('conf-8901');
  const [clusters] = useState<DbscanCluster[]>(INITIAL_DBSCAN_CLUSTERS);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>(INITIAL_TELEMETRY);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lineageModalConflictId, setLineageModalConflictId] = useState<string | null>(null);

  // Enterprise Audit Mode & Soft-Delete Store
  const [auditModeActive, setAuditModeActive] = useState<boolean>(false);
  const [archivedChunks, setArchivedChunks] = useState<ChunkMetadata[]>(INITIAL_ARCHIVED_CHUNKS);

  // Stage 2 State: Batch Ingestion Jobs & SSE Telemetry Logs
  const [batchJobs, setBatchJobs] = useState<BatchIngestionJob[]>([
    {
      jobId: 'batch-9921',
      batchName: 'Q3_HR_Policy_Batch_2026',
      department: 'HR',
      totalFiles: 42,
      ocrFileCount: 8,
      nativeFileCount: 34,
      status: 'SPRING_BATCH_CHUNKING',
      progressPercentage: 68,
      chunksCreated: 1450,
      conflictsFound: 3,
      throughputChunksPerSec: 185,
      estimatedTimeRemaining: '24s',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      backpressureActive: false
    }
  ]);

  const [sseLogs, setSseLogs] = useState<SseTelemetryPayload[]>([
    {
      jobId: 'batch-9921',
      timestamp: '19:26:01',
      status: 'SPRING_BATCH_CHUNKING',
      chunksCreated: 1450,
      conflictsFound: 3,
      throughputChunksPerSec: 185,
      estimatedTimeRemaining: '24s',
      circuitBreakerStatus: 'CLOSED',
      logMessage: 'SSE Push [batch-9921]: Spring Batch chunker running at 185 chunks/sec.'
    }
  ]);

  const [isThrottled, setIsThrottled] = useState(false);

  // Stage 2: Direct-to-Cloud Upload Ticket Request
  const requestUploadTicket = (fileName: string, _fileSize: number, department: TenantScope): UploadTicketResponse => {
    const ticketId = `tkt-${Date.now().toString().slice(-6)}`;
    const cleanTenant = department === 'ALL' || department === 'GLOBAL' ? 'HR' : department;
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
    if (user?.role === 'DATA_STEWARD' && user.tenant !== 'GLOBAL') {
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
      department: 'GLOBAL',
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
      department: 'GLOBAL',
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

  // Mock JWT Token Builder synchronized with Java Backend secret key
  const generateMockJwt = (role: RbacRole, tenant: RbacTenant) => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      sub: `usr-${Date.now().toString().slice(-4)}`,
      role: role,
      tenant: tenant,
      tenantId: tenant,
      iat: Math.floor(Date.now() / 1000)
    }));
    const mockSecret = import.meta.env.VITE_JWT_SECRET || 'aXRzLWEtc2VjcmV0LWtleS10aGF0LW11c3QtYmUtYXQtbGVhc3QtMjU2LWJpdHMtbG9uZw==';
    const mockSignature = btoa(mockSecret.slice(0, 16) + `_${role}_${tenant}`);
    return `${header}.${payload}.${mockSignature}`;
  };

  // Mock Login Behavior 1: Data Steward (HR)
  const loginAsDataSteward = () => {
    const newUser: User = {
      id: 'usr-steward-101',
      name: 'Sarah Jenkins',
      tenant: 'HR',
      role: 'DATA_STEWARD',
      token: generateMockJwt('DATA_STEWARD', 'HR'),
      email: 'sarah.jenkins@enterprise.ai',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
    setUser(newUser);
    setIsAuthenticated(true);
    setSelectedTenant('HR');
    setActiveView('quarantine');
    addToast({
      type: 'success',
      title: 'Logged in as Data Steward (HR)',
      description: 'JWT Issued. Redirecting to Quarantine Queue.'
    });
    navigate('/dashboard');
  };

  // Mock Login Behavior 2: System Admin (GLOBAL)
  const loginAsSystemAdmin = () => {
    const newUser: User = {
      id: 'usr-admin-102',
      name: 'Alex Rivera',
      tenant: 'GLOBAL',
      role: 'SYSTEM_ADMIN',
      token: generateMockJwt('SYSTEM_ADMIN', 'GLOBAL'),
      email: 'alex.rivera@enterprise.ai',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    };
    setUser(newUser);
    setIsAuthenticated(true);
    setSelectedTenant('ALL');
    setActiveView('analytics');
    addToast({
      type: 'success',
      title: 'Logged in as System Admin (GLOBAL)',
      description: 'JWT Issued. Redirecting to Global Health & Infrastructure metrics.'
    });
    navigate('/dashboard');
  };

  // Mock Login Behavior 3: Compliance Auditor (GLOBAL)
  const loginAsAuditor = () => {
    const newUser: User = {
      id: 'usr-auditor-103',
      name: 'Marcus Vance',
      tenant: 'GLOBAL',
      role: 'COMPLIANCE_AUDITOR',
      token: generateMockJwt('COMPLIANCE_AUDITOR', 'GLOBAL'),
      email: 'marcus.vance@legal.ai',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    };
    setUser(newUser);
    setIsAuthenticated(true);
    setSelectedTenant('ALL');
    setActiveView('lineage');
    addToast({
      type: 'success',
      title: 'Logged in as Compliance Auditor (GLOBAL)',
      description: 'JWT Issued. Redirecting to Vector Lineage Traceability.'
    });
    navigate('/dashboard');
  };

  const loginWithProfile = (email: string, role: RbacRole, tenant: RbacTenant) => {
    const userName = email.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase());
    const newUser: User = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: userName || 'Enterprise User',
      email,
      role,
      tenant,
      token: generateMockJwt(role, tenant),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };
    setUser(newUser);
    setIsAuthenticated(true);
    if (tenant !== 'GLOBAL') setSelectedTenant(tenant as TenantScope);

    addToast({
      type: 'success',
      title: 'JWT Authentication Issued',
      description: `Authenticated as ${newUser.name} (${role} - ${tenant}).`
    });
    navigate('/dashboard');
  };

  // Debug Role Switcher for live UI testing
  const setRoleDebug = (role: RbacRole) => {
    if (!user) return;
    const tenant: RbacTenant = role === 'DATA_STEWARD' ? 'HR' : 'GLOBAL';
    const updatedUser: User = {
      ...user,
      role,
      tenant,
      token: generateMockJwt(role, tenant)
    };
    setUser(updatedUser);
    if (tenant !== 'GLOBAL') setSelectedTenant(tenant as TenantScope);
    
    // Auto-swap default view
    if (role === 'DATA_STEWARD') setActiveView('quarantine');
    else if (role === 'SYSTEM_ADMIN') setActiveView('analytics');
    else if (role === 'COMPLIANCE_AUDITOR') setActiveView('lineage');

    addToast({
      type: 'info',
      title: `Persona Switched to ${role}`,
      description: `Swapped dashboard layout and tenant scope to ${tenant}.`
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    addToast({
      type: 'info',
      title: 'Logged Out',
      description: 'JWT Token revoked. Session terminated.'
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
      title: 'Workspace Initialized',
      description: `"${workspaceName}" target set to ${targetVectorDb}.`
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
      token: user?.token || null,
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
