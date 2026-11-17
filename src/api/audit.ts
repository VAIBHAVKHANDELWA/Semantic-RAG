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
  apiRequest('/audit/verify', {}, token || localStorage.getItem('auth_token'));
