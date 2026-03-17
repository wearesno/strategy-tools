import type { SheetKeyword, KeywordGroup } from '../types';

export function generateCsv(
  keywords: SheetKeyword[],
  groups: KeywordGroup[],
): string {
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  // Collect all unique year-months
  const monthSet = new Set<string>();
  keywords.forEach(kw =>
    kw.monthlySearchVolumes.forEach(v =>
      monthSet.add(`${v.year}-${String(v.month).padStart(2, '0')}`)
    )
  );
  const sortedMonths = [...monthSet].sort();

  const headers = ['Keyword', 'Group', 'Avg Monthly Searches', 'Competition', ...sortedMonths];

  const rows = keywords.map(kw => {
    const monthMap = new Map(
      kw.monthlySearchVolumes.map(v => [
        `${v.year}-${String(v.month).padStart(2, '0')}`,
        v.volume,
      ])
    );

    return [
      escapeCsvField(kw.keyword),
      escapeCsvField(kw.assignedGroupId ? (groupMap.get(kw.assignedGroupId) || 'Unknown') : 'Ungrouped'),
      kw.avgMonthlySearches,
      escapeCsvField(kw.competition),
      ...sortedMonths.map(m => monthMap.get(m) ?? ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
