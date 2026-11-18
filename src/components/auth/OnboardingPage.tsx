import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  ArrowRight, 
  ShieldCheck,
  CheckCircle2,
  Sliders,
  RefreshCw,
  AlertTriangle,
  Server,
  Zap,
  CheckCircle,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchWorkspaceConfig, testVectorConnection } from '../../api/workspace';
import { AppLogo } from '../common/AppLogo';
import { motion } from 'framer-motion';

export const OnboardingPage: React.FC = () => {
  const { user, completeOnboarding, token, navigate } = useApp();

  const [workspaceName, setWorkspaceName] = useState('VectorGuard Enterprise Workspace');
  const [targetVectorDb, setTargetVectorDb] = useState('pgvector');
  const [ingestionMode, setIngestionMode] = useState('Adaptive Chunking + MiniLM Vector Pipeline');
  
  // External DB configuration fields
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    healthy: boolean;
    status: string;
    details: string;
    latencyMs?: number | null;
  } | null>(null);

  const [pgvectorPingMs, setPgvectorPingMs] = useState<number | null>(null);

  // Load existing saved configuration from backend on mount
  useEffect(() => {
    const activeToken = token || sessionStorage.getItem('auth_token');
    fetchWorkspaceConfig(activeToken)
      .then(cfg => {
        if (cfg) {
          if (cfg.workspaceName) setWorkspaceName(cfg.workspaceName);
          if (cfg.targetVectorDb) setTargetVectorDb(cfg.targetVectorDb.toLowerCase());
          if (cfg.chunkingStrategy) {
            const cs = cfg.chunkingStrategy.toUpperCase();
            if (cs.includes('FIXED') || cs.includes('512')) {
              setIngestionMode('Fixed 512 Token Window + Overlap');
            } else if (cs.includes('LEGAL') || cs.includes('CLAUSE')) {
              setIngestionMode('Strict Legal Clause Segmentation');
            } else {
              setIngestionMode('Adaptive Chunking + MiniLM Vector Pipeline');
            }
          }
          if (cfg.vectorDbEndpoint) setEndpoint(cfg.vectorDbEndpoint);
          if (cfg.vectorDbLatencyMs) setPgvectorPingMs(cfg.vectorDbLatencyMs);
        }
      })
      .catch(err => {
        console.debug('Could not pre-load workspace config:', err);
      });

    // Auto-ping local pgvector on mount
    testVectorConnection('pgvector', undefined, undefined, activeToken)
      .then(res => {
        if (res.healthy && res.latencyMs) {
          setPgvectorPingMs(res.latencyMs);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleTestConnection = async (targetId: string, customEndpoint?: string) => {
    setIsTesting(true);
    setTestResult(null);
    const activeToken = token || sessionStorage.getItem('auth_token');
    try {
      const res = await testVectorConnection(targetId, customEndpoint || endpoint, apiKey, activeToken);
      setTestResult({
        tested: true,
        healthy: res.healthy,
        status: res.status,
        details: res.details,
        latencyMs: res.latencyMs
      });
      if (targetId === 'pgvector' && res.latencyMs) {
        setPgvectorPingMs(res.latencyMs);
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        healthy: false,
        status: 'OFFLINE',
        details: err.message || 'Connection test failed. Fallback to local pgvector active.',
        latencyMs: null
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await completeOnboarding(workspaceName, targetVectorDb, ingestionMode, endpoint, apiKey);
    } finally {
      setIsSaving(false);
    }
  };

  const vectorDbOptions = [
    { 
      id: 'qdrant', 
      name: 'Qdrant Vector Cluster', 
      detail: 'High performance HNSW indexing with hardware tenant isolation',
      defaultUrl: 'http://localhost:6333',
      isExternal: true
    },
    { 
      id: 'milvus', 
      name: 'Milvus Distributed DB', 
      detail: 'Massive scale cloud-native vector store',
      defaultUrl: 'http://localhost:19530',
      isExternal: true
    },
    { 
      id: 'pinecone', 
      name: 'Pinecone Serverless', 
      detail: 'Managed serverless vector database',
      defaultUrl: 'https://api.pinecone.io',
      isExternal: true
    },
    { 
      id: 'weaviate', 
      name: 'Weaviate Hybrid Search', 
      detail: 'Vector search with BM25 keyword hybrid engine',
      defaultUrl: 'http://localhost:8080',
      isExternal: true
    },
    { 
      id: 'pgvector', 
      name: 'Pgvector (PostgreSQL)', 
      detail: 'Active Primary: Relational database vector extension with 384-dim HNSW index',
      defaultUrl: 'postgresql://localhost:5432/semantic_rag_db',
      isExternal: false
    }
  ];

  const selectedDbOption = vectorDbOptions.find(opt => 
    targetVectorDb.toLowerCase().includes(opt.id)
  ) || vectorDbOptions[4];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-2xl rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-2xl relative z-10 space-y-6"
      >
        {/* Onboarding Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <AppLogo size="sm" showWordmark={true} subtitle="WORKSPACE CONFIGURATION" />
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
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-cyan-400" /> Enterprise Workspace Name</span>
              <span className="text-[10px] text-slate-500 font-mono">Persisted to PostgreSQL & Redis</span>
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Enterprise Vector Guard"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-slate-200 text-sm font-semibold focus:outline-none focus:border-cyan-500/50"
              required
            />
          </div>

          {/* Vector DB Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" /> Target Vector Database
              </label>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-slate-500">Active Engine:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  PostgreSQL pgvector {pgvectorPingMs !== null ? `(${pgvectorPingMs}ms)` : ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {vectorDbOptions.map(opt => {
                const isSelected = targetVectorDb.toLowerCase().includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setTargetVectorDb(opt.id);
                      setTestResult(null);
                      if (opt.isExternal && !endpoint) {
                        setEndpoint(opt.defaultUrl);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/10' 
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {opt.name}
                        {opt.id === 'pgvector' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider font-mono">
                            Live Primary
                          </span>
                        )}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-normal">{opt.detail}</div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Connection Drawer for Selected Vector DB */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  Connection Settings: {selectedDbOption.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleTestConnection(selectedDbOption.id, endpoint || selectedDbOption.defaultUrl)}
                  disabled={isTesting}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Pinging...' : 'Test Connection'}
                </button>
              </div>

              {selectedDbOption.isExternal ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono mb-1 block">Cluster Host / URL</label>
                    <input
                      type="text"
                      value={endpoint || selectedDbOption.defaultUrl}
                      onChange={e => setEndpoint(e.target.value)}
                      placeholder={selectedDbOption.defaultUrl}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-slate-200 text-xs font-mono focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono mb-1 block">API Key / Bearer Secret</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Optional / Bearer Token"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-slate-200 text-xs font-mono focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Local Database: <span className="text-slate-100">postgresql://localhost:5432/semantic_rag_db</span>
                  </span>
                  <span className="text-emerald-400 font-bold">HNSW Index Active</span>
                </div>
              )}

              {/* Test Connection Banner (Zero Fake Figures) */}
              {testResult && (
                <div className={`p-2.5 rounded-lg border text-[11px] font-mono flex items-start gap-2 ${
                  testResult.healthy 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}>
                  {testResult.healthy ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>Status: {testResult.status}</span>
                      {testResult.latencyMs && <span>({testResult.latencyMs}ms roundtrip)</span>}
                    </div>
                    <div className="text-[10px] opacity-90 mt-0.5">{testResult.details}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ingestion Mode / Chunking Strategy */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Sliders className="w-4 h-4 text-purple-400" /> Default Parsing & Embedding Strategy</span>
              <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                <Zap className="w-3 h-3" /> Live Ingestion Pipeline
              </span>
            </label>
            <select
              value={ingestionMode}
              onChange={e => setIngestionMode(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="Adaptive Chunking + MiniLM Vector Pipeline">Adaptive Semantic Chunking (MiniLM-L6-v2 384-dim)</option>
              <option value="Fixed 512 Token Window + Overlap">Fixed 512 Token Window with 64 Token Overlap</option>
              <option value="Strict Legal Clause Segmentation">Strict Legal & Policy Clause Layout Parsing</option>
            </select>

            {/* Interactive Strategy Explanation */}
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Strategy Behavior:
              </div>
              {ingestionMode.includes('Adaptive') && (
                <div className="text-slate-400 leading-relaxed">
                  <span className="text-cyan-300 font-semibold">Adaptive Semantic Chunking:</span> Dynamically splits documents by natural paragraph (<code className="text-cyan-400 font-mono">\n\n</code>) and sentence boundaries into 400–600 character blocks with 50-char overlap, preserving sentence integrity for high-fidelity semantic embeddings.
                </div>
              )}
              {ingestionMode.includes('Fixed') && (
                <div className="text-slate-400 leading-relaxed">
                  <span className="text-purple-300 font-semibold">Fixed Token Window:</span> Rigidly windows incoming policy documents into continuous 512-token (~2,048 character) chunks with a 64-token overlap, ensuring uniform coverage across large procedural documents.
                </div>
              )}
              {ingestionMode.includes('Legal') && (
                <div className="text-slate-400 leading-relaxed">
                  <span className="text-emerald-300 font-semibold">Strict Legal Clause Layout Parsing:</span> Layout-aware parser that detects formal policy headers (<code className="text-emerald-400 font-mono">ARTICLE</code>, <code className="text-emerald-400 font-mono">SECTION</code>, <code className="text-emerald-400 font-mono">CLAUSE</code>, numbered rules), keeping each legal clause together as an atomic vector chunk to prevent fragmented compliance rules.
                </div>
              )}
            </div>
          </div>

          {/* Action Button & Tenant Context Indicator */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Enforcing {user?.tenant || 'HR'} Tenant Context
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 disabled:opacity-50"
              >
                <span>{isSaving ? 'Applying Config...' : 'Save & Launch Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
