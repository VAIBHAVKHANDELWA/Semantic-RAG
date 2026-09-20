import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Copy, 
  X, 
  Code2, 
  Brain,
  Check
} from 'lucide-react';
import type { QuarantineConflict } from '../../types';
import { motion } from 'framer-motion';

interface LlmAdjudicatorModalProps {
  conflict?: QuarantineConflict | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LlmAdjudicatorModal: React.FC<LlmAdjudicatorModalProps> = ({ conflict, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const defaultConflict = conflict || {
    id: 'conf-8901',
    similarityScore: 0.894,
    department: 'HR',
    verdictType: 'CONTRADICTORY',
    contradictionExplanation: 'The 2026 framework establishes a 2-day mandatory in-office requirement, whereas the 2022 policy granted 100% full remote flexibility without office attendance.',
    temporalSummary: 'Incoming Chunk B is 4 years newer and supersedes the 2022 policy baseline.',
    existingChunk: {
      id: 'chunk-a-2022',
      docName: 'HR_Remote_Work_Policy_2022.pdf',
      docYear: 2022,
      author: 'Legacy HR Team',
      uploadDate: '2022-04-12',
      text: 'Employees may work remotely 100% of the time with zero mandatory office attendance requirement.',
      tenantId: 'HR',
      embeddingId: 'vec-77a8-4491-b01',
      vectorPreview: [0.12, -0.45, 0.89],
      tokenCount: 148
    },
    incomingChunk: {
      id: 'chunk-b-2026',
      docName: 'Global_Remote_Work_Framework_2026.pdf',
      docYear: 2026,
      author: 'Sarah Jenkins (VP People)',
      uploadDate: '2026-09-07',
      text: 'All staff must attend the local hub 2 days per week unless granted an executive medical exemption.',
      tenantId: 'HR',
      embeddingId: 'vec-99f2-1088-c44',
      vectorPreview: [0.14, -0.42, 0.91],
      tokenCount: 162
    },
    status: 'PENDING',
    createdAt: '2026-09-17 18:42:15'
  };

  const systemPrompt = `You are a strict Enterprise RAG Data Governance AI.
Analyze Chunk A (Existing Vector DB Policy) and Chunk B (Incoming Policy Candidate).
Perform deep logical conflict adjudication:
1. Determine if Chunk B contradicts, supersedes, or duplicates Chunk A.
2. Calculate temporal policy hierarchy based on creation dates.
3. Output strict JSON with schema:
{
  "conflict": boolean,
  "verdictType": "CONTRADICTORY" | "SUPERSIDING_POLICY" | "PARTIAL_UPDATE" | "DUPLICATE_PRUNE",
  "contradictionExplanation": string,
  "temporalSummary": string
}`;

  const userPrompt = `[TENANT SCOPE: ${defaultConflict.department}]

--- EXISTING CHUNK A (Year ${defaultConflict.existingChunk.docYear}, Vector ID: ${defaultConflict.existingChunk.embeddingId}) ---
"${defaultConflict.existingChunk.text}"

--- INCOMING CHUNK B (Year ${defaultConflict.incomingChunk.docYear}, Vector ID: ${defaultConflict.incomingChunk.embeddingId}) ---
"${defaultConflict.incomingChunk.text}"

Adjudicate logical contradiction and output governance JSON.`;

  const jsonResponse = JSON.stringify({
    conflict: true,
    verdictType: defaultConflict.verdictType,
    contradictionExplanation: defaultConflict.contradictionExplanation,
    temporalSummary: defaultConflict.temporalSummary,
    metadata: {
      tenantId: defaultConflict.department,
      cosineSimilarity: defaultConflict.similarityScore,
      actionRequired: "HUMAN_QUARANTINE_REVIEW"
    }
  }, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>LLM Adjudicator Prompt & Response Inspector</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                  GPT-4o-mini / Llama 3
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Stage 3 Conflict Adjudication Engine • 384 Tokens Evaluated
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Construction Grid */}
        <div className="space-y-4 text-xs font-mono max-h-[480px] overflow-y-auto pr-1">
          {/* System Prompt Box */}
          <div className="space-y-1">
            <div className="text-slate-400 font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> System Governance Prompt:
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap">
              {systemPrompt}
            </div>
          </div>

          {/* User Input Prompt Box */}
          <div className="space-y-1">
            <div className="text-slate-400 font-bold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-amber-400" /> User Evaluation Context Payload:
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap">
              {userPrompt}
            </div>
          </div>

          {/* Raw JSON Response Output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" /> Adjudicator Output JSON Response:
              </span>
              <button
                onClick={handleCopyJson}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 whitespace-pre-wrap glow-emerald">
              {jsonResponse}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
