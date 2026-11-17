import React from 'react';
import { 
  Database, 
  Lock
} from 'lucide-react';
import type { PgVectorQueryResult, TenantScope } from '../../types';
import { GlassCard } from '../common/GlassCard';

interface PgVectorSearchInspectorProps {
  tenant: TenantScope;
  queryResults?: PgVectorQueryResult[];
}

export const PgVectorSearchInspector: React.FC<PgVectorSearchInspectorProps> = ({ 
  tenant, 
  queryResults 
}) => {
  const cleanTenant = tenant === 'ALL' ? 'HR' : tenant;

  const results: PgVectorQueryResult[] = queryResults || [
    {
      chunkId: 'chunk-a-2022',
      docName: 'HR_Remote_Work_Policy_2022.pdf',
      similarityScore: 0.894,
      tenantId: cleanTenant,
      distance: 0.106,
      isCollision: true,
      textSnippet: 'Employees may work remotely 100% of the time with zero mandatory office attendance requirement.'
    },
    {
      chunkId: 'chunk-a-2021',
      docName: 'HR_Parental_Leave_Benefits_2021.pdf',
      similarityScore: 0.742,
      tenantId: cleanTenant,
      distance: 0.258,
      isCollision: false,
      textSnippet: 'Parental leave grants up to 16 weeks of full salary continuation for primary caregivers.'
    },
    {
      chunkId: 'chunk-a-2023',
      docName: 'HR_Equipment_Stipend_Guide.pdf',
      similarityScore: 0.615,
      tenantId: cleanTenant,
      distance: 0.385,
      isCollision: false,
      textSnippet: 'Annual home office ergonomics allowance is capped at $500 per calendar year.'
    }
  ];

  const sqlQuery = `SELECT 
  id, 
  doc_name, 
  tenant_id, 
  1 - (embedding <=> $1) AS cosine_similarity,
  (embedding <=> $1) AS cosine_distance
FROM vector_chunks
WHERE tenant_id = '${cleanTenant}' -- ZERO-TRUST DATA ISOLATION ENFORCED
ORDER BY embedding <=> $1 ASC
LIMIT 5;`;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* SQL Query Box */}
      <GlassCard className="p-4 space-y-3 border-slate-800/90">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>PostgreSQL + pgvector Cosine Search Query</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
            HNSW Index: pgvector (m=16, ef_construction=64)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono leading-relaxed whitespace-pre-wrap">
          {sqlQuery}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400">
          <Lock className="w-3.5 h-3.5" />
          <span>Security Audit: Query is hard-filtered by WHERE tenant_id = '{cleanTenant}'. Finance & Legal vectors are strictly excluded.</span>
        </div>
      </GlassCard>

      {/* Query Results Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider">
          <span>Top Nearest Neighbors Returned ({results.length})</span>
          <span className="text-amber-400 font-bold">Collision Threshold: &gt;85% Similarity</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {results.map(res => (
            <div key={res.chunkId} className="p-3.5 hover:bg-slate-800/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-bold text-xs">{res.docName}</span>
                  <span className="text-slate-500">({res.chunkId})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    res.isCollision ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {(res.similarityScore * 100).toFixed(1)}% Similarity
                  </span>
                  <span className="text-[10px] text-slate-500">Distance: {res.distance.toFixed(3)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 text-slate-300 text-[11px] truncate">
                "{res.textSnippet}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
