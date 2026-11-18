import { apiRequest } from './client';

export interface WorkspaceConfigResponse {
  workspaceName: string;
  targetVectorDb: string;
  chunkingStrategy: string;
  vectorDbEndpoint?: string | null;
  vectorDbStatus: string;
  vectorDbLatencyMs?: number | null;
  activeHnswIndex?: boolean;
  dimension?: number;
  updatedAt?: string | null;
}

export interface WorkspaceConfigPayload {
  workspaceName: string;
  targetVectorDb: string;
  chunkingStrategy: string;
  vectorDbEndpoint?: string;
  vectorDbApiKey?: string;
}

export interface TestConnectionResponse {
  target: string;
  healthy: boolean;
  status: 'CONNECTED' | 'OFFLINE';
  latencyMs?: number | null;
  details: string;
}

export async function fetchWorkspaceConfig(token?: string | null): Promise<WorkspaceConfigResponse> {
  return apiRequest<WorkspaceConfigResponse>('/workspace/config', { method: 'GET' }, token);
}

export async function saveWorkspaceConfig(
  payload: WorkspaceConfigPayload,
  token?: string | null
): Promise<{ success: boolean; message: string; workspaceName: string; targetVectorDb: string; chunkingStrategy: string }> {
  return apiRequest('/workspace/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, token);
}

export async function testVectorConnection(
  target: string,
  endpoint?: string,
  apiKey?: string,
  token?: string | null
): Promise<TestConnectionResponse> {
  return apiRequest<TestConnectionResponse>('/workspace/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, endpoint, apiKey })
  }, token);
}
