// ─── Project (top-level entity) ──────────────────────────────────────────────

export interface Project {
  slug: string;
  name: string;
  tools: ProjectToolConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectToolConfig {
  toolId: ToolId;
  enabled: boolean;
  addedAt: string;
}

export type ToolId = 'demand-tracker';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  href: (projectSlug: string) => string;
}

// ─── Demand Tracker Configuration ────────────────────────────────────────────

export interface SheetSource {
  id: string;
  label: string;
  sheetUrl: string;
  sheetId: string;
  gid?: string;
  lastFetchedAt: string | null;
  keywordCount: number;
}

export interface DemandTrackerConfig {
  projectSlug: string;
  sheetUrl: string;       // Legacy — synced from sheetSources[0]
  sheetId: string;        // Legacy — synced from sheetSources[0]
  sheetSources: SheetSource[];
  keywordGroups: KeywordGroup[];
  parsedAt: string | null;
}

export interface MergeStats {
  totalBeforeDedup: number;
  totalAfterDedup: number;
  duplicatesRemoved: number;
  perSource: { sourceId: string; label: string; rawCount: number; uniqueContributed: number }[];
}

// ─── Legacy (kept for backward compat during migration) ──────────────────────

export interface ClientConfig {
  slug: string;
  clientName: string;
  sheetUrl: string;
  sheetId: string;
  keywordGroups: KeywordGroup[];
  parsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordGroup {
  id: string;
  name: string;
  color: string;
  type: KeywordGroupType;
  seedTerms: string[];
  excludeTerms: string[];
  matchedKeywords: string[];
  strokeWidth?: number;
  showTrendLine?: boolean;
}

export type KeywordGroupType = 'brand' | 'competitor' | 'category' | 'product' | 'custom';

// ─── Sheet Data (parsed from Google Sheets export) ───────────────────────────

export interface SheetKeyword {
  keyword: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  topOfPageBidLow: number;
  topOfPageBidHigh: number;
  monthlySearchVolumes: MonthlySearchVolume[];
  assignedGroupId: string | null;
}

export interface MonthlySearchVolume {
  year: number;
  month: number;
  volume: number;
}

// ─── Parsed Client Data (stored after sheet fetch) ───────────────────────────

export interface ClientData {
  clientSlug: string;
  keywords: SheetKeyword[];
  fetchedAt: string;
  monthColumns: string[];
}

// ─── Aggregated Types (for charts) ───────────────────────────────────────────

export interface GroupMonthlyAggregate {
  year: number;
  month: number;
  label: string;
  groups: Record<string, number>;
  total: number;
}

export interface YoYMetric {
  percent: number | null;
  label: string;
}

export interface SummaryStats {
  totalVolume: number;
  avgMonthlyVolume: number;
  momPercent: number;
  momLabel: string;
  yoy1mo: YoYMetric;
  yoy3mo: YoYMetric;
  yoy12mo: YoYMetric;
  peakMonth: string;
  peakVolume: number;
}

// ─── Filter State ────────────────────────────────────────────────────────────

export interface DashboardFilters {
  dateRange: {
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
  };
  selectedGroupIds: string[];
}

// ─── Group Type Config ───────────────────────────────────────────────────────

export const GROUP_TYPE_LABELS: Record<KeywordGroupType, string> = {
  brand: 'Brand',
  competitor: 'Competitor',
  category: 'Category',
  product: 'Product',
  custom: 'Custom',
};

export const DEFAULT_GROUP_COLORS: Record<KeywordGroupType, string> = {
  brand: '#FBDB1E',
  competitor: '#E53935',
  category: '#4CAF50',
  product: '#2196F3',
  custom: '#9C27B0',
};

export const CHART_COLORS = [
  '#FBDB1E', '#E53935', '#4CAF50', '#2196F3', '#9C27B0',
  '#FF9800', '#00BCD4', '#E91E63', '#8BC34A', '#FF5722',
];
