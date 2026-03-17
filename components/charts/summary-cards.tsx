'use client';

import type { SummaryStats, YoYMetric } from '@/lib/types';
import { formatNumber, formatPercent } from '@/lib/utils';

function yoyCard(label: string, metric: YoYMetric) {
  return {
    label,
    value: metric.percent !== null ? formatPercent(metric.percent) : '-',
    detail: metric.label,
    positive: metric.percent !== null ? metric.percent >= 0 : undefined,
  };
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  const cards: { label: string; value: string; detail: string; positive?: boolean }[] = [
    {
      label: 'Total Volume',
      value: formatNumber(stats.totalVolume),
      detail: `Avg ${formatNumber(stats.avgMonthlyVolume)}/mo`,
    },
    {
      label: 'MoM',
      value: formatPercent(stats.momPercent),
      detail: stats.momLabel,
      positive: stats.momPercent >= 0,
    },
    {
      label: 'Peak Month',
      value: stats.peakMonth,
      detail: formatNumber(stats.peakVolume) + ' searches',
    },
    yoyCard('YoY — Latest Month', stats.yoy1mo),
    yoyCard('YoY — Last 3 Months', stats.yoy3mo),
    yoyCard('YoY — Last 12 Months', stats.yoy12mo),
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-bg-card rounded-xl border border-border-subtle p-5"
        >
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-2">
            {card.label}
          </p>
          <p className={`text-2xl font-bold ${
            card.positive !== undefined
              ? card.positive ? 'text-success' : 'text-error'
              : 'text-text-primary'
          }`}>
            {card.value}
          </p>
          <p className="text-xs text-text-muted mt-1">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}
