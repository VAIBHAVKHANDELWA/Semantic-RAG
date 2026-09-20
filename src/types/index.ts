export type RbacTenant = 'HR' | 'FINANCE' | 'LEGAL' | 'ENGINEERING' | 'GLOBAL';
export type TenantScope = 'ALL' | 'HR' | 'LEGAL' | 'FINANCE' | 'ENGINEERING' | 'GLOBAL';

export type RbacRole = 'DATA_STEWARD' | 'SYSTEM_ADMIN' | 'COMPLIANCE_AUDITOR';
export type UserRole = RbacRole | 'IT_ADMIN' | 'AI_ARCHITECT' | 'LEGAL_COUNSEL';

export interface User {
  id: string;
  name: string;
  tenant: RbacTenant;
  department?: RbacTenant; // Department dimension (Data Isolation)
  role: RbacRole;          // Role dimension (Persona Feature Access)
  token: string;
  email?: string;
  avatarUrl?: string;
}

export type UserProfile = User;

export type AppRoute = 
  | '/' 
  | '/login' 
  | '/signup' 
  | '/onboarding' 
  | '/dashboard' 
  | '/admin/billing' 
  | '/admin/tenants' 
  | '/admin/logs' 
  | '/unauthorized';

export type ActiveViewType = 
  | 'quarantine' 
  | 'ingestion' 
  | 'ai_pipeline'
  | 'lineage' 
  | 'analytics' 
  | 'settings' 
  | 'billing' 
  | 'tenant_mgmt' 
  | 'system_logs' 
  | 'audit_logs';

export interface WorkspaceConfig {
  workspaceName: string;
  targetVectorDb: string;
  ingestionMode: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: TenantScope;
  isolationLevel: 'Hardware Isolated' | 'Logical Namespace' | 'Encrypted Tenant Context';
  activeConflictsCount: number;
  totalIngestedDocs: number;
  rateLimitReqPerMin?: number;
  storageUsedGb?: number;
}

export type IngestionModality = 'NATIVE_TEXT' | 'OCR_TESSERACT';

export type PipelineStage = 
  | 'INGESTING' 
  | 'CHUNK_ADAPTIVE' 
  | 'EMBEDDING' 
  | 'COLLISION_CHECK' 
  | 'IN_VECTOR_DB' 
  | 'QUARANTINED';

export interface IngestionItem {
  id: string;
  fileName: string;
  department: TenantScope;
  author: string;
  uploadTimestamp: string;
  fileSize: string;
  modality: IngestionModality;
  stage: PipelineStage;
  progressPercentage: number;
  chunkCount?: number;
  vectorDbStatus?: 'SYNCED' | 'PROCESSING' | 'FLAGGED';
}

export type LLMVerdictType = 
  | 'CONTRADICTORY'
  | 'SUPERSIDING_POLICY'
  | 'PARTIAL_UPDATE'
  | 'DUPLICATE_PRUNE';

export interface ChunkMetadata {
  id: string;
  docName: string;
  docYear: number;
  author: string;
  uploadDate: string;
  effectiveDate?: string;
  temporalStatus?: 'Active' | 'Archived' | 'Quarantined';
  text: string;
  tenantId: TenantScope;
  embeddingId: string;
  vectorPreview: number[];
  tokenCount: number;
  highlightedDiffRanges?: { type: 'removed' | 'added' | 'unchanged'; text: string }[];
}

export interface QuarantineConflict {
  id: string;
  similarityScore: number; // e.g. 0.894 (89.4%)
  department: TenantScope;
  verdictType: LLMVerdictType;
  contradictionExplanation: string;
  temporalSummary: string; // e.g. "Incoming Chunk B is 4 years newer"
  existingChunk: ChunkMetadata;
  incomingChunk: ChunkMetadata;
  status: 'PENDING' | 'ACCEPTED_INCOMING' | 'PROMOTED_INCOMING_ARCHIVED_OLD' | 'KEPT_EXISTING' | 'DISCARDED_BOTH' | 'MANUALLY_MERGED';
  mergedText?: string;
  createdAt: string;
}

export interface DbscanCluster {
  id: string;
  name: string;
  category: string;
  coordX: number;
  coordY: number;
  radius: number;
  sampleCount: number;
  avgSimilarity: number;
  density: 'High' | 'Critical' | 'Medium';
  description: string;
  conflictIds: string[];
}

export interface SystemTelemetry {
  gatewayLatencyMs: number;
  rabbitMqRate: number;
  rabbitMqLatencyMs: number;
  pythonGpuLoad: number;
  llmCircuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  tokensPerSec: number;
  exactDuplicatesPruned: number;
  redisCacheHits: number;
  totalChunksProcessed: number;
  vectorRamSavedGb: number;
  llmCostSavedUsd: number;
  quarantinedPendingCount: number;
  quarantinedResolvedCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  conflictId?: string;
  read: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: RbacRole;
  department: TenantScope;
  action: 'RESOLVE_ACCEPT' | 'RESOLVE_KEEP' | 'RESOLVE_DISCARD' | 'MANUAL_MERGE' | 'DOCUMENT_INGEST' | 'TENANT_CREATE' | 'RATE_LIMIT_CHANGE';
  targetId: string;
  details: string;
  integrityHash: string;
}

export interface UploadTicketResponse {
  ticketId: string;
  presignedUrl: string;
  s3Bucket: string;
  s3Key: string;
  expiresInSeconds: number;
  tenantFolder: TenantScope;
  maxByteSize: number;
}

export interface BatchIngestionJob {
  jobId: string;
  batchName: string;
  department: TenantScope;
  totalFiles: number;
  ocrFileCount: number;
  nativeFileCount: number;
  status: 'INITIALIZING' | 'UPLOADING_DIRECT_S3' | 'SPRING_BATCH_CHUNKING' | 'THROTTLED' | 'COMPLETED';
  progressPercentage: number;
  chunksCreated: number;
  conflictsFound: number;
  throughputChunksPerSec: number;
  estimatedTimeRemaining: string;
  createdAt: string;
  backpressureActive: boolean;
}

export interface SseTelemetryPayload {
  jobId: string;
  timestamp: string;
  status: BatchIngestionJob['status'];
  chunksCreated: number;
  conflictsFound: number;
  throughputChunksPerSec: number;
  estimatedTimeRemaining: string;
  circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  logMessage: string;
}

export interface PgVectorQueryResult {
  chunkId: string;
  docName: string;
  similarityScore: number;
  tenantId: TenantScope;
  distance: number;
  isCollision: boolean;
  textSnippet: string;
}

export interface LlmAdjudicationResult {
  conflict: boolean;
  verdictType: LLMVerdictType;
  contradictionExplanation: string;
  temporalSummary: string;
  promptTokens: number;
  completionTokens: number;
  modelName: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface PipelineStepStatus {
  stepIndex: number;
  name: string;
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FLAGGED';
  latencyMs: number;
  details: string;
}



