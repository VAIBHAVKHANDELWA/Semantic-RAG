import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Table, 
  Calculator,
  ShieldAlert
} from 'lucide-react';
import type { ChunkMetadata } from '../../types';

interface FinanceDiffViewerProps {
  existingChunk: ChunkMetadata;
  incomingChunk: ChunkMetadata;
}

export const FinanceDiffViewer: React.FC<FinanceDiffViewerProps> = ({ existingChunk, incomingChunk }) => {
  // Mock tabular spreadsheet representation of conflicting financial parameters
  const financialRows = [
    {
      item: 'Long-Haul Flight Business Class Cap',
      baseline: 'Continuous > 8 Hours',
      proposed: 'Continuous > 5 Hours',
      unit: 'Flight Hours',
      variance: '-37.5%',
      impact: 'INCREASED_EXPENSE',
      risk: 'HIGH'
    },
    {
      item: 'Domestic Flight Upgrade Policy',
      baseline: 'Economy Class Only',
      proposed: 'Premium Economy (> 3 hrs)',
      unit: 'Tier Cap',
      variance: '+1 Class Tier',
      impact: 'INCREASED_EXPENSE',
      risk: 'MEDIUM'
    },
    {
      item: 'International Daily Meal Per Diem',
      baseline: '$75.00 / day',
      proposed: '$110.00 / day',
      unit: 'USD / Day',
      variance: '+$35.00 (+46.6%)',
      impact: 'INCREASED_EXPENSE',
      risk: 'MEDIUM'
    },
    {
      item: 'CapEx Approval Threshold (VP Signoff)',
      baseline: '$10,000 max',
      proposed: '$25,000 max',
      unit: 'USD Cap',
      variance: '+$15,000 (+150.0%)',
      impact: 'AUDIT_ANOMALY',
      risk: 'CRITICAL'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top Financial Audit Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 font-mono">Corporate_Travel_Per_Diem_Caps_Q3.docx</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                FINANCE / AUDIT GRID
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
              <span>Auditor: Elena Rostova (Head of Finance)</span>
              <span>•</span>
              <span>Numerical Anomaly Score: 91.8%</span>
            </div>
          </div>
        </div>

        {/* Audit Variance Summary Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">Total Variance Alert:</span>
          <span className="text-amber-400 font-bold">+46.6% Average Cap Increase</span>
        </div>
      </div>

      {/* Financial Spreadsheet Grid Component */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs shadow-xl">
        {/* Table Header Controls */}
        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <Table className="w-4 h-4 text-cyan-400" />
            <span>Financial Parameter Comparison Matrix (2022 vs 2026)</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
              Red: High Variance
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Amber: Audit Anomaly
            </span>
          </div>
        </div>

        {/* Stylized Spreadsheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Financial Policy Line Item</th>
                <th className="py-3 px-4">Existing Baseline (2022)</th>
                <th className="py-3 px-4">Proposed Target (2026)</th>
                <th className="py-3 px-4">Variance / Delta</th>
                <th className="py-3 px-4 text-right">Audit Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {financialRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  {/* Line Item */}
                  <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{row.item}</span>
                  </td>

                  {/* Baseline */}
                  <td className="py-3.5 px-4 text-slate-400 bg-slate-900/20">
                    <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                      {row.baseline}
                    </span>
                  </td>

                  {/* Proposed */}
                  <td className="py-3.5 px-4 text-cyan-300 bg-cyan-500/5">
                    <span className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                      {row.proposed}
                    </span>
                  </td>

                  {/* Variance */}
                  <td className="py-3.5 px-4 font-bold">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                      row.risk === 'CRITICAL' || row.risk === 'HIGH' 
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {row.risk === 'CRITICAL' ? <TrendingUp className="w-3 h-3 text-rose-400" /> : <TrendingDown className="w-3 h-3 text-amber-400" />}
                      {row.variance}
                    </span>
                  </td>

                  {/* Audit Risk Badge */}
                  <td className="py-3.5 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                      row.risk === 'CRITICAL'
                        ? 'bg-rose-500 text-slate-950 animate-pulse'
                        : row.risk === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {row.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Spreadsheet Footer Summary */}
        <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Compliance Warning: Auto-approval blocked due to CapEx escalation limit.</span>
          </div>
          <div className="text-cyan-400 font-bold">
            Baseline ID: {existingChunk.id} → Proposed ID: {incomingChunk.id}
          </div>
        </div>
      </div>
    </div>
  );
};
