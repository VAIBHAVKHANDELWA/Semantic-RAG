import React from 'react';
import { FileText, User, Calendar, Database, Shield, Hash, Code, Terminal, AlertTriangle, X } from 'lucide-react';

export interface LineageNodeData {
  id: string;
  type: 'root_doc' | 'parsed_block' | 'semantic_chunk' | 'conflict_node' | 'vector_db';
  title: string;
  subtitle: string;
  status: 'clean' | 'quarantined' | 'pruned' | 'processing';
  metadata: {
    docName?: string;
    author?: string;
    uploadDate?: string;
    tenantScope?: string;
    modality?: string;
    tokenCount?: number;
    embeddingId?: string;
    vectorPreview?: number[];
    similarity?: number;
    executionLog?: string;
  };
}

interface NodeInspectorProps {
  node: LineageNodeData | null;
  onClose: () => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="w-80 rounded-2xl bg-slate-900/95 border border-slate-800 p-5 space-y-4 shadow-2xl backdrop-blur-xl">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Node Telemetry Inspector</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node Identity */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
        <div className="text-[10px] font-mono text-slate-500 uppercase">{node.type.replace('_', ' ')}</div>
        <div className="text-sm font-bold text-slate-100">{node.title}</div>
        <div className="text-xs text-slate-400 font-mono">{node.subtitle}</div>
      </div>

      {/* Metadata Detail Items */}
      <div className="space-y-2.5 text-xs">
        {node.metadata.docName && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-cyan-400" /> Document</span>
            <span className="font-mono text-slate-200 truncate max-w-[140px]">{node.metadata.docName}</span>
          </div>
        )}

        {node.metadata.author && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-purple-400" /> Author</span>
            <span className="font-mono text-slate-200">{node.metadata.author}</span>
          </div>
        )}

        {node.metadata.uploadDate && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-400" /> Uploaded</span>
            <span className="font-mono text-slate-200">{node.metadata.uploadDate}</span>
          </div>
        )}

        {node.metadata.tenantScope && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Tenant</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 text-[10px] font-mono">
              {node.metadata.tenantScope}
            </span>
          </div>
        )}

        {node.metadata.tokenCount !== undefined && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> Tokens</span>
            <span className="font-mono text-slate-200">{node.metadata.tokenCount}</span>
          </div>
        )}

        {node.metadata.embeddingId && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-cyan-400" /> Vector ID</span>
            <span className="font-mono text-cyan-400 text-[10px]">{node.metadata.embeddingId}</span>
          </div>
        )}

        {node.metadata.similarity !== undefined && (
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Collision</span>
            <span className="font-mono text-amber-400 font-bold">{(node.metadata.similarity * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Vector Preview Array */}
      {node.metadata.vectorPreview && (
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            MiniLM Vector Preview (384-dim)
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-cyan-300">
            [{node.metadata.vectorPreview.map(v => v.toFixed(3)).join(', ')}]
          </div>
        </div>
      )}

      {/* Execution Trace Log */}
      {node.metadata.executionLog && (
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Code className="w-3 h-3 text-purple-400" /> Pipeline Execution Trace
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 whitespace-pre-wrap leading-tight">
            {node.metadata.executionLog}
          </div>
        </div>
      )}
    </div>
  );
};
