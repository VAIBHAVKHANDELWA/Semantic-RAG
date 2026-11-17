import { apiRequest } from './client';
import type { BatchIngestionJob, TenantScope } from '../types';

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

export function normalizeIngestionJob(raw: any): BatchIngestionJob {
  const dept = (raw.department || raw.tenantId || 'HR') as TenantScope;
  const fileName = raw.fileName || raw.batchName || `${dept}_Document_Batch.pdf`;
  const isScanned = fileName.toLowerCase().includes('scanned') || fileName.endsWith('.png') || fileName.endsWith('.jpg');

  return {
    jobId: raw.jobId || raw.id || `job-${Math.random().toString(36).slice(2, 8)}`,
    batchName: raw.batchName || fileName.replace(/^[a-f0-9-]+_/, ''),
    department: dept,
    totalFiles: raw.totalFiles || 1,
    ocrFileCount: raw.ocrFileCount || (isScanned ? 1 : 0),
    nativeFileCount: raw.nativeFileCount || (isScanned ? 0 : 1),
    status: (raw.status === 'COMPLETED' ? 'COMPLETED' : raw.status === 'FAILED' ? 'THROTTLED' : 'SPRING_BATCH_CHUNKING') as any,
    progressPercentage: raw.status === 'COMPLETED' ? 100 : (raw.progressPercentage || 65),
    chunksCreated: raw.chunksCommitted || raw.chunkTotal || raw.chunksCreated || 0,
    conflictsFound: raw.chunksQuarantined || raw.conflictsFound || 0,
    throughputChunksPerSec: raw.throughputChunksPerSec || 140,
    estimatedTimeRemaining: raw.status === 'COMPLETED' ? '0s' : '15s',
    createdAt: raw.createdAt ? (typeof raw.createdAt === 'string' ? raw.createdAt.replace('T', ' ').slice(0, 19) : new Date(raw.createdAt).toISOString().replace('T', ' ').slice(0, 19)) : new Date().toISOString().replace('T', ' ').slice(0, 19),
    backpressureActive: raw.backpressureActive || false
  };
}

export const fetchIngestionJobs = async (token?: string | null): Promise<BatchIngestionJob[]> => {
  const rawList = await apiRequest<any[]>('/ingest/jobs', {}, getToken(token));
  return (rawList || []).map(normalizeIngestionJob);
};
