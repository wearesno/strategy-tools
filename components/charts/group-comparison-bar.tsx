'use client';

import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { GroupMonthlyAggregate, KeywordGroup } from '@/lib/types';
import { ChartExportButton } from './chart-export-button';
import { formatNumber } from '@/lib/utils';

interface Props {
  data: GroupMonthlyAggregate[];
  groups: KeywordGroup[];
}

export function GroupComparisonBar({ data, groups }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Sum totals per group across the provided months
  const groupTotals = groups.map(g => {
    const total = data.reduce((sum, d) => sum + (d.groups[g.id] || 0), 0);
    return { name: g.name, total, color: g.color, id: g.id };
  });

  // Build subtitle from the data range
  const rangeLabel = data.length > 0
    ? data.length === 1
      ? data[0].label
      : `${data[0].label} – ${data[data.length - 1].label}`
    : '';

  return (
    <div ref={chartRef} className="bg-bg-card rounded-xl border border-border-subtle p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-secondary">Group Comparison</h3>
          {rangeLabel && (
            <p className="text-xs text-text-muted mt-0.5">{rangeLabel}</p>
          )}
        </div>
        <ChartExportButton elementRef={chartRef} filename="group-comparison" />
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={groupTotals} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#888888', fontSize: 11 }}
            tickLine={{ stroke: '#2A2A2A' }}
            axisLine={{ stroke: '#2A2A2A' }}
          />
          <YAxis
            tick={{ fill: '#888888', fontSize: 11 }}
            tickLine={{ stroke: '#2A2A2A' }}
            axisLine={{ stroke: '#2A2A2A' }}
            tickFormatter={v => formatNumber(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111111',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [formatNumber(value as number), 'Total Volume']}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {groupTotals.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
