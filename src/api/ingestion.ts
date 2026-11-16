import { apiRequest } from './client';
import type { BatchIngestionJob } from '../types';

export interface UploadTicket {
  ticketId: string;
  uploadUrl: string;
  objectKey: string;
  bucketName: string;
  tenantId: string;
  expiresInSeconds: number;
}

export const getUploadTicket = (fileName: string, token?: string | null): Promise<UploadTicket> =>
  apiRequest<UploadTicket>(
    `/ingest/upload-ticket?fileName=${encodeURIComponent(fileName)}`,
    {},
    token || localStorage.getItem('auth_token')
  );

export const completeIngestion = (
  objectKey: string,
  fileName: string,
  token?: string | null
): Promise<{ jobId: string; status: string; message: string }> =>
  apiRequest<{ jobId: string; status: string; message: string }>(
    '/ingest/complete',
    {
      method: 'POST',
      body: JSON.stringify({ objectKey, fileName }),
    },
    token || localStorage.getItem('auth_token')
  );

export const fetchIngestionJobs = (token?: string | null): Promise<BatchIngestionJob[]> =>
  apiRequest<BatchIngestionJob[]>('/ingest/jobs', {}, token || localStorage.getItem('auth_token'));
