import type { SheetKeyword, MonthlySearchVolume, MergeStats } from './types';

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function parseMonthColumn(header: string): { year: number; month: number } | null {
  // Handles formats like "Oct 2024", "October 2024", "2024-10",
  // "Searches: Mar 2025" (Google Keyword Planner export format)
  let trimmed = header.trim().toLowerCase();

  // Strip common prefixes like "Searches: "
  trimmed = trimmed.replace(/^searches:\s*/i, '');

  // "Oct 2024" or "October 2024"
  const wordMatch = trimmed.match(/^([a-z]+)\s+(\d{4})$/);
  if (wordMatch) {
    const month = MONTH_MAP[wordMatch[1]];
    const year = parseInt(wordMatch[2]);
    if (month && year) return { year, month };
  }

  // "2024-10"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1]), month: parseInt(isoMatch[2]) };
  }

  return null;
}

function parseNumericValue(value: string): number {
  if (!value || value === '' || value === '-') return 0;
  // Remove commas, currency symbols, spaces
  const cleaned = value.replace(/[,$£€\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        row.push(current);
        current = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }
  // Last row
  row.push(current);
  if (row.length > 1 || row[0] !== '') rows.push(row);

  return rows;
}

export interface ParseResult {
  keywords: SheetKeyword[];
  monthColumns: string[];
  errors: string[];
}

export async function fetchAndParseSheet(sheetId: string, gid: string = '0'): Promise<ParseResult> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseSheetCSV(text);
}

export function parseSheetCSV(csvText: string): ParseResult {
  const rows = parseCSV(csvText);
  const errors: string[] = [];

  if (rows.length < 2) {
    return { keywords: [], monthColumns: [], errors: ['Sheet has no data rows'] };
  }

  // Auto-detect header row: find the first row containing "keyword" (case-insensitive)
  // Google Keyword Planner exports have title/date preamble rows before the actual headers
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const hasKeywordHeader = rows[i].some(cell =>
      cell.trim().toLowerCase() === 'keyword'
    );
    if (hasKeywordHeader) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rows[headerRowIndex].map(h => h.trim());

  // Find the keyword column (usually first, or labeled "Keyword")
  let keywordCol = headers.findIndex(h => h.toLowerCase() === 'keyword');
  if (keywordCol === -1) keywordCol = 0;

  // Find avg monthly searches column
  const avgCol = headers.findIndex(h =>
    h.toLowerCase().includes('avg') && h.toLowerCase().includes('search')
  );

  // Find competition columns
  const compCol = headers.findIndex(h => {
    const lower = h.toLowerCase();
    return lower === 'competition' || (lower.includes('competition') && !lower.includes('index'));
  });
  const compIndexCol = headers.findIndex(h =>
    h.toLowerCase().includes('competition') && h.toLowerCase().includes('index')
  );

  // Find bid columns
  const bidLowCol = headers.findIndex(h =>
    h.toLowerCase().includes('bid') && h.toLowerCase().includes('low')
  );
  const bidHighCol = headers.findIndex(h =>
    h.toLowerCase().includes('bid') && h.toLowerCase().includes('high')
  );

  // Find month columns (any header that parses as a month/year)
  const monthCols: { index: number; year: number; month: number; label: string }[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (i === keywordCol || i === avgCol || i === compCol || i === compIndexCol || i === bidLowCol || i === bidHighCol) continue;
    const parsed = parseMonthColumn(headers[i]);
    if (parsed) {
      monthCols.push({ index: i, ...parsed, label: headers[i] });
    }
  }

  // Sort month columns chronologically
  monthCols.sort((a, b) => a.year - b.year || a.month - b.month);

  const keywords: SheetKeyword[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const keyword = row[keywordCol]?.trim();
    if (!keyword) continue;

    const monthlySearchVolumes: MonthlySearchVolume[] = monthCols.map(mc => ({
      year: mc.year,
      month: mc.month,
      volume: parseNumericValue(row[mc.index] || ''),
    }));

    keywords.push({
      keyword,
      avgMonthlySearches: avgCol >= 0 ? parseNumericValue(row[avgCol] || '') : 0,
      competition: compCol >= 0 ? (row[compCol]?.trim() || '') : '',
      competitionIndex: compIndexCol >= 0 ? parseNumericValue(row[compIndexCol] || '') : 0,
      topOfPageBidLow: bidLowCol >= 0 ? parseNumericValue(row[bidLowCol] || '') : 0,
      topOfPageBidHigh: bidHighCol >= 0 ? parseNumericValue(row[bidHighCol] || '') : 0,
      monthlySearchVolumes,
      assignedGroupId: null,
    });
  }

  if (monthCols.length === 0) {
    errors.push('No month columns detected. Expected headers like "Oct 2024", "Nov 2024", etc.');
  }

  return {
    keywords,
    monthColumns: monthCols.map(mc => mc.label),
    errors,
  };
}

// ─── Multi-Source Merge & Deduplication ────────────────────────────────────────

export interface SourceParseResult {
  sourceId: string;
  label: string;
  result: ParseResult;
}

export interface MergedResult {
  keywords: SheetKeyword[];
  monthColumns: string[];
  mergeStats: MergeStats;
  errors: string[];
}

/**
 * Merge keywords from multiple sheet sources with deduplication.
 * Same keyword across sheets (case-insensitive) is kept once — first occurrence wins.
 * Month volumes from later sources are merged in if the first source lacked those months.
 */
export function mergeAndDeduplicateKeywords(sources: SourceParseResult[]): MergedResult {
  const keywordMap = new Map<string, SheetKeyword>();
  const allErrors: string[] = [];
  const allMonthKeys = new Set<string>();
  const perSource: MergeStats['perSource'] = [];

  for (const source of sources) {
    const { result, sourceId, label } = source;
    let uniqueContributed = 0;

    allErrors.push(...result.errors.map(e => `[${label}] ${e}`));

    // Track month columns by year-month key for dedup
    for (const kw of result.keywords) {
      for (const mv of kw.monthlySearchVolumes) {
        allMonthKeys.add(`${mv.year}-${mv.month}`);
      }
    }

    for (const kw of result.keywords) {
      const key = kw.keyword.toLowerCase();

      if (keywordMap.has(key)) {
        // Duplicate: merge month volumes the existing entry doesn't have
        const existing = keywordMap.get(key)!;
        const existingMonths = new Set(
          existing.monthlySearchVolumes.map(v => `${v.year}-${v.month}`)
        );
        for (const mv of kw.monthlySearchVolumes) {
          if (!existingMonths.has(`${mv.year}-${mv.month}`)) {
            existing.monthlySearchVolumes.push(mv);
          }
        }
        existing.monthlySearchVolumes.sort(
          (a, b) => a.year - b.year || a.month - b.month
        );
      } else {
        keywordMap.set(key, { ...kw, monthlySearchVolumes: [...kw.monthlySearchVolumes] });
        uniqueContributed++;
      }
    }

    perSource.push({
      sourceId,
      label,
      rawCount: result.keywords.length,
      uniqueContributed,
    });
  }

  const keywords = Array.from(keywordMap.values());
  const totalBeforeDedup = sources.reduce((sum, s) => sum + s.result.keywords.length, 0);

  // Build normalized month column labels sorted chronologically
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthColumns = Array.from(allMonthKeys)
    .map(k => { const [y, m] = k.split('-').map(Number); return { year: y, month: m }; })
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(({ year, month }) => `${MONTH_LABELS[month - 1]} ${year}`);

  return {
    keywords,
    monthColumns,
    mergeStats: {
      totalBeforeDedup,
      totalAfterDedup: keywords.length,
      duplicatesRemoved: totalBeforeDedup - keywords.length,
      perSource,
    },
    errors: allErrors,
  };
}
