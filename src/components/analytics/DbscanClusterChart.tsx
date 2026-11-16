import React, { useState } from 'react';
import { 
  Network, 
  Sparkles 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { DbscanCluster } from '../../types';
import { motion } from 'framer-motion';

export const DbscanClusterChart: React.FC = () => {
  const { clusters, selectedClusterId, setSelectedClusterId, setSelectedConflictId, setActiveView } = useApp();
  const [hoveredCluster, setHoveredCluster] = useState<DbscanCluster | null>(null);

  const activeCluster = clusters.find(c => c.id === selectedClusterId) || hoveredCluster || clusters[0];

  if (!activeCluster || clusters.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-950 border border-slate-800 p-12 text-center text-slate-400">
        <Network className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">No Quarantined Clusters Discovered</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Unsupervised DBSCAN clustering analyzes quarantined chunks when collisions occur. No active topic clusters currently flagged.
        </p>
      </div>
    );
  }

  const handleClusterClick = (cluster: DbscanCluster) => {
    setSelectedClusterId(cluster.id);
  };

  const handleJumpToConflict = (conflictId: string) => {
    setSelectedConflictId(conflictId);
    setActiveView('quarantine');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Interactive 2D DBSCAN Scatter Canvas (8 Cols) */}
      <div className="lg:col-span-8 rounded-2xl bg-slate-950 border border-slate-800 p-6 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
        {/* Subtle coordinate grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-20 pointer-events-none" />

        {/* Canvas Top Bar */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              DBSCAN Semantic Topic Clusters (Auto-Discovered)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono">
            Epsilon: 0.15 • MinSamples: 12
          </span>
        </div>

        {/* Cluster Scatter Visualizer Nodes */}
        <div className="relative z-10 my-auto h-72 w-full flex items-center justify-center">
          {clusters.map((cluster) => {
            // Map -100 to 100 coords into percentage positions inside container
            const posX = 50 + (cluster.coordX * 0.4);
            const posY = 50 - (cluster.coordY * 0.4);

            const isSelected = activeCluster.id === cluster.id;

            const densityColors = {
              Critical: 'border-rose-500/60 bg-rose-500/15 text-rose-300 shadow-rose-500/20',
              High: 'border-amber-500/60 bg-amber-500/15 text-amber-300 shadow-amber-500/20',
              Medium: 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 shadow-cyan-500/20'
            };

            return (
              <motion.div
                key={cluster.id}
                style={{ left: `${posX}%`, top: `${posY}%` }}
                whileHover={{ scale: 1.12 }}
                onClick={() => handleClusterClick(cluster)}
                onMouseEnter={() => setHoveredCluster(cluster)}
                onMouseLeave={() => setHoveredCluster(null)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-3.5 rounded-full border-2 cursor-pointer transition-all duration-300 backdrop-blur-md shadow-xl flex flex-col items-center justify-center text-center ${
                  densityColors[cluster.density]
                } ${isSelected ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-slate-950 scale-110' : ''}`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-current animate-ping mb-1" />
                <span className="text-[10px] font-bold tracking-tight max-w-[100px] truncate leading-tight">
                  {cluster.name}
                </span>
                <span className="text-[9px] font-mono opacity-80 mt-0.5">
                  {cluster.sampleCount} vectors
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Canvas Footer */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Dimensionality Reduction: t-SNE 2D Embedding Projection</span>
          <span className="text-cyan-400">Click cluster bubble to inspect details →</span>
        </div>
      </div>

      {/* Cluster Inspector Side Card (4 Cols) */}
      <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Cluster Inspector</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
              {activeCluster.category}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100">{activeCluster.name}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{activeCluster.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Vector Sample Count</span>
                <span className="text-cyan-400 font-bold text-sm">{activeCluster.sampleCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Avg Cosine Sim</span>
                <span className="text-amber-400 font-bold text-sm">{(activeCluster.avgSimilarity * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Cluster Density</span>
                <span className="text-purple-400 font-bold text-xs">{activeCluster.density}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Flagged Conflicts</span>
                <span className="text-rose-400 font-bold text-xs">{activeCluster.conflictIds.length} active</span>
              </div>
            </div>

            {/* Linked Conflict Quick Jump Buttons */}
            {activeCluster.conflictIds.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Linked Quarantined Conflicts
                </div>
                <div className="space-y-1.5">
                  {activeCluster.conflictIds.map(confId => (
                    <button
                      key={confId}
                      onClick={() => handleJumpToConflict(confId)}
                      className="w-full p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left text-xs flex items-center justify-between text-slate-200 transition-colors"
                    >
                      <span className="font-mono text-cyan-400 text-[11px]">{confId}</span>
                      <span className="text-[10px] text-slate-400">Review Conflict →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
          Unsupervised DBSCAN algorithm groups high-similarity chunk vectors without pre-defined taxonomies.
        </div>
      </div>
    </div>
  );
};
