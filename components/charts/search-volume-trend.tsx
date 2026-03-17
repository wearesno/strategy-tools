'use client';

import { useRef, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { GroupMonthlyAggregate, KeywordGroup } from '@/lib/types';
import { ChartExportButton } from './chart-export-button';
import { formatNumber } from '@/lib/utils';

interface Props {
  data: GroupMonthlyAggregate[];
  groups: KeywordGroup[];
}

/** Simple least-squares linear regression. Returns slope & intercept. */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function SearchVolumeTrend({ data, groups }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Build base chart data with group volumes
  const chartData = useMemo(() => {
    const base = data.map(d => ({
      label: d.label,
      ...d.groups,
      total: d.total,
    }));

    // For groups with showTrendLine, compute linear regression and add trend values
    const trendGroups = groups.filter(g => g.showTrendLine);

    if (trendGroups.length === 0) return base;

    // Add trend line data points — only first and last points get values (straight line)
    for (const group of trendGroups) {
      const trendKey = `${group.id}_trend`;
      const values = data.map(d => d.groups[group.id] || 0);
      const { slope, intercept } = linearRegression(values);

      for (let i = 0; i < base.length; i++) {
        // Put values at every point so the line draws through the full range
        (base[i] as Record<string, unknown>)[trendKey] = Math.max(0, Math.round(intercept + slope * i));
      }
    }

    return base;
  }, [data, groups]);

  // Groups that have trend lines enabled
  const trendGroups = useMemo(() => groups.filter(g => g.showTrendLine), [groups]);

  return (
    <div ref={chartRef} className="bg-bg-card rounded-xl border border-border-subtle p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Search Volume Trend</h3>
        <ChartExportButton elementRef={chartRef} filename="search-volume-trend" />
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
            tickFormatter={v => formatNumber(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111111',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#FFFFFF', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: '#B8B8B8' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              // Filter out trend line entries
              const items = payload.filter((p: any) => !String(p.dataKey).endsWith('_trend'));
              if (items.length === 0) return null;
              return (
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                  fontSize: '12px',
                  padding: '10px 14px',
                }}>
                  <p style={{ color: '#FFFFFF', fontWeight: 600, marginBottom: 6 }}>{label}</p>
                  {items.map((item: any) => (
                    <p key={item.dataKey} style={{ color: item.color, margin: '3px 0' }}>
                      {item.name}: {formatNumber(item.value)}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#B8B8B8' }}
            // Filter out trend lines from legend
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...{ payload: groups.map(g => ({ value: g.name, type: 'line' as const, color: g.color, id: g.id })) } as any}
          />
          {/* Main data lines */}
          {groups.map(group => (
            <Line
              key={group.id}
              type="monotone"
              dataKey={group.id}
              name={group.name}
              stroke={group.color}
              strokeWidth={group.strokeWidth ?? 2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
          {/* Trend lines — dashed, 50% opacity, same colour */}
          {trendGroups.map(group => (
            <Line
              key={`${group.id}_trend`}
              type="monotone"
              dataKey={`${group.id}_trend`}
              name={`${group.name} (trend)`}
              stroke={group.color}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              strokeOpacity={0.5}
              dot={false}
              activeDot={false}
              legendType="none"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
