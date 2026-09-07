import React from 'react';
import { Upload, Sparkles, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onUploadClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Enterprise Documents Queued",
  description = "Drag and drop unstructured PDF, DOCX, or scanned contract documents to start detecting semantic conflicts.",
  onUploadClick
}) => {
  const { addIngestionFile } = useApp();

  const handleSampleAdd = (fileName: string) => {
    const mockFile = new File(['Sample enterprise policy content'], fileName, { type: 'application/pdf' });
    addIngestionFile(mockFile);
  };

  return (
    <div className="p-12 text-center rounded-3xl bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-slate-700 transition-all max-w-2xl mx-auto space-y-6 my-8 relative overflow-hidden">
      {/* Pulsing Glow Center Icon */}
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-xl animate-pulse" />
        <div 
          onClick={onUploadClick}
          className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/10 hover:scale-105 transition-all relative z-10"
        >
          <Upload className="w-8 h-8" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{description}</p>
      </div>

      {/* Quick Sample Dataset Ingestion Buttons */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Or load sample B2B conflict datasets
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            onClick={() => handleSampleAdd('HR_Remote_Work_Policy_2026.pdf')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 flex items-center gap-1.5 transition-colors font-mono"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + HR Remote Policy
          </button>
          <button
            onClick={() => handleSampleAdd('EU_IP_Assignment_2026.pdf')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 flex items-center gap-1.5 transition-colors font-mono"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + EU Legal Addendum
          </button>
          <button
            onClick={() => handleSampleAdd('SRE_Incident_Playbook_v4.pdf')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 flex items-center gap-1.5 transition-colors font-mono"
          >
            <PlusCircle className="w-3.5 h-3.5" /> + SRE On-Call SLA
          </button>
        </div>
      </div>
    </div>
  );
};
