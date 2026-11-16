export interface DbscanClusterPoint {
  id: string;
  docName: string;
  score: number;
  verdict: string;
  x: number;
  y: number;
}

export interface DbscanClusterGroup {
  clusterId: number;
  label: string;
  size: number;
  points: DbscanClusterPoint[];
}

export interface DbscanClusterResponse {
  tenantId: string;
  totalPoints: number;
  clusterCount: number;
  clusters: DbscanClusterGroup[];
  noise: DbscanClusterPoint[];
  eps: number;
  minSamples: number;
  message?: string;
}

export const fetchClusters = async (
  tenantId: string,
  eps?: number,
  minSamples?: number
): Promise<DbscanClusterResponse> => {
  const aiEngineUrl = import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:8000';
  const queryParams = new URLSearchParams({ tenantId });
  if (eps !== undefined) queryParams.set('eps', String(eps));
  if (minSamples !== undefined) queryParams.set('min_samples', String(minSamples));

  const res = await fetch(`${aiEngineUrl}/api/v1/clusters?${queryParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Clusters fetch failed with status ${res.status}`);
  }
  return res.json();
};
