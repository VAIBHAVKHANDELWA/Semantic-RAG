export type TenantScope = 'ALL' | 'HR' | 'LEGAL' | 'FINANCE' | 'ENGINEERING';

export type AppRoute = '/' | '/login' | '/signup' | '/onboarding' | '/dashboard';

export type UserRole = 'IT_ADMIN' | 'COMPLIANCE_AUDITOR' | 'AI_ARCHITECT' | 'LEGAL_COUNSEL';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  tenant: TenantScope;
  avatarUrl?: string;
}

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
  status: 'PENDING' | 'ACCEPTED_INCOMING' | 'KEPT_EXISTING' | 'DISCARDED_BOTH' | 'MANUALLY_MERGED';
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
