import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Zap, 
  Activity, 
  Cpu, 
  FileSpreadsheet, 
  FileType,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { StatusBadge } from '../common/StatusBadge';
import { motion } from 'framer-motion';

export const IngestionHub: React.FC = () => {
  const { 
    ingestionQueue, 
    addIngestionFile, 
    removeIngestionItem, 
    selectedTenant, 
    telemetry 
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter queue items based on active tenant scope
  const filteredQueue = selectedTenant === 'ALL'
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
      Array.from(e.dataTransfer.files).forEach(file => {
        addIngestionFile(file);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        addIngestionFile(file);
      });
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
            Multi-Modal Ingestion Hub
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time document pipeline with automatic Apache Tika text extraction & Tesseract OCR parsing.
          </p>
        </div>

        {/* Modality Status Pills */}
        <div className="flex items-center gap-3">
          <StatusBadge status="native" label="Apache Tika (Native PDF/DOCX)" />
          <StatusBadge status="ocr" label="Tesseract v5 OCR Engine" />
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
              Drag & Drop Enterprise Documents Here
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Supports native PDFs, DOCX, scanned contract images, and regulatory policy mandates up to 100MB per file.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-blue-400" /> PDF / DOCX</span>
              <span className="flex items-center gap-1"><FileType className="w-3.5 h-3.5 text-purple-400" /> Scanned OCR</span>
              <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Policy Spreadsheets</span>
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
                status={telemetry.llmCircuitBreakerStatus === 'CLOSED' ? 'closed' : 'open'} 
                label={`CIRCUIT: ${telemetry.llmCircuitBreakerStatus}`}
              />
            </div>

            {/* RabbitMQ Worker Consumption Rate Meter */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> RabbitMQ Worker Rate
                  </span>
                  <span className="font-mono text-amber-300 font-bold">{telemetry.rabbitMqRate} msg/s</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500" 
                    style={{ width: `${Math.min(100, (telemetry.rabbitMqRate / 2000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* LLM Rate Limit Token Bucket */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" /> LLM Token Bucket Throughput
                  </span>
                  <span className="font-mono text-purple-300 font-bold">{telemetry.tokensPerSec.toLocaleString()} t/s</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                    style={{ width: `${Math.min(100, (telemetry.tokensPerSec / 20000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Auto-Throttling Threshold
            </span>
            <span className="font-mono text-emerald-400">NORMAL (0% Drop Rate)</span>
          </div>
        </GlassCard>
      </div>

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
