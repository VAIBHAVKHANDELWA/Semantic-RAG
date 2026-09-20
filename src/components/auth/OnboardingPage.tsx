import React, { useState } from 'react';
import { 
  Building2, 
  Database, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';

export const OnboardingPage: React.FC = () => {
  const { user, completeOnboarding } = useApp();

  const [workspaceName, setWorkspaceName] = useState('Acme Enterprise Vector Guard');
  const [targetVectorDb, setTargetVectorDb] = useState('Qdrant (Isolated HR & Legal Collection)');
  const [ingestionMode, setIngestionMode] = useState('Adaptive Chunking + MiniLM Vector Pipeline');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeOnboarding(workspaceName, targetVectorDb, ingestionMode);
  };

  const vectorDbOptions = [
    { id: 'qdrant', name: 'Qdrant Vector Cluster', detail: 'High performance HNSW indexing with hardware tenant isolation' },
    { id: 'milvus', name: 'Milvus Distributed DB', detail: 'Massive scale cloud-native vector store' },
    { id: 'pinecone', name: 'Pinecone Serverless', detail: 'Managed serverless vector database' },
    { id: 'weaviate', name: 'Weaviate Hybrid Search', detail: 'Vector search with BM25 keyword hybrid engine' },
    { id: 'pgvector', name: 'Pgvector (PostgreSQL)', detail: 'Relational database vector extension' }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-2xl rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-2xl relative z-10 space-y-6"
      >
        {/* Onboarding Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold">
              <Sparkles className="w-4 h-4 animate-pulse" /> Step 1 of 1 • Workspace Initialization
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">Configure Enterprise Workspace</h2>
          </div>

          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                {user.name.slice(0, 1)}
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-200">{user.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">{user.role}</div>
              </div>
            </div>
          )}
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Workspace Name */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-400" /> Enterprise Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-slate-200 text-sm font-semibold focus:outline-none focus:border-cyan-500/50"
              required
            />
          </div>

          {/* Vector DB Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-emerald-400" /> Target Vector Database</span>
              <span className="text-[10px] text-slate-500 font-mono">Select target index destination</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {vectorDbOptions.map(opt => {
                const isSelected = targetVectorDb.startsWith(opt.name);
                return (
                  <div
                    key={opt.id}
                    onClick={() => setTargetVectorDb(`${opt.name} (Isolated ${user?.tenant || 'HR'} Collection)`)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/10' 
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{opt.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-normal">{opt.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ingestion Mode */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" /> Default Parsing & Embedding Strategy
            </label>
            <select
              value={ingestionMode}
              onChange={e => setIngestionMode(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 font-mono"
            >
              <option value="Adaptive Chunking + MiniLM Vector Pipeline">Adaptive Semantic Chunking (MiniLM-L6-v2 384-dim)</option>
              <option value="Fixed 512 Token Window + Overlap">Fixed 512 Token Window with 64 Token Overlap</option>
              <option value="Strict Legal Clause Segmentation">Strict Legal & Policy Clause Layout Parsing</option>
            </select>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Enforcing {user?.tenant || 'HR'} Tenant Context
            </span>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
            >
              <span>Launch Dashboard Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
