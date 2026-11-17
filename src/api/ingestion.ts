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

const getToken = (token?: string | null): string | null =>
  token || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');

export const getUploadTicket = (fileName: string, token?: string | null): Promise<UploadTicket> =>
  apiRequest<UploadTicket>(
    `/ingest/upload-ticket?fileName=${encodeURIComponent(fileName)}`,
    {},
    getToken(token)
  );

export const uploadFileToS3 = async (uploadUrl: string, file: File): Promise<void> => {
  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to stream file to object storage: HTTP ${resp.status} ${resp.statusText}`);
  }
};

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
    getToken(token)
  );

export const fetchIngestionJobs = (token?: string | null): Promise<BatchIngestionJob[]> =>
  apiRequest<BatchIngestionJob[]>('/ingest/jobs', {}, getToken(token));
