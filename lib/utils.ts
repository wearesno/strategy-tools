import type { SheetKeyword, KeywordGroup, GroupMonthlyAggregate, SummaryStats, YoYMetric, MonthlySearchVolume } from './types';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function shortMonthLabel(month: number): string {
  return MONTH_NAMES[month - 1];
}

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ─── Data Aggregation ────────────────────────────────────────────────────────

export function aggregateByGroupAndMonth(
  keywords: SheetKeyword[],
  groups: KeywordGroup[],
  startYear?: number,
  startMonth?: number,
  endYear?: number,
  endMonth?: number,
): GroupMonthlyAggregate[] {
  const groupMap = new Map<string, KeywordGroup>();
  groups.forEach(g => groupMap.set(g.id, g));

  const monthMap = new Map<string, GroupMonthlyAggregate>();

  for (const kw of keywords) {
    if (!kw.assignedGroupId) continue;
    if (!groupMap.has(kw.assignedGroupId)) continue;

    for (const mv of kw.monthlySearchVolumes) {
      if (startYear && startMonth) {
        if (mv.year < startYear || (mv.year === startYear && mv.month < startMonth)) continue;
      }
      if (endYear && endMonth) {
        if (mv.year > endYear || (mv.year === endYear && mv.month > endMonth)) continue;
      }

      const key = `${mv.year}-${mv.month}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          year: mv.year,
          month: mv.month,
          label: monthLabel(mv.year, mv.month),
          groups: {},
          total: 0,
        });
      }

      const agg = monthMap.get(key)!;
      const groupId = kw.assignedGroupId;
      agg.groups[groupId] = (agg.groups[groupId] || 0) + mv.volume;
      agg.total += mv.volume;
    }
  }

  return Array.from(monthMap.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );
}

function computeRangeYoY(aggregates: GroupMonthlyAggregate[], rangeSize: number): YoYMetric {
  if (aggregates.length < rangeSize) {
    return { percent: null, label: '-' };
  }

  const recentSlice = aggregates.slice(-rangeSize);
  const recentSum = recentSlice.reduce((sum, a) => sum + a.total, 0);

  // Find the same months one year earlier
  const priorSlice: GroupMonthlyAggregate[] = [];
  for (const month of recentSlice) {
    const prior = aggregates.find(a => a.year === month.year - 1 && a.month === month.month);
    if (prior) priorSlice.push(prior);
  }

  if (priorSlice.length < rangeSize) {
    // Not enough prior-year data
    const first = recentSlice[0];
    const last = recentSlice[recentSlice.length - 1];
    const rangeLabel = rangeSize === 1
      ? `${last.label} vs ${last.label.replace(/\d{4}/, String(last.year - 1))}`
      : `${first.label}–${last.label} vs prior year`;
    return { percent: null, label: rangeLabel };
  }

  const priorSum = priorSlice.reduce((sum, a) => sum + a.total, 0);
  const first = recentSlice[0];
  const last = recentSlice[recentSlice.length - 1];

  const percent = priorSum > 0 ? ((recentSum - priorSum) / priorSum) * 100 : null;

  const label = rangeSize === 1
    ? `${last.label} vs ${priorSlice[0].label}`
    : `${first.label}–${last.label} vs prior year`;

  return { percent, label };
}

export function computeSummaryStats(
  aggregates: GroupMonthlyAggregate[],
): SummaryStats {
  const nullYoY: YoYMetric = { percent: null, label: '-' };

  if (aggregates.length === 0) {
    return {
      totalVolume: 0,
      avgMonthlyVolume: 0,
      momPercent: 0,
      momLabel: '-',
      yoy1mo: nullYoY,
      yoy3mo: nullYoY,
      yoy12mo: nullYoY,
      peakMonth: '-',
      peakVolume: 0,
    };
  }

  const totalVolume = aggregates.reduce((sum, a) => sum + a.total, 0);
  const avgMonthlyVolume = Math.round(totalVolume / aggregates.length);

  // MoM: compare last two months
  let momPercent = 0;
  let momLabel = '-';
  if (aggregates.length >= 2) {
    const last = aggregates[aggregates.length - 1];
    const prev = aggregates[aggregates.length - 2];
    momPercent = prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : 0;
    momLabel = `${last.label} vs ${prev.label}`;
  }

  // YoY at three windows
  const yoy1mo = computeRangeYoY(aggregates, 1);
  const yoy3mo = computeRangeYoY(aggregates, 3);
  const yoy12mo = computeRangeYoY(aggregates, 12);

  // Peak month
  const peak = aggregates.reduce((max, a) => (a.total > max.total ? a : max), aggregates[0]);

  return {
    totalVolume,
    avgMonthlyVolume,
    momPercent,
    momLabel,
    yoy1mo,
    yoy3mo,
    yoy12mo,
    peakMonth: peak.label,
    peakVolume: peak.total,
  };
}

export function getDateRange(keywords: SheetKeyword[]): { min: MonthlySearchVolume; max: MonthlySearchVolume } | null {
  let min: MonthlySearchVolume | null = null;
  let max: MonthlySearchVolume | null = null;

  for (const kw of keywords) {
    for (const mv of kw.monthlySearchVolumes) {
      if (!min || mv.year < min.year || (mv.year === min.year && mv.month < min.month)) {
        min = mv;
      }
      if (!max || mv.year > max.year || (mv.year === max.year && mv.month > max.month)) {
        max = mv;
      }
    }
  }

  return min && max ? { min, max } : null;
}
