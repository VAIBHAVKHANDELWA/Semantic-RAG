import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  FileText, 
  Layers, 
  Cpu, 
  ShieldAlert, 
  Database, 
  ArrowRight,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchProvenanceEdges, type ProvenanceEdge } from '../../api/lineage';
import { NodeInspector } from './NodeInspector';
import type { LineageNodeData } from './NodeInspector';
import { motion } from 'framer-motion';

interface LineageGraphProps {
  conflictId?: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const LineageGraph: React.FC<LineageGraphProps> = ({ conflictId, isModal = false }) => {
  const { conflicts, selectedConflictId, setSelectedConflictId } = useApp();

  const [activeId, setActiveId] = useState<string>(conflictId || selectedConflictId || (conflicts[0]?.id ?? ''));
  const conflict = conflicts.find(c => c.id === activeId) || conflicts[0];

  const [selectedNode, setSelectedNode] = useState<LineageNodeData | null>(null);
  const [provenanceEdges, setProvenanceEdges] = useState<ProvenanceEdge[]>([]);

  useEffect(() => {
    if (conflict?.id) {
      fetchProvenanceEdges(conflict.id)
        .then(edges => {
          if (edges && edges.length > 0) {
            setProvenanceEdges(edges);
          }
        })
        .catch(err => {
          console.warn('Could not fetch provenance edges for lineage graph:', err);
        });
    }
  }, [conflict?.id]);

  if (!conflict) {
    return (
      <div className="rounded-2xl bg-slate-950 border border-slate-800 p-12 text-center text-slate-400">
        <GitFork className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">No Conflict Lineage Available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Traceability graph visualizes the document-to-chunk provenance chain for quarantined collisions. No conflict currently selected.
        </p>
      </div>
    );
  }

  const isOcr = Boolean(
    conflict?.incomingChunk?.docName?.toLowerCase().includes('scanned') ||
    conflict?.incomingChunk?.docName?.toLowerCase().includes('ocr')
  );

  // Nodes for the dynamic provenance graph with temporal status styling
  const existingIsArchived = conflict?.status === 'PROMOTED_INCOMING_ARCHIVED_OLD' || conflict?.status === 'ACCEPTED_INCOMING';
  const incomingIsPromoted = conflict?.status === 'PROMOTED_INCOMING_ARCHIVED_OLD' || conflict?.status === 'ACCEPTED_INCOMING';
  const primaryEdge = provenanceEdges[0];

  const graphNodes: LineageNodeData[] = [
    {
      id: 'node-root-1',
      type: 'root_doc',
      title: conflict?.incomingChunk?.docName || 'Enterprise_Policy_Document.pdf',
      subtitle: isOcr ? 'Root Document (Scanned OCR)' : 'Root Document (Native Tika)',
      status: 'clean',
      metadata: {
        docName: conflict?.incomingChunk?.docName,
        author: conflict?.incomingChunk?.author || 'Governance Committee',
        uploadDate: conflict?.incomingChunk?.uploadDate,
        effectiveDate: conflict?.incomingChunk?.effectiveDate || '2026-09-07',
        temporalStatus: 'Active',
        tenantScope: conflict?.incomingChunk?.tenantId || conflict.department,
        modality: isOcr ? 'Tesseract OCR Modality' : 'Apache Tika Text Extractor',
        executionLog: isOcr
          ? '[Modality] Scanned image detected. Tesseract OCR executed.'
          : '[Modality] Native structured document. Extracted via Apache Tika 3.x.'
      }
    },
    {
      id: 'node-chunk-1',
      type: 'semantic_chunk',
      title: `Incoming Chunk #${conflict?.incomingChunk?.id || 'chk-incoming'}`,
      subtitle: 'MiniLM-L6-v2 Vector (384-dim)',
      status: 'processing',
      metadata: {
        docName: conflict?.incomingChunk?.docName,
        tokenCount: conflict?.incomingChunk?.tokenCount || 262,
        embeddingId: conflict?.incomingChunk?.embeddingId,
        vectorPreview: conflict?.incomingChunk?.vectorPreview || [0.045, -0.188, 0.871, 0.135, -0.41, 0.598],
        tenantScope: conflict?.incomingChunk?.tenantId || conflict.department,
        uploadDate: conflict?.incomingChunk?.uploadDate,
        effectiveDate: conflict?.incomingChunk?.effectiveDate,
        temporalStatus: incomingIsPromoted ? 'Active' : 'Quarantined',
        executionLog: '[Pipeline] Tokenized. Generated 384-dim dense float32 embedding vector.'
      }
    },
    {
      id: 'node-conflict-1',
      type: 'conflict_node',
      title: `Collision (${(conflict.similarityScore * 100).toFixed(1)}% Cosine)`,
      subtitle: primaryEdge ? `DB Relation: ${primaryEdge.relation}` : (conflict.status === 'PENDING' ? 'Quarantined Holding Tank' : `Resolved: ${conflict.status}`),
      status: conflict.status === 'PENDING' ? 'quarantined' : 'clean',
      metadata: {
        docName: conflict?.existingChunk?.docName,
        similarity: conflict?.similarityScore,
        tenantScope: conflict?.department,
        temporalStatus: conflict.status === 'PENDING' ? 'Quarantined' : 'Active',
        executionLog: `[Adjudication] Cosine similarity: ${(conflict.similarityScore * 100).toFixed(1)}%.\n[Verdict] DeBERTa Cross-Encoder: ${conflict.verdictType}.\n[Status] ${conflict.status}.${primaryEdge ? `\n[Provenance Edge] ${primaryEdge.fromChunkId} -> ${primaryEdge.toChunkId} (${primaryEdge.relation})` : ''}`
      }
    },
    {
      id: 'node-existing-1',
      type: 'semantic_chunk',
      title: existingIsArchived ? `[ARCHIVED] ${conflict?.existingChunk?.id}` : `[ACTIVE] ${conflict?.existingChunk?.id}`,
      subtitle: existingIsArchived ? 'Soft-Archived Audit Vault' : 'Live Vector Store Candidate',
      status: existingIsArchived ? 'pruned' : 'clean',
      metadata: {
        docName: conflict?.existingChunk?.docName,
        author: conflict?.existingChunk?.author,
        uploadDate: conflict?.existingChunk?.uploadDate,
        effectiveDate: conflict?.existingChunk?.effectiveDate,
        temporalStatus: existingIsArchived ? 'Archived' : 'Active',
        tokenCount: conflict?.existingChunk?.tokenCount,
        embeddingId: conflict?.existingChunk?.embeddingId,
        vectorPreview: conflict?.existingChunk?.vectorPreview,
        tenantScope: conflict?.existingChunk?.tenantId,
        executionLog: existingIsArchived 
          ? '[Status] Soft-Archived for Audit Compliance. Retained in historical vector vault.'
          : '[Status] Live Active Vector serving production RAG queries.'
      }
    },
    {
      id: 'node-vector-db',
      type: 'vector_db',
      title: `pgvector Index: ${conflict.department.toLowerCase()}`,
      subtitle: 'PostgreSQL HNSW 384-dim Isolated Namespace',
      status: conflict.status === 'PENDING' ? 'quarantined' : 'clean',
      metadata: {
        docName: 'idx_vector_chunks_hnsw',
        tenantScope: conflict?.department,
        temporalStatus: incomingIsPromoted ? 'Active' : 'Quarantined',
        embeddingId: incomingIsPromoted ? conflict.incomingChunk?.embeddingId : conflict.existingChunk?.embeddingId,
        executionLog: `[Status] ${conflict.status === 'PENDING' ? 'Quarantine Holding Tank (Excluded from RAG)' : 'Committed with Provenance Metadata Tag'}`
      }
    }
  ];

  const getNodeColorClass = (node: LineageNodeData) => {
    const tStatus = node.metadata.temporalStatus;
    if (tStatus === 'Archived') {
      return 'border-slate-700 bg-slate-800/60 text-slate-400 font-mono';
    }
    if (tStatus === 'Active') {
      return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-500/10 hover:border-emerald-400';
    }
    if (tStatus === 'Quarantined' || node.type === 'conflict_node') {
      return 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:border-amber-400 glow-amber';
    }

    const defaultClasses = {
      root_doc: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:border-blue-400',
      parsed_block: 'border-purple-500/40 bg-purple-500/10 text-purple-300 hover:border-purple-400',
      semantic_chunk: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400',
      conflict_node: 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:border-amber-400 glow-amber',
      vector_db: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400'
    };
    return defaultClasses[node.type];
  };

  const nodeIcons = {
    root_doc: FileText,
    parsed_block: Layers,
    semantic_chunk: Cpu,
    conflict_node: ShieldAlert,
    vector_db: Database
  };

  return (
    <div className={`p-6 space-y-6 max-w-7xl mx-auto ${isModal ? 'p-2' : ''}`}>
      {/* Header */}
      {!isModal && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <GitFork className="w-5 h-5 text-cyan-400" />
              Interactive Data Lineage & Traceability Graph
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Tracing document ingestion provenance: Raw File &rarr; {isOcr ? 'Tesseract OCR' : 'Apache Tika'} &rarr; MiniLM Chunk &rarr; DeBERTa Adjudication &rarr; PostgreSQL pgvector.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {conflicts.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Select Document Pair:</span>
                <select
                  value={activeId}
                  onChange={e => {
                    setActiveId(e.target.value);
                    setSelectedConflictId(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400 max-w-xs truncate"
                >
                  {conflicts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.incomingChunk?.docName || c.id} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <Info className="w-4 h-4 text-cyan-400" /> Click any node to inspect metadata
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-8 min-h-[520px] flex flex-col justify-between overflow-hidden">
        {/* Subtle Grid Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        {/* Node Flow Diagram */}
        <div className="relative z-10 my-auto flex flex-col lg:flex-row items-center justify-between gap-6 py-6 overflow-x-auto">
          {graphNodes.map((node, index) => {
            const Icon = nodeIcons[node.type];
            const isSelected = selectedNode?.id === node.id;
            return (
              <React.Fragment key={node.id}>
                {/* Node Card */}
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  onClick={() => setSelectedNode(node)}
                  className={`w-60 p-4 rounded-xl border cursor-pointer transition-all ${getNodeColorClass(node)} ${
                    isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-2xl' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800">
                      Step 0{index + 1}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 truncate">{node.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{node.subtitle}</p>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Inspect Metadata</span>
                    <span className="text-cyan-400">Click →</span>
                  </div>
                </motion.div>

                {/* Arrow Connector */}
                {index < graphNodes.length - 1 && (
                  <div className="hidden lg:flex items-center text-slate-600">
                    <ArrowRight className="w-5 h-5 animate-pulse text-cyan-500/60" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Floating Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute right-6 top-6 z-30">
            <NodeInspector 
              node={selectedNode} 
              onClose={() => setSelectedNode(null)} 
            />
          </div>
        )}

        {/* Bottom Legend */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Root File</span>
            {isOcr && (
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> OCR Parser</span>
            )}
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> MiniLM Vector</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Conflict Quarantined</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Archived / Superseded</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Active Vector DB</span>
          </div>

          <div>
            Target Tenant Isolation Scope: <span className="text-cyan-400 font-bold">{conflict?.department}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
