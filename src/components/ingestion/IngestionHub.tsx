import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Zap, 
  Activity, 
  Cpu, 
  FileType,
  RefreshCw,
  Sliders,
  Cloud,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { DirectToCloudModal } from './DirectToCloudModal';
import { BatchIngestionTracker } from './BatchIngestionTracker';
import { motion } from 'framer-motion';

export const IngestionHub: React.FC = () => {
  const { 
    ingestionQueue, 
    createBatchJob,
    toggleBackpressureThrottling,
    isThrottled,
    removeIngestionItem, 
    selectedTenant, 
    telemetry 
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter queue items based on active tenant scope
  const filteredQueue = selectedTenant === 'ALL' || selectedTenant === 'GLOBAL'
    ? ingestionQueue
    : ingestionQueue.filter(i => i.department === selectedTenant);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      createBatchJob(droppedFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      createBatchJob(selectedFiles);
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'INGESTING': return '1. Ingesting Stream';
      case 'CHUNK_ADAPTIVE': return '2. Adaptive Chunking';
      case 'EMBEDDING': return '3. Vector Embedding';
      case 'COLLISION_CHECK': return '4. Cosine Collision Check';
      case 'IN_VECTOR_DB': return '5. Committed to Vector DB';
      case 'QUARANTINED': return 'Quarantined (Collision Flagged)';
      default: return stage;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            Stage 2: Enterprise Ingestion & Real-Time Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Zero-copy Direct-to-Cloud S3 Presigned URL streaming, asynchronous multi-file dropzone, pre-flight OCR modality detection, and Server-Sent Events (SSE) telemetry.
          </p>
        </div>

        {/* Action Buttons for Stage 2 Features */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 transition-all shadow-md shadow-cyan-500/10"
          >
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>Inspect S3 Presigned Ticket Handshake</span>
          </button>

          <button
            onClick={toggleBackpressureThrottling}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 border transition-all ${
              isThrottled 
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>{isThrottled ? 'Throttled: Reset Circuit Breaker' : 'Simulate OpenAI Rate Limit Backpressure'}</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Top Widgets (Dropzone + Circuit Breaker) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag and Drop Dropzone */}
        <div className="lg:col-span-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
              isDragging 
                ? 'border-cyan-400 bg-cyan-500/10 glow-cyan' 
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              multiple 
              className="hidden" 
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
            />
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-500/10 mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              Drag & Drop Enterprise Document Batches Here (Up to 10,000 PDFs)
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Direct-to-Cloud architecture streams files straight to tenant S3 bucket via presigned tickets, bypassing Java backend memory.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1 text-cyan-400 font-bold"><FileText className="w-3.5 h-3.5" /> PDF / DOCX (Native Tika)</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold"><FileType className="w-3.5 h-3.5" /> Scanned OCR (Tesseract Warning)</span>
            </div>
          </div>
        </div>

        {/* Right Col: Backpressure & LLM Circuit Breaker Widget */}
        <GlassCard className="flex flex-col justify-between border-slate-800/80">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Backpressure & Worker Control</span>
              </div>
              <StatusBadge 
                status={isThrottled ? 'pending' : 'closed'} 
                label={`CIRCUIT: ${isThrottled ? 'OPEN (THROTTLED)' : 'CLOSED (NORMAL)'}`}
              />
            </div>

            {/* RabbitMQ Worker Consumption Rate Meter */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> RabbitMQ Worker Rate
                  </span>
                  <span className="font-mono text-amber-300 font-bold">{isThrottled ? '42 msg/s (Throttled)' : `${telemetry.rabbitMqRate} msg/s`}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isThrottled ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`} 
                    style={{ width: `${isThrottled ? 15 : Math.min(100, (telemetry.rabbitMqRate / 2000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* LLM Rate Limit Token Bucket */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" /> LLM Token Bucket Throughput
                  </span>
                  <span className="font-mono text-purple-300 font-bold">{isThrottled ? '1,200 t/s (Queued)' : `${telemetry.tokensPerSec.toLocaleString()} t/s`}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                    style={{ width: `${isThrottled ? 10 : Math.min(100, (telemetry.tokensPerSec / 20000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Auto-Throttling Threshold
            </span>
            <span className={`font-mono font-bold ${isThrottled ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isThrottled ? 'THROTTLED (Queue Active)' : 'NORMAL (0% Drop Rate)'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Stage 2 Real-Time SSE Batch Tracker */}
      <BatchIngestionTracker />

      {/* Direct-to-Cloud Presigned URL Handshake Modal */}
      <DirectToCloudModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Ingestion Queue Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <h3 className="text-sm font-bold text-slate-200">
              Live Pipeline Queue ({filteredQueue.length} items)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Target Collection: <span className="text-cyan-400 font-bold">b2b_policies_vector_v4</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4">Document / File Name</th>
                <th className="py-3 px-4">Modality</th>
                <th className="py-3 px-4">Dept / Author</th>
                <th className="py-3 px-4">Upload Time</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQueue.map(item => (
                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                  {/* File Name & Size */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate max-w-xs">{item.fileName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.fileSize} • {item.chunkCount} chunks</div>
                  </td>

                  {/* Modality Badge */}
                  <td className="py-3.5 px-4">
                    {item.modality === 'OCR_TESSERACT' ? (
                      <StatusBadge status="ocr" label="OCR (Tesseract v5)" />
                    ) : (
                      <StatusBadge status="native" label="Native (Apache Tika)" />
                    )}
                  </td>

                  {/* Dept & Author */}
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                      {item.department}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">{item.author}</div>
                  </td>

                  {/* Upload Timestamp */}
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {item.uploadTimestamp}
                  </td>

                  {/* Stage */}
                  <td className="py-3.5 px-4">
                    <span className={`font-semibold ${
                      item.stage === 'QUARANTINED' ? 'text-amber-400' :
                      item.stage === 'IN_VECTOR_DB' ? 'text-emerald-400' : 'text-cyan-400'
                    }`}>
                      {getStageLabel(item.stage)}
                    </span>
                  </td>

                  {/* Progress Bar */}
                  <td className="py-3.5 px-4 w-44">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full ${
                            item.stage === 'QUARANTINED' ? 'bg-amber-400' :
                            item.stage === 'IN_VECTOR_DB' ? 'bg-emerald-400' : 'bg-cyan-400'
                          }`} 
                          animate={{ width: `${item.progressPercentage}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{item.progressPercentage}%</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => removeIngestionItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Cancel Ingestion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
