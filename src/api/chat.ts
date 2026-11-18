import { apiRequest } from './client';

export interface PolicySource {
  chunkId: string;
  docName: string;
  version: string;
  effectiveDate: string;
  similarity: number;
  snippet: string;
}

export interface PolicyInForce {
  docName: string;
  version: string;
  effectiveDate: string;
}

export interface ChatResponse {
  answer: string;
  sources: PolicySource[];
  cacheHit: boolean;
  latencyMs: number;
  llmMode: string;
  policyInForce?: PolicyInForce | null;
  pendingQuarantineBadge?: string | null;
  tenantId: string;
}

export async function askPolicyRAG(
  question: string,
  options?: { top_k?: number; asOfDate?: string; tenantId?: string },
  token?: string | null
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>(
    '/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        question,
        top_k: options?.top_k || 5,
        asOfDate: options?.asOfDate,
        tenantId: options?.tenantId,
      }),
    },
    token || localStorage.getItem('auth_token')
  );
}
