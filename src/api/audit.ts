import { apiRequest } from './client';
import type { AuditLogEntry, TenantScope } from '../types';

export function normalizeAuditLog(raw: any): AuditLogEntry {
  const dept = (raw.department || raw.tenantId || 'HR') as TenantScope;
  return {
    id: raw.id,
    timestamp: raw.createdAt ? (typeof raw.createdAt === 'string' ? raw.createdAt.replace('T', ' ').slice(0, 19) : new Date(raw.createdAt).toISOString().replace('T', ' ').slice(0, 19)) : (raw.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19)),
    actorName: raw.actorName || raw.actorId || 'Security Admin',
    actorRole: (raw.actorRole || 'SYSTEM_ADMIN') as any,
    department: dept,
    action: raw.action || 'DOCUMENT_INGEST',
    targetId: raw.targetId || raw.id,
    details: raw.details || 'Cryptographic audit integrity event recorded.',
    integrityHash: raw.integrityHash || '0000000000000000'
  };
}

export const fetchAuditLogs = async (token?: string | null): Promise<AuditLogEntry[]> => {
  const rawList = await apiRequest<any[]>('/audit/logs', {}, token || localStorage.getItem('auth_token'));
  return (rawList || []).map(normalizeAuditLog);
};

export const verifyAuditChain = (token?: string | null): Promise<{
  verified: boolean;
  totalEntries: number;
  tamperedAt?: string;
  headHash?: string;
  message?: string;
}> =>
  apiRequest('/audit/verify', {}, token || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token'));

export const fetchArchivedChunks = async (token?: string | null): Promise<any[]> => {
  try {
    const rawList = await apiRequest<any[]>('/chunks/archived', {}, token || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token'));
    if (!rawList || !Array.isArray(rawList)) return [];
    return rawList.map(c => ({
      id: c.id,
      docName: c.docName || c.documentId || 'Archived_Policy.pdf',
      docYear: c.createdAt ? new Date(c.createdAt).getFullYear() : 2026,
      author: 'Data Steward',
      uploadDate: c.createdAt ? String(c.createdAt).slice(0, 10) : '2026-11-15',
      effectiveDate: c.createdAt ? `Prior to ${String(c.createdAt).slice(0, 10)}` : 'Archived',
      temporalStatus: c.status || 'Archived',
      text: c.chunkText || '',
      tenantId: c.tenantId,
      embeddingId: `emb-${c.id}`,
      tokenCount: c.chunkText ? c.chunkText.split(/\s+/).length : 50
    }));
  } catch (err) {
    console.debug('No archived chunks found:', err);
    return [];
  }
};
