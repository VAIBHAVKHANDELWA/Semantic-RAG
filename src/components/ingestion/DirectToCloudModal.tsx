import React, { useState } from 'react';
import { 
  Cloud, 
  ArrowRight, 
  Key, 
  Server, 
  CheckCircle2, 
  Zap, 
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getUploadTicket } from '../../api/ingestion';
import type { UploadTicketResponse } from '../../types';
import { motion } from 'framer-motion';

interface DirectToCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectToCloudModal: React.FC<DirectToCloudModalProps> = ({ isOpen, onClose }) => {
  const { selectedTenant, user } = useApp();
  const [testFileName, setTestFileName] = useState('Enterprise_Q3_Financial_Audit_2026.pdf');
  const [testFileSizeMb, setTestFileSizeMb] = useState(48.5);
  const [activeTicket, setActiveTicket] = useState<UploadTicketResponse | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const cleanTenant = selectedTenant === 'ALL' ? 'HR' : selectedTenant;

  const handleGenerateTicket = async () => {
    try {
      const ticket = await getUploadTicket(testFileName, user?.token);
      setActiveTicket({
        ticketId: ticket.ticketId,
        presignedUrl: ticket.uploadUrl,
        s3Bucket: ticket.bucketName,
        s3Key: ticket.objectKey,
        expiresInSeconds: ticket.expiresInSeconds,
        tenantFolder: (ticket.tenantId as any) || cleanTenant,
        maxByteSize: 104857600
      });
      setStep(2);
    } catch (err) {
      console.error('Failed to generate real ticket from Gateway:', err);
    }
  };

  const handleSimulateDirectS3Put = async () => {
    if (!activeTicket) return;
    setStep(3);
    try {
      const sampleBlob = new Blob(["Enterprise Semantic RAG Direct-to-Cloud Verification Sample"], { type: "text/plain" });
      const resp = await fetch(activeTicket.presignedUrl, {
        method: 'PUT',
        body: sampleBlob,
        headers: { 'Content-Type': 'text/plain' }
      });
      if (resp.ok) {
        setStep(4);
      } else {
        console.error('Direct S3 PUT failed:', resp.status);
      }
    } catch (err) {
      console.error('Direct S3 PUT failed:', err);
    }
  };

  if (!isOpen) return null;

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
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Direct-to-Cloud Upload Handshake Simulator</h3>
              <p className="text-xs text-slate-400 font-mono">
                Zero-Copy Architecture • Bypassing Java Memory Heap (Zero OutOfMemory Risk)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Architectural Flow Bar */}
        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          <div className={`p-3 rounded-xl border text-center ${step >= 1 ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] text-slate-500 uppercase">Step 1</div>
            <div>POST /upload-ticket</div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${step >= 2 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] text-slate-500 uppercase">Step 2</div>
            <div>S3 Presigned URL</div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${step >= 3 ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] text-slate-500 uppercase">Step 3</div>
            <div>Direct Cloud PUT</div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${step >= 4 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] text-slate-500 uppercase">Step 4</div>
            <div>Spring Batch Event</div>
          </div>
        </div>

        {/* Step Interactive Details */}
        {step === 1 && (
          <div className="space-y-4 text-xs font-mono bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="text-slate-300 font-bold flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" /> React Frontend Handshake Request:
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1">Target Document Name:</label>
                <input
                  type="text"
                  value={testFileName}
                  onChange={e => setTestFileName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Payload Size (MB):</label>
                <input
                  type="number"
                  value={testFileSizeMb}
                  onChange={e => setTestFileSizeMb(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
              <span className="text-cyan-400 font-bold">Request Payload:</span> POST /api/v1/upload-ticket with JWT Tenant: <span className="text-amber-400 font-bold">{cleanTenant}</span>. Java backend verifies RBAC role <span className="text-purple-400 font-bold">{user?.role}</span> before contacting AWS S3 STS.
            </div>

            <button
              onClick={handleGenerateTicket}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <span>Issue AWS S3 Presigned Upload Ticket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step >= 2 && activeTicket && (
          <div className="space-y-4 text-xs font-mono bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Presigned URL Issued by Java API:
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Expires in {activeTicket.expiresInSeconds}s
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-amber-300 break-all select-all">
              {activeTicket.presignedUrl}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div>S3 Bucket: <span className="text-slate-200 font-bold">{activeTicket.s3Bucket}</span></div>
              <div>Tenant Vault: <span className="text-cyan-400 font-bold">{activeTicket.tenantFolder}</span></div>
            </div>

            {step === 2 && (
              <button
                onClick={handleSimulateDirectS3Put}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <span>Simulate Direct Stream PUT to AWS S3 (0 Java Heap Use)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step >= 3 && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400 animate-pulse" /> Direct S3 PUT Stream in progress: {(testFileSizeMb).toFixed(1)} MB transferred directly to AWS S3.
                </span>
              </div>
            )}

            {step === 4 && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> S3 ObjectCreated Webhook Trigger Fired!
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  AWS S3 notified Java Spring Batch API: <span className="text-cyan-300 font-mono">"ObjectCreated:Put for {activeTicket.s3Key}"</span>. Java started the Spring Batch worker job to chunk text and generate MiniLM embeddings.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  >
                    Test Another Handshake
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
