import { apiRequest } from './client';
import type { AuditLogEntry } from '../types';

export const fetchAuditLogs = (token?: string | null): Promise<AuditLogEntry[]> =>
  apiRequest<AuditLogEntry[]>('/audit/logs', {}, token || localStorage.getItem('auth_token'));

export const verifyAuditChain = (token?: string | null): Promise<{
  verified: boolean;
  totalEntries: number;
  tamperedAt?: string;
  headHash?: string;
  message?: string;
}> =>
  apiRequest('/audit/verify', {}, token || localStorage.getItem('auth_token'));
