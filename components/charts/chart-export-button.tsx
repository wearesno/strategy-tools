'use client';

import { RefObject, useState } from 'react';
import { exportChartAsPng } from '@/lib/export/png';

interface Props {
  elementRef: RefObject<HTMLDivElement | null>;
  filename: string;
}

export function ChartExportButton({ elementRef, filename }: Props) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!elementRef.current) return;
    setExporting(true);
    try {
      await exportChartAsPng(elementRef.current, filename);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
    >
      {exporting ? 'Exporting...' : 'Download PNG'}
    </button>
  );
}
