import { apiRequest } from './client';
import type { QuarantineConflict } from '../types';

export const fetchPendingConflicts = (token?: string | null): Promise<QuarantineConflict[]> =>
  apiRequest<QuarantineConflict[]>('/quarantine/pending', {}, token || localStorage.getItem('auth_token'));

export const fetchConflictDetail = (id: string, token?: string | null): Promise<QuarantineConflict> =>
  apiRequest<QuarantineConflict>(`/quarantine/${id}`, {}, token || localStorage.getItem('auth_token'));

export const resolveConflict = (
  id: string,
  action: string,
  mergedText?: string,
  token?: string | null
): Promise<QuarantineConflict> =>
  apiRequest<QuarantineConflict>(`/quarantine/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action, mergedText }),
  }, token || localStorage.getItem('auth_token'));
