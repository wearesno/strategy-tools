'use client';

import { useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { GroupMonthlyAggregate } from '@/lib/types';
import { ChartExportButton } from './chart-export-button';
import { formatNumber, shortMonthLabel } from '@/lib/utils';

interface Props {
  data: GroupMonthlyAggregate[];
}

export function YoYComparison({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Get the two most recent years in the data
  const years = [...new Set(data.map(d => d.year))].sort();
  const currentYear = years[years.length - 1];
  const previousYear = years.length > 1 ? years[years.length - 2] : null;

  // Build chart data aligned on month
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const currentData = data.find(d => d.year === currentYear && d.month === month);
    const prevData = previousYear ? data.find(d => d.year === previousYear && d.month === month) : null;

    const currentVal = currentData?.total || 0;
    const prevVal = prevData?.total || 0;
    // Only calculate change when both years have actual data
    const change = (prevVal > 0 && currentVal > 0) ? ((currentVal - prevVal) / prevVal) * 100 : null;

    return {
      month: shortMonthLabel(month),
      monthNum: month,
      [String(currentYear)]: currentVal,
      ...(previousYear ? { [String(previousYear)]: prevVal } : {}),
      change,
    } as Record<string, string | number | null>;
  });

  // Filter to only months that have data
  const tableData = chartData.filter(d => {
    const cur = d[String(currentYear)] as number;
    const prev = previousYear ? (d[String(previousYear)] as number) : 0;
    return cur > 0 || prev > 0;
  });

  return (
    <div className="space-y-6">
      <div ref={chartRef} className="bg-bg-card rounded-xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Year-over-Year Comparison</h3>
          <ChartExportButton elementRef={chartRef} filename="yoy-comparison" />
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis
              dataKey="month"
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
              formatter={(value, name) => [formatNumber(value as number), name as string]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#B8B8B8' }} />
            <Line
              type="monotone"
              dataKey={String(currentYear)}
              name={String(currentYear)}
              stroke="#FBDB1E"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            {previousYear && (
              <Line
                type="monotone"
                dataKey={String(previousYear)}
                name={String(previousYear)}
                stroke="#888888"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* YoY Monthly Breakdown Table */}
      {previousYear && tableData.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-subtle">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-text-secondary">Monthly YoY Breakdown</h3>
            <p className="text-xs text-text-muted mt-0.5">Search volume by month with year-over-year change</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Month</th>
                  <th className="text-right px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">{previousYear}</th>
                  <th className="text-right px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">{currentYear}</th>
                  <th className="text-right px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Change</th>
                  <th className="px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider w-32">Trend</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(row => {
                  const curVal = row[String(currentYear)] as number;
                  const prevVal = row[String(previousYear)] as number;
                  const change = row.change as number | null;

                  // Bar width relative to the max change in the dataset
                  const maxAbsChange = Math.max(
                    ...tableData
                      .map(d => Math.abs(d.change as number || 0))
                      .filter(v => isFinite(v))
                  );
                  const barWidth = change !== null && maxAbsChange > 0
                    ? Math.min(Math.abs(change) / maxAbsChange * 100, 100)
                    : 0;

                  return (
                    <tr key={row.month} className="border-b border-border-subtle hover:bg-bg-card-hover transition-colors">
                      <td className="px-4 py-2.5 text-sm text-text-primary font-medium">{row.month}</td>
                      <td className="px-4 py-2.5 text-sm text-text-muted text-right">{prevVal > 0 ? formatNumber(prevVal) : '-'}</td>
                      <td className="px-4 py-2.5 text-sm text-text-primary text-right">{curVal > 0 ? formatNumber(curVal) : '-'}</td>
                      <td className="px-4 py-2.5 text-sm text-right">
                        {change !== null && prevVal > 0 ? (
                          <span className={change >= 0 ? 'text-success' : 'text-error'}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {change !== null && prevVal > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${change >= 0 ? 'bg-success' : 'bg-error'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
