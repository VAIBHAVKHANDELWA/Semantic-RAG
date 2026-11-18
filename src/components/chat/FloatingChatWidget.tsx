import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldCheck,
  Zap,
  Database,
  X,
  Minus,
  Building2,
  Globe
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
    tenantId?: string;
  } | null;
  pendingQuarantineBadge?: string | null;
  cacheHit?: boolean;
  latencyMs?: number;
  llmMode?: string;
}

const DEPARTMENT_SUGGESTIONS: Record<string, string[]> = {
  HR: [
    'How many days can employees work from home?',
    'What are the limits for Routine Operational Approvals?',
    'What is the annual overtime compensation cap?',
    'What is the employee referral bonus payout amount?',
  ],
  FINANCE: [
    'What is the threshold for dual approval on capital expenditure?',
    'What is the corporate credit card and travel expense policy?',
    'What is the revenue recognition compliance standard?',
    'List policies in Finance',
  ],
  LEGAL: [
    'What is the mandatory data retention period for customer PII?',
    'Who is authorized to sign non-standard vendor NDAs?',
    'What is the SLA for regulatory data breach notification?',
    'List policies in Legal',
  ],
  ENGINEERING: [
    'What are the engineering governance tiers for SSDLC?',
    'What is the cloud infrastructure deployment standard?',
    'What is the incident response paging SLA?',
    'List policies in Engineering',
  ],
  ALL: [
    'What is the platform status and health overview?',
    'How many policies are active in each department?',
    'What are the limits for Routine Operational Approvals?',
    'Are there any pending conflicts in quarantine?',
  ],
};

export const FloatingChatWidget: React.FC = () => {
  const { user, conflicts } = useApp();

  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const defaultTenant = isSystemAdmin ? 'ALL' : (user?.tenant || 'HR');

  const [isOpen, setIsOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<string>(defaultTenant);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync active scope when user or selected tenant changes
  useEffect(() => {
    if (!isSystemAdmin) {
      setActiveScope(user?.tenant || 'HR');
    }
  }, [user, isSystemAdmin]);

  // Initial welcome message per scope
  useEffect(() => {
    const scopeLabel = activeScope === 'ALL' ? 'Global Enterprise Policies & Platform' : `${activeScope} Department`;
    setMessages([
      {
        id: 'welcome-init',
        sender: 'assistant',
        text: `Hello! I am your **Policy & Platform Intelligence Assistant**.\n\nI have real-time access to the verified in-force policies in **PostgreSQL pgvector** for **${scopeLabel}** (15 policies per role, status = 'ACTIVE').\n\nHow may I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        llmMode: 'Extractive AI',
      },
    ]);
  }, [activeScope]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const pendingConflictsCount = conflicts.filter((c) => {
    if (c.status !== 'PENDING') return false;
    if (activeScope === 'ALL' || activeScope === 'GLOBAL') return true;
    return c.tenantId === activeScope || (c.department as string) === activeScope;
  }).length;

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
        tenantId: activeScope,
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
      console.error('Chat error:', err);
      setErrorToast(err?.message || 'Failed to query policy database. Please verify connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    const scopeLabel = activeScope === 'ALL' ? 'Global Enterprise Policies' : `${activeScope} Department`;
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. Ready for new questions regarding **${scopeLabel}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        llmMode: 'Extractive AI',
      },
    ]);
  };

  const suggestions = DEPARTMENT_SUGGESTIONS[activeScope] || DEPARTMENT_SUGGESTIONS.ALL;

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* FLOATING TRIGGER PILL (BOTTOM RIGHT CORNER)                   */}
      {/* ------------------------------------------------------------- */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3">
          {/* Friendly prompt bubble */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center space-x-2 bg-slate-900/95 hover:bg-slate-800 text-slate-200 px-4 py-2.5 rounded-full border border-emerald-500/30 shadow-xl shadow-emerald-950/40 cursor-pointer backdrop-blur-md group transition-all"
          >
            <span className="text-sm font-medium text-slate-100 group-hover:text-emerald-300 transition-colors">
              How may I help you?
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </motion.div>

          {/* Floating Action Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            aria-label="Open Policy AI Chat"
            className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 p-0.5 shadow-2xl shadow-emerald-500/30 flex items-center justify-center cursor-pointer group"
          >
            <div className="w-full h-full rounded-full bg-slate-950/80 group-hover:bg-slate-950/50 flex items-center justify-center transition-all backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-emerald-400 group-hover:text-cyan-300 transition-colors" />
            </div>

            {/* Badge for pending quarantine updates */}
            {pendingConflictsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] shadow-md border-2 border-slate-950 animate-bounce">
                {pendingConflictsCount}
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FLOATING CHAT WINDOW (BOTTOM RIGHT OVERLAY)                   */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-[420px] sm:w-[470px] h-[640px] max-h-[88vh] bg-slate-950/95 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-md shadow-emerald-500/20 shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-bold text-slate-100 truncate">Policy AI Assistant</h3>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1 text-cyan-300">
                      {activeScope === 'ALL' ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      <span className="font-semibold">{activeScope === 'ALL' ? 'Global Admin' : activeScope}</span>
                    </span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono text-[10px]">15 Policies/Role</span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Admin Scope Switcher Bar (Only if System Admin) */}
            {isSystemAdmin && (
              <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] font-medium">Department Scope:</span>
                <div className="flex items-center space-x-1">
                  {(['ALL', 'HR', 'FINANCE', 'LEGAL', 'ENGINEERING'] as const).map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setActiveScope(dept)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        activeScope === dept
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Quarantine Notice (Outside the answer) */}
            {pendingConflictsCount > 0 && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-300 shrink-0">
                <div className="flex items-center space-x-1.5 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {pendingConflictsCount} pending update{pendingConflictsCount > 1 ? 's' : ''} in quarantine (not used in answers)
                  </span>
                </div>
                <span className="text-amber-400/80 font-mono text-[10px] shrink-0 ml-2">status = 'ACTIVE'</span>
              </div>
            )}

            {/* Error Banner */}
            {errorToast && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs text-rose-300 shrink-0">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{errorToast}</span>
                </div>
                <button onClick={() => setErrorToast(null)} className="text-rose-400 hover:text-rose-200 text-xs">
                  Dismiss
                </button>
              </div>
            )}

            {/* Chat Messages Scroll Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none text-xs leading-relaxed'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none text-xs'
                    }`}
                  >
                    {/* Header line for bot messages */}
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center justify-between space-x-2 mb-2 pb-1 border-b border-slate-800/80 text-[10px] text-slate-400">
                        <span className="font-semibold text-emerald-400">Policy RAG Engine</span>
                        <div className="flex items-center space-x-1.5 font-mono">
                          {msg.cacheHit && (
                            <span className="px-1 py-0.2 bg-purple-500/20 text-purple-300 rounded flex items-center space-x-0.5">
                              <Zap className="w-2.5 h-2.5 inline" />
                              <span>Cache</span>
                            </span>
                          )}
                          {msg.latencyMs !== undefined && <span>{msg.latencyMs}ms</span>}
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    )}

                    {/* Message Body */}
                    {msg.sender === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <ChatMarkdown content={msg.text} />
                    )}

                    {/* In Force Policy Citation */}
                    {msg.policyInForce && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center space-x-1.5 text-[11px] text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate">
                          Policy in force: <strong>{msg.policyInForce.docName}</strong> v{msg.policyInForce.version} ({msg.policyInForce.effectiveDate})
                        </span>
                      </div>
                    )}

                    {/* Pending Quarantine Notice inside bot message */}
                    {msg.pendingQuarantineBadge && (
                      <div className="mt-1.5 text-[10px] text-amber-300/80 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{msg.pendingQuarantineBadge}</span>
                      </div>
                    )}

                    {/* Sources Expandable Accordion */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-800/60">
                        <button
                          onClick={() =>
                            setExpandedSources((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                          }
                          className="flex items-center justify-between w-full text-[10px] text-slate-400 hover:text-slate-200 transition-colors py-0.5"
                        >
                          <span className="flex items-center space-x-1 font-medium">
                            <Database className="w-3 h-3 text-cyan-400" />
                            <span>Sources Verified ({msg.sources.length} active chunk{msg.sources.length > 1 ? 's' : ''})</span>
                          </span>
                          {expandedSources[msg.id] ? (
                            <ChevronUp className="w-3 h-3 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>

                        {expandedSources[msg.id] && (
                          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {msg.sources.map((src, idx) => (
                              <div
                                key={src.chunkId || idx}
                                className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-300"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-cyan-300 truncate max-w-[180px]">
                                    {src.docName}
                                  </span>
                                  <div className="flex items-center space-x-1.5 font-mono text-[9px]">
                                    <span className="bg-slate-800 text-slate-300 px-1 py-0.2 rounded">
                                      v{src.version}
                                    </span>
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded">
                                      {Math.round(src.similarity * 100)}%
                                    </span>
                                  </div>
                                </div>
                                <blockquote className="border-l-2 border-cyan-500/40 pl-1.5 italic text-slate-400 text-[10px] line-clamp-3">
                                  "{src.snippet}"
                                </blockquote>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-pulse">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs text-slate-300 flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-1 text-slate-400 font-mono text-[11px]">Searching active policy chunks...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Question Chips */}
            <div className="px-3.5 py-2 bg-slate-900/60 border-t border-slate-800/80 shrink-0">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <span className="text-slate-400 text-[10px] font-semibold whitespace-nowrap flex items-center space-x-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Suggested:</span>
                </span>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    disabled={isLoading}
                    className="px-2.5 py-0.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-full border border-slate-700/60 whitespace-nowrap transition-colors text-[10px] shrink-0 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
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
                  placeholder={`Ask a question for ${activeScope === 'ALL' ? 'all departments' : activeScope}...`}
                  disabled={isLoading}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/70 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputQuery.trim() || isLoading}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs flex items-center space-x-1 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <span>Ask</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1 text-[9px] text-slate-400">
                <span className="font-mono">PostgreSQL pgvector (HNSW)</span>
                <span className="text-emerald-400/80">Deterministic Extractive AI</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
