import { apiRequest } from './client';
import type { QuarantineConflict, ChunkMetadata, TenantScope, LLMVerdictType } from '../types';

export function normalizeConflict(raw: any): QuarantineConflict {
  const department = (raw.department || raw.tenantId || 'HR') as TenantScope;
  const rawExistingDoc = raw.existingDocument || raw.existingDoc || `${department}_Baseline_Policy.pdf`;
  const cleanExistingDoc = rawExistingDoc.replace(/^[a-f0-9-]+_/, '');
  const cleanIncomingDoc = (raw.documentId || raw.incomingDocument || `${department}_Policy_Amendment.pdf`).replace(/^[a-f0-9-]+_/, '').replace(/^doc-job-[a-f0-9]+/, `${department}_Policy_Update_2026.pdf`);

  const existingText = raw.existingChunkText || (raw.existingChunk && raw.existingChunk.text) || '';
  const incomingText = raw.incomingChunkText || (raw.incomingChunk && raw.incomingChunk.text) || '';

  const existingChunk: ChunkMetadata = raw.existingChunk || {
    id: raw.existingChunkId || `chk-ex-${raw.id}`,
    docName: cleanExistingDoc,
    docYear: 2024,
    author: `${department} Policy Council`,
    uploadDate: raw.createdAt ? new Date(raw.createdAt).toISOString().split('T')[0] : '2025-01-15',
    effectiveDate: '2025-01-15',
    temporalStatus: 'Active',
    text: existingText,
    tenantId: department,
    embeddingId: `emb-${raw.existingChunkId || raw.id}`,
    vectorPreview: [0.124, -0.451, 0.782, 0.231, -0.098],
    tokenCount: existingText ? existingText.split(/\s+/).filter(Boolean).length : 64
  };

  const incomingChunk: ChunkMetadata = raw.incomingChunk || {
    id: raw.incomingChunkId || `chk-in-${raw.id}`,
    docName: cleanIncomingDoc,
    docYear: 2026,
    author: `${department} Governance Team`,
    uploadDate: raw.createdAt ? new Date(raw.createdAt).toISOString().split('T')[0] : '2026-03-10',
    effectiveDate: '2026-04-01',
    temporalStatus: 'Quarantined',
    text: incomingText,
    tenantId: department,
    embeddingId: `emb-in-${raw.id}`,
    vectorPreview: [0.158, -0.412, 0.725, 0.284, -0.052],
    tokenCount: incomingText ? incomingText.split(/\s+/).filter(Boolean).length : 72
  };

  const score = typeof raw.similarityScore === 'number' ? raw.similarityScore : 0.88;
  const verdict = (raw.verdictType || 'CONTRADICTORY') as LLMVerdictType;

  return {
    ...raw,
    id: raw.id,
    similarityScore: score,
    department,
    tenantId: department,
    verdictType: verdict,
    contradictionExplanation: raw.contradictionExplanation || 'Automated cross-encoder detected semantic policy divergence between baseline and incoming amendment.',
    temporalSummary: raw.temporalSummary || `Incoming amendment (${department}) evaluated against active baseline.`,
    existingChunk,
    incomingChunk,
    status: raw.status || 'PENDING',
    mergedText: raw.mergedText,
    createdAt: raw.createdAt ? (typeof raw.createdAt === 'string' ? raw.createdAt : new Date(raw.createdAt).toISOString()) : new Date().toISOString()
  };
}

export const fetchPendingConflicts = async (token?: string | null): Promise<QuarantineConflict[]> => {
  const rawList = await apiRequest<any[]>('/quarantine/pending', {}, token || localStorage.getItem('auth_token'));
  return (rawList || []).map(normalizeConflict);
};

export const fetchConflictDetail = async (id: string, token?: string | null): Promise<QuarantineConflict> => {
  const raw = await apiRequest<any>(`/quarantine/${id}`, {}, token || localStorage.getItem('auth_token'));
  return normalizeConflict(raw);
};

export const resolveConflict = async (
  id: string,
  action: string,
  reason: string = 'Steward resolution verified',
  mergedText?: string,
  token?: string | null
): Promise<QuarantineConflict> => {
  const raw = await apiRequest<any>(`/quarantine/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action, reason, mergedText }),
  }, token || localStorage.getItem('auth_token'));
  return normalizeConflict(raw);
};
