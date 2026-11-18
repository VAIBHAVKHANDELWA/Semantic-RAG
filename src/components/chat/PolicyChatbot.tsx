import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareText,
  Send,
  Sparkles,
  Bot,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Zap,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { askPolicyRAG, type ChatResponse, type PolicySource } from '../../api/chat';
import { ChatMarkdown } from './ChatMarkdown';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: PolicySource[];
  policyInForce?: {
    docName: string;
    version: string;
    effectiveDate: string;
  } | null;
  pendingQuarantineBadge?: string | null;
  cacheHit?: boolean;
  latencyMs?: number;
  llmMode?: string;
}

const TENANT_SUGGESTIONS: Record<string, string[]> = {
  HR: [
    'How many days can employees work from home?',
    'What is the annual overtime cap?',
    'How much is the employee referral bonus?',
    'What is the standard probation period length?',
  ],
  FINANCE: [
    'What is the threshold for dual approval on capital expenditure?',
    'What is the expense report filing deadline?',
    'What is the international business travel per diem allowance?',
    'What is the corporate credit card reconciliation policy?',
  ],
  LEGAL: [
    'What is the mandatory data retention period for customer PII?',
    'Who is authorized to sign non-standard vendor NDAs?',
    'What is the incident SLA for regulatory data breach notification?',
    'What are the cross-border data transfer compliance rules?',
  ],
  ENGINEERING: [
    'What is the mandatory unit test coverage threshold for production code?',
    'What is the MTTR SLA for P1 production incidents?',
    'Who has write access to production database clusters?',
    'What is the staging deployment approval policy?',
  ],
};

export const PolicyChatbot: React.FC = () => {
  const { selectedTenant, user, conflicts } = useApp();
  const tenantKey = (selectedTenant === 'ALL' || !selectedTenant) ? (user?.tenant || 'HR') : selectedTenant;

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [auditMode, setAuditMode] = useState(false);
  const [asOfDate, setAsOfDate] = useState('');
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pendingConflictsCount = conflicts.filter(
    (c) => c.status === 'PENDING' && (c.tenantId === tenantKey || (c.department as string) === tenantKey)
  ).length;

  useEffect(() => {
    // Initial welcome message per tenant
    setMessages([
      {
        id: 'welcome-0',
        sender: 'assistant',
        text: `Welcome to the ${tenantKey} Policy Intelligence Portal. I answer strictly from active, in-force corporate policies verified in pgvector. Content from quarantined amendments or archived versions is permanently excluded from retrieval.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        llmMode: 'Extractive AI',
      },
    ]);
  }, [tenantKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);
    setErrorToast(null);

    try {
      const response: ChatResponse = await askPolicyRAG(q, {
        tenantId: tenantKey,
        asOfDate: auditMode && asOfDate ? asOfDate : undefined,
      });

      const assistantMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
        policyInForce: response.policyInForce,
        pendingQuarantineBadge: response.pendingQuarantineBadge,
        cacheHit: response.cacheHit,
        latencyMs: response.latencyMs,
        llmMode: response.llmMode,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Policy chat query failed:', err);
      setErrorToast(err?.message || 'Failed to query active policy index. Please verify service health.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. Asking queries strictly against active ${tenantKey} policies.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        llmMode: 'Extractive AI',
      },
    ]);
  };

  const suggestions = TENANT_SUGGESTIONS[tenantKey] || TENANT_SUGGESTIONS.HR;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <MessageSquareText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-slate-100">Ask the Policies (RAG)</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE ONLY
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Tenant: {tenantKey}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict deterministic answers from verified vector chunks • No hallucination, no stale versions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Audit Time-Travel Mode Toggle */}
          <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-medium">Audit Date Filter</span>
            <input
              type="checkbox"
              checked={auditMode}
              onChange={(e) => setAuditMode(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            {auditMode && (
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5 ml-1 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Quarantine Notice (Outside the answer text) */}
      {pendingConflictsCount > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Notice:</strong> {pendingConflictsCount} pending amendment{pendingConflictsCount > 1 ? 's' : ''} currently held in Quarantine Queue. These are <em>isolated</em> and will not appear in answers until promoted by a Data Steward.
            </span>
          </div>
          <span className="text-amber-400/80 font-mono text-[11px]">status = 'ACTIVE' enforced</span>
        </div>
      )}

      {/* Error Toast */}
      {errorToast && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="text-rose-400 hover:text-rose-200 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between space-x-3 mb-1.5 text-[11px] opacity-75">
                  <span className="font-semibold tracking-wide">
                    {msg.sender === 'user' ? (user?.name || 'Data Steward') : 'Policy RAG Engine'}
                  </span>
                  <div className="flex items-center space-x-2">
                    {msg.llmMode && (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[10px] border border-emerald-500/30">
                        {msg.llmMode}
                      </span>
                    )}
                    {msg.cacheHit && (
                      <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono text-[10px] flex items-center space-x-1">
                        <Zap className="w-2.5 h-2.5 inline" />
                        <span>Cache</span>
                      </span>
                    )}
                    {msg.latencyMs !== undefined && (
                      <span className="text-slate-400 font-mono text-[10px]">{msg.latencyMs}ms</span>
                    )}
                    <span className="text-slate-400">{msg.timestamp}</span>
                  </div>
                </div>

                {/* Body Text */}
                {msg.sender === 'user' ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                    {msg.text}
                  </div>
                ) : (
                  <ChatMarkdown content={msg.text} />
                )}

                {/* Policy in force Citation Line */}
                {msg.policyInForce && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center space-x-2 text-xs text-emerald-400/90 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>
                      Policy in force: <strong>{msg.policyInForce.docName}</strong> v{msg.policyInForce.version}, effective {msg.policyInForce.effectiveDate}
                    </span>
                  </div>
                )}

                {/* Pending quarantine notice under message */}
                {msg.pendingQuarantineBadge && (
                  <div className="mt-2 text-[11px] text-amber-300/80 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{msg.pendingQuarantineBadge}</span>
                  </div>
                )}

                {/* Sources Accordion */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => toggleSources(msg.id)}
                      className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
                    >
                      <span className="flex items-center space-x-1.5 font-medium">
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Sources Verified ({msg.sources.length} active chunk{msg.sources.length > 1 ? 's' : ''})</span>
                      </span>
                      {expandedSources[msg.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {expandedSources[msg.id] && (
                      <div className="mt-2 space-y-2">
                        {msg.sources.map((src, idx) => (
                          <div
                            key={src.chunkId || idx}
                            className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300"
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-cyan-300 truncate max-w-xs">
                                {src.docName}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                  v{src.version}
                                </span>
                                <span className="text-slate-400 text-[10px] font-mono">
                                  {src.effectiveDate}
                                </span>
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                  {Math.round(src.similarity * 100)}% Match
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mb-1">
                              Chunk ID: {src.chunkId}
                            </div>
                            <blockquote className="border-l-2 border-cyan-500/50 pl-2 italic text-slate-300/90 text-xs">
                              "{src.snippet}"
                            </blockquote>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-300 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 text-slate-400 font-mono">Scanning PostgreSQL pgvector (status = 'ACTIVE')...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Chips */}
      <div className="px-6 py-2.5 bg-slate-900/40 border-t border-slate-800/60">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-xs font-semibold whitespace-nowrap flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Suggested:</span>
          </span>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(suggestion)}
              disabled={isLoading}
              className="px-3 py-1 bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full border border-slate-700/60 whitespace-nowrap transition-colors text-xs font-normal disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center space-x-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask any policy question for ${tenantKey} (e.g. WFH rules, caps, allowances)...`}
            disabled={isLoading}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/70 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
          />
        </div>
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isLoading}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <span>Ask</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
