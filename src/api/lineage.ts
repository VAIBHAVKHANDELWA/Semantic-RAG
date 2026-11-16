import { apiRequest } from './client';

export interface ProvenanceEdge {
  id: string;
  tenantId: string;
  fromChunkId: string;
  toChunkId: string;
  relation: string;
  createdByConflictId: string;
  createdAt: string;
}

export const fetchProvenanceEdges = (
  conflictId: string,
  token?: string | null
): Promise<ProvenanceEdge[]> =>
  apiRequest<ProvenanceEdge[]>(
    `/provenance/${conflictId}`,
    {},
    token || localStorage.getItem('auth_token')
  );
