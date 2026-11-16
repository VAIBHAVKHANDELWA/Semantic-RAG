import React, { useState } from 'react';
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
import { NodeInspector } from './NodeInspector';
import type { LineageNodeData } from './NodeInspector';
import { motion } from 'framer-motion';

interface LineageGraphProps {
  conflictId?: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const LineageGraph: React.FC<LineageGraphProps> = ({ conflictId, isModal = false }) => {
  const { conflicts, selectedConflictId } = useApp();

  const activeConflictId = conflictId || selectedConflictId || 'conf-8901';
  const conflict = conflicts.find(c => c.id === activeConflictId) || conflicts[0];

  const [selectedNode, setSelectedNode] = useState<LineageNodeData | null>(null);

  // Nodes for the dynamic provenance graph with temporal status styling
  const existingIsArchived = conflict?.status === 'PROMOTED_INCOMING_ARCHIVED_OLD' || conflict?.status === 'ACCEPTED_INCOMING';
  const incomingIsPromoted = conflict?.status === 'PROMOTED_INCOMING_ARCHIVED_OLD' || conflict?.status === 'ACCEPTED_INCOMING';

  const graphNodes: LineageNodeData[] = [
    {
      id: 'node-root-1',
      type: 'root_doc',
      title: conflict ? conflict.incomingChunk.docName : 'Global_Remote_Work_Framework_2026.pdf',
      subtitle: 'Root Document (Native PDF)',
      status: 'clean',
      metadata: {
        docName: conflict?.incomingChunk.docName,
        author: conflict?.incomingChunk.author,
        uploadDate: conflict?.incomingChunk.uploadDate,
        effectiveDate: conflict?.incomingChunk.effectiveDate || '2026-09-07',
        temporalStatus: 'Active',
        tenantScope: conflict?.incomingChunk.tenantId,
        modality: 'Apache Tika Text Extractor',
        executionLog: '[00:00.012] Ingested 4.2 MB binary stream\n[00:00.045] PDF structure validated. SHA256 matches.'
      }
    },
    {
      id: 'node-existing-1',
      type: 'semantic_chunk',
      title: existingIsArchived ? `[ARCHIVED] ${conflict?.existingChunk.id}` : `[ACTIVE] ${conflict?.existingChunk.id}`,
      subtitle: existingIsArchived ? 'Soft-Archived Audit Vault' : 'Live Vector Store Candidate',
      status: existingIsArchived ? 'pruned' : 'clean',
      metadata: {
        docName: conflict?.existingChunk.docName,
        author: conflict?.existingChunk.author,
        uploadDate: conflict?.existingChunk.uploadDate,
        effectiveDate: conflict?.existingChunk.effectiveDate,
        temporalStatus: existingIsArchived ? 'Archived' : 'Active',
        tokenCount: conflict?.existingChunk.tokenCount,
        embeddingId: conflict?.existingChunk.embeddingId,
        vectorPreview: conflict?.existingChunk.vectorPreview,
        tenantScope: conflict?.existingChunk.tenantId,
        executionLog: existingIsArchived 
          ? '[Status] Soft-Archived for Audit Compliance. Retained in historical vector vault.'
          : '[Status] Live Active Vector serving production RAG queries.'
      }
    },
    {
      id: 'node-chunk-1',
      type: 'semantic_chunk',
      title: `Incoming Chunk #${conflict?.incomingChunk.id || 'chk-14'}`,
      subtitle: 'MiniLM-L6-v2 Vector (384-dim)',
      status: 'processing',
      metadata: {
        docName: conflict?.incomingChunk.docName,
        tokenCount: conflict?.incomingChunk.tokenCount || 262,
        embeddingId: conflict?.incomingChunk.embeddingId,
        vectorPreview: conflict?.incomingChunk.vectorPreview || [0.045, -0.188, 0.871, 0.135, -0.41, 0.598],
        tenantScope: conflict?.incomingChunk.tenantId,
        uploadDate: conflict?.incomingChunk.uploadDate,
        effectiveDate: conflict?.incomingChunk.effectiveDate,
        temporalStatus: incomingIsPromoted ? 'Active' : 'Quarantined',
        executionLog: '[00:00.240] Tokenized 262 tokens.\n[00:00.310] Generated 384-dim float32 vector embedding.'
      }
    },
    {
      id: 'node-conflict-1',
      type: 'conflict_node',
      title: `Collision (${(conflict.similarityScore * 100).toFixed(1)}% Cosine)`,
      subtitle: conflict.status === 'PENDING' ? 'Quarantined Holding Tank' : `Resolved: ${conflict.status}`,
      status: conflict.status === 'PENDING' ? 'quarantined' : 'clean',
      metadata: {
        docName: conflict?.existingChunk.docName,
        similarity: conflict?.similarityScore,
        tenantScope: conflict?.department,
        temporalStatus: conflict.status === 'PENDING' ? 'Quarantined' : 'Active',
        executionLog: `[00:00.410] Cosine collision detected (${(conflict.similarityScore * 100).toFixed(1)}%).\n[00:00.430] LLM Verdict: ${conflict.verdictType}.\n[00:00.450] Temporal Status: ${conflict.status}.`
      }
    },
    {
      id: 'node-vector-db',
      type: 'vector_db',
      title: 'Vector DB Index: b2b_policies',
      subtitle: 'pgvector 384-dim Isolated Namespace',
      status: conflict.status === 'PENDING' ? 'quarantined' : 'clean',
      metadata: {
        docName: 'b2b_policies_vector_v4',
        tenantScope: conflict?.department,
        temporalStatus: incomingIsPromoted ? 'Active' : 'Quarantined',
        embeddingId: incomingIsPromoted ? conflict.incomingChunk.embeddingId : conflict.existingChunk.embeddingId,
        executionLog: `[Status] ${conflict.status === 'PENDING' ? 'Quarantine Holding Tank' : 'Committed with Provenance Metadata Tag'}`
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
              Tracing document ingestion provenance: Raw File → OCR Parser → MiniLM Chunk → Cosine Conflict → Vector Store.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <Info className="w-4 h-4 text-cyan-400" /> Click any graph node to inspect raw vector metadata
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
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> OCR Parser</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> MiniLM Vector</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Conflict Quarantined</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Vector DB</span>
          </div>

          <div>
            Target Tenant Isolation Scope: <span className="text-cyan-400 font-bold">{conflict?.department}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
