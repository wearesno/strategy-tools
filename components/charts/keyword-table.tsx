'use client';

import { useState, useMemo } from 'react';
import type { SheetKeyword, KeywordGroup } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface Props {
  keywords: SheetKeyword[];
  groups: KeywordGroup[];
}

type SortKey = 'keyword' | 'group' | 'lastMonth' | 'priorYear' | 'change';
type SortDir = 'asc' | 'desc';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getLastMonthVolume(kw: SheetKeyword): number {
  const vols = kw.monthlySearchVolumes;
  if (!vols || vols.length === 0) return 0;
  return vols[vols.length - 1].volume;
}

function getPriorYearVolume(kw: SheetKeyword): number | null {
  const vols = kw.monthlySearchVolumes;
  if (!vols || vols.length === 0) return null;
  const last = vols[vols.length - 1];
  const priorYear = last.year - 1;
  const match = vols.find(v => v.year === priorYear && v.month === last.month);
  return match ? match.volume : null;
}

function getYoYChange(kw: SheetKeyword): number | null {
  const current = getLastMonthVolume(kw);
  const prior = getPriorYearVolume(kw);
  if (prior === null || prior === 0) return null;
  if (current === 0 && prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function getLastMonthLabel(keywords: SheetKeyword[]): string {
  for (const kw of keywords) {
    const vols = kw.monthlySearchVolumes;
    if (vols && vols.length > 0) {
      const last = vols[vols.length - 1];
      return `${MONTH_NAMES[last.month - 1]} ${last.year}`;
    }
  }
  return 'Last Month';
}

function getPriorYearLabel(keywords: SheetKeyword[]): string {
  for (const kw of keywords) {
    const vols = kw.monthlySearchVolumes;
    if (vols && vols.length > 0) {
      const last = vols[vols.length - 1];
      return `${MONTH_NAMES[last.month - 1]} ${last.year - 1}`;
    }
  }
  return 'Prior Year';
}

export function KeywordTable({ keywords, groups }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('lastMonth');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const groupMap = useMemo(
    () => new Map(groups.map(g => [g.id, g])),
    [groups]
  );

  const lastMonthLabel = useMemo(() => getLastMonthLabel(keywords), [keywords]);
  const priorYearLabel = useMemo(() => getPriorYearLabel(keywords), [keywords]);

  const filteredAndSorted = useMemo(() => {
    let filtered = keywords;

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(kw => kw.keyword.toLowerCase().includes(lower));
    }

    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'keyword':
          return dir * a.keyword.localeCompare(b.keyword);
        case 'group': {
          const gA = a.assignedGroupId ? (groupMap.get(a.assignedGroupId)?.name || '') : 'zzz';
          const gB = b.assignedGroupId ? (groupMap.get(b.assignedGroupId)?.name || '') : 'zzz';
          return dir * gA.localeCompare(gB);
        }
        case 'lastMonth':
          return dir * (getLastMonthVolume(a) - getLastMonthVolume(b));
        case 'priorYear':
          return dir * ((getPriorYearVolume(a) ?? 0) - (getPriorYearVolume(b) ?? 0));
        case 'change':
          return dir * ((getYoYChange(a) ?? -Infinity) - (getYoYChange(b) ?? -Infinity));
        default:
          return 0;
      }
    });
  }, [keywords, groupMap, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 text-xs text-text-muted font-medium uppercase tracking-wider hover:text-text-secondary"
      >
        {label}
        {sortKey === field && (
          <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle">
      <div className="p-4 border-b border-border">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search keywords..."
          className="w-full max-w-xs bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3"><SortHeader label="Keyword" field="keyword" /></th>
              <th className="text-left px-4 py-3"><SortHeader label="Group" field="group" /></th>
              <th className="text-right px-4 py-3"><SortHeader label={lastMonthLabel} field="lastMonth" /></th>
              <th className="text-right px-4 py-3"><SortHeader label={priorYearLabel} field="priorYear" /></th>
              <th className="text-right px-4 py-3"><SortHeader label="% Change" field="change" /></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.slice(0, 100).map((kw, i) => {
              const group = kw.assignedGroupId ? groupMap.get(kw.assignedGroupId) : null;
              const lastVol = getLastMonthVolume(kw);
              const priorVol = getPriorYearVolume(kw);
              const change = getYoYChange(kw);
              return (
                <tr key={`${kw.keyword}-${i}`} className="border-b border-border-subtle hover:bg-bg-card-hover transition-colors">
                  <td className="px-4 py-2.5 text-sm text-text-primary">{kw.keyword}</td>
                  <td className="px-4 py-2.5">
                    {group ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: group.color + '20', color: group.color }}
                      >
                        {group.name}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">Ungrouped</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-secondary text-right">
                    {formatNumber(lastVol)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted text-right">
                    {priorVol !== null ? formatNumber(priorVol) : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium">
                    {change !== null ? (
                      <span className={change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-text-muted'}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length > 100 && (
        <p className="text-xs text-text-muted text-center py-3">
          Showing 100 of {filteredAndSorted.length} keywords
        </p>
      )}
    </div>
  );
}
