import React from 'react';
import type { ChunkMetadata, RbacTenant, TenantScope } from '../../types';
import { SideBySideDiff } from './SideBySideDiff';
import { FinanceDiffViewer } from './FinanceDiffViewer';
import { CodeDiffViewer } from './CodeDiffViewer';

interface ConflictViewerProps {
  existingChunk: ChunkMetadata;
  incomingChunk: ChunkMetadata;
  tenant?: RbacTenant | TenantScope | string;
}

export const ConflictViewer: React.FC<ConflictViewerProps> = ({ 
  existingChunk, 
  incomingChunk, 
  tenant 
}) => {
  // Normalize tenant string (e.g., 'FINANCE', 'ENGINEERING', 'HR', 'LEGAL')
  const effectiveTenant = (tenant || incomingChunk.tenantId || '').toUpperCase();

  if (effectiveTenant === 'FINANCE') {
    return <FinanceDiffViewer existingChunk={existingChunk} incomingChunk={incomingChunk} />;
  }

  if (effectiveTenant === 'ENGINEERING') {
    return <CodeDiffViewer existingChunk={existingChunk} incomingChunk={incomingChunk} />;
  }

  // Default: Standard side-by-side text diff for HR, Legal, Marketing, etc.
  return <SideBySideDiff existingChunk={existingChunk} incomingChunk={incomingChunk} />;
};
