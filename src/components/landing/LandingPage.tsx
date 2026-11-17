import React from 'react';
import { 
  Network, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Database, 
  Cpu, 
  FileText, 
  Sparkles, 
  AlertTriangle, 
  Lock, 
  Activity
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const { navigate, isAuthenticated } = useApp();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans">
      {/* Top Glassmorphic Navigation Bar */}
      <nav className="h-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wider text-slate-100 uppercase">Semantic RAG</h1>
            <p className="text-[10px] text-cyan-400 font-mono tracking-tight">CONFLICT-AWARE PRUNING ENGINE</p>
          </div>
        </div>

        {/* Center Nav Items */}
        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
          <a href="#features" className="hover:text-cyan-300 transition-colors">3-Step Engine</a>
          <a href="#architecture" className="hover:text-cyan-300 transition-colors">Pipeline Architecture</a>
          <a href="#metrics" className="hover:text-cyan-300 transition-colors">Cost & Storage Metrics</a>
          <a href="#isolation" className="hover:text-cyan-300 transition-colors">Multi-Tenant Scope</a>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
          >
            <span>{isAuthenticated ? 'Launch Platform' : 'Access Gateway'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 lg:px-12 max-w-7xl mx-auto text-center space-y-8">
        {/* Background Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-mono shadow-md shadow-cyan-500/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Semantic RAG Middleware v4.2 • Enterprise Conflict Quarantine</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 max-w-5xl mx-auto leading-tight"
        >
          Stop AI Hallucinations <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Before They Start.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
        >
          Clean unstructured enterprise documents before they reach vector databases. Detect 85%–97% semantic policy collisions, prune outdated vector embeddings, and enforce strict multi-tenant context isolation.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={() => navigate('/login')}
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all hover:scale-105"
          >
            <span>Sign In to Platform</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-7 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Launch Live Sandbox</span>
          </button>
        </motion.div>

        {/* Tech Stack Pills */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-400" /> Apache Tika Extractor</span>
          <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-purple-400" /> Tesseract v5 OCR</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-cyan-400" /> MiniLM-L6-v2 Embeddings</span>
          <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL pgvector (HNSW)</span>
        </div>

        {/* Interactive Hero Preview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-8 max-w-5xl mx-auto"
        >
          <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-6 shadow-2xl backdrop-blur-xl glow-cyan text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Quarantine Preview</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                89.4% COSINE COLLISION DETECTED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500">Vector Chunk A (Existing 2022 Policy)</div>
                <div className="text-slate-300">"Flat unverified $300/mo remote stipend disburse automatically."</div>
                <span className="text-[10px] text-rose-400 block pt-1">Status: Flagged for Pruning</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2">
                <div className="text-[10px] text-cyan-400">Vector Chunk B (Incoming 2026 Policy)</div>
                <div className="text-slate-200 font-bold">"Expense receipts mandatory up to max cap $150/mo internet allowance."</div>
                <span className="text-[10px] text-emerald-400 block pt-1">Status: Human Compliance Review</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3-Step Engine Section */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            How Semantic RAG Middleware Works
          </h2>
          <h3 className="text-3xl font-extrabold text-slate-100">
            3-Step Conflict-Aware Data Cleaning Engine
          </h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Prevent vector store drift and outdated policy indexing with automated parsing and human-in-the-loop reconciliation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1: Ingest */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg">
              01
            </div>
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              1. Multi-Modal Ingest
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Batch ingest native PDFs, DOCX, and scanned contract images. Apache Tika extracts clean text while Tesseract v5 OCR handles layout segmentation.
            </p>
            <div className="text-[10px] font-mono text-cyan-400 pt-2 border-t border-slate-800">
              RabbitMQ Backpressure Rate Meter
            </div>
          </div>

          {/* Step 2: Detect Conflicts */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-lg">
              02
            </div>
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              2. Detect Conflicts
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              MiniLM-L6-v2 generates 384-dim vector embeddings. Cosine collision checks flag 85%–97% semantic policy contradictions before database indexing.
            </p>
            <div className="text-[10px] font-mono text-amber-400 pt-2 border-t border-slate-800">
              LLM Contradiction Verdict Engine
            </div>
          </div>

          {/* Step 3: Clean Database */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
              03
            </div>
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              3. Clean Database
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compliance officers review side-by-side diffs. Execute one-click actions: Prune Legacy, Keep Existing, Discard Both, or Edit & Merge.
            </p>
            <div className="text-[10px] font-mono text-emerald-400 pt-2 border-t border-slate-800">
              PostgreSQL pgvector Commit
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Metrics Section */}
      <section id="metrics" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-slate-800/80 bg-slate-950/40">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-3xl font-extrabold text-cyan-400 font-mono">1.48M+</div>
            <div className="text-xs text-slate-400">Chunks Processed</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">342,100</div>
            <div className="text-xs text-slate-400">Exact Duplicates Pruned</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-3xl font-extrabold text-amber-400 font-mono">$14,820</div>
            <div className="text-xs text-slate-400">LLM API Cost Saved</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-1">
            <div className="text-3xl font-extrabold text-purple-400 font-mono">4.28 GB</div>
            <div className="text-xs text-slate-400">Vector RAM Saved</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Semantic RAG Middleware © 2026 • Enterprise Conflict-Aware Data Pruning Platform</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-400 hover:text-slate-200 cursor-pointer" onClick={() => navigate('/login')}>Login</span>
          <span className="text-slate-400 hover:text-slate-200 cursor-pointer" onClick={() => navigate('/dashboard')}>Dashboard</span>
        </div>
      </footer>
    </div>
  );
};
