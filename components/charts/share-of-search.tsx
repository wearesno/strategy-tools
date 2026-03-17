'use client';

import { useRef, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { GroupMonthlyAggregate, KeywordGroup } from '@/lib/types';
import { ChartExportButton } from './chart-export-button';

interface Props {
  data: GroupMonthlyAggregate[];
  groups: KeywordGroup[];
  subtitle?: string;
}

export function ShareOfSearch({ data, groups, subtitle }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    return data.map(d => {
      const total = Object.values(d.groups).reduce((sum, v) => sum + v, 0);
      const percentages: Record<string, number> = {};

      for (const group of groups) {
        const volume = d.groups[group.id] || 0;
        percentages[group.id] = total > 0 ? Math.round((volume / total) * 1000) / 10 : 0;
      }

      return {
        label: d.label,
        ...percentages,
      };
    });
  }, [data, groups]);

  return (
    <div ref={chartRef} className="bg-bg-card rounded-xl border border-border-subtle p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-secondary">Share of Search</h3>
          <p className="text-xs text-text-muted mt-0.5">{subtitle || 'Brand vs competitors as % of total branded search'}</p>
        </div>
        <ChartExportButton elementRef={chartRef} filename="share-of-search" />
      </div>
      <ResponsiveContainer width="100%" height={450}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#888888', fontSize: 11 }}
            tickLine={{ stroke: '#2A2A2A' }}
            axisLine={{ stroke: '#2A2A2A' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#888888', fontSize: 11 }}
            tickLine={{ stroke: '#2A2A2A' }}
            axisLine={{ stroke: '#2A2A2A' }}
            tickFormatter={v => `${Math.round(v * 100)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111111',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#FFFFFF', fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, name: string) => {
              const group = groups.find(g => g.id === name);
              return [`${(value * 100).toFixed(1)}%`, group?.name || name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#B8B8B8' }}
            formatter={(value: string) => {
              const group = groups.find(g => g.id === value);
              return group?.name || value;
            }}
          />
          {groups.map(group => (
            <Area
              key={group.id}
              type="monotone"
              dataKey={group.id}
              name={group.id}
              stackId="1"
              fill={group.color}
              stroke={group.color}
              fillOpacity={0.8}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
