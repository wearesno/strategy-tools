'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Project, DemandTrackerConfig, ClientData, KeywordGroupType } from '@/lib/types';
import { GROUP_TYPE_LABELS } from '@/lib/types';
import { aggregateByGroupAndMonth, computeSummaryStats } from '@/lib/utils';
import { generateCsv } from '@/lib/export/csv';
import { SummaryCards } from '@/components/charts/summary-cards';
import { SearchVolumeTrend } from '@/components/charts/search-volume-trend';
import { GroupComparisonBar } from '@/components/charts/group-comparison-bar';
import { ShareOfSearch } from '@/components/charts/share-of-search';
import { YoYComparison } from '@/components/charts/yoy-comparison';
import { KeywordTable } from '@/components/charts/keyword-table';
import {
  loadConfig as loadConfigFromClient,
  saveConfig as saveConfigToClient,
  loadData as loadDataFromClient,
  saveData as saveDataToClient,
} from '@/lib/client-store';

type Tab = 'trend' | 'comparison' | 'share' | 'yoy' | 'keywords';

export default function DemandTrackerDashboard() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [config, setConfig] = useState<DemandTrackerConfig | null>(null);
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('trend');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<KeywordGroupType | 'all'>('all');

  useEffect(() => {
    async function load() {
      // Load from client stores first (instant, survives Vercel cold starts)
      const [cachedConfig, cachedData] = await Promise.all([
        Promise.resolve(loadConfigFromClient(projectSlug)),
        loadDataFromClient(projectSlug),
      ]);

      // Always fetch project from API (small, needed for name)
      let proj: Project | null = null;
      try {
        const projRes = await fetch(`/api/projects/${projectSlug}`);
        proj = projRes.ok ? await projRes.json() : null;
      } catch {
        // API unavailable
      }

      // Use cached data if available, otherwise try API as fallback
      let cfg = cachedConfig;
      let kwData = cachedData;

      if (!cfg) {
        try {
          const cfgRes = await fetch(`/api/projects/${projectSlug}/demand-tracker/config`);
          if (cfgRes.ok) {
            cfg = await cfgRes.json();
            if (cfg) saveConfigToClient(projectSlug, cfg);
          }
        } catch {
          // API unavailable
        }
      }

      if (!kwData) {
        try {
          const dataRes = await fetch(`/api/projects/${projectSlug}/demand-tracker/sheets`);
          if (dataRes.ok) {
            kwData = await dataRes.json();
            if (kwData) await saveDataToClient(projectSlug, kwData);
          }
        } catch {
          // API unavailable
        }
      }

      setProject(proj);
      setConfig(cfg);
      setData(kwData);
      setLoading(false);
    }
    load();
  }, [projectSlug]);

  // Get unique group types present in config
  const groupTypes = useMemo(() => {
    if (!config) return [];
    return [...new Set(config.keywordGroups.map(g => g.type))];
  }, [config]);

  // Filter groups by type first, then by individual selection
  const typeFilteredGroups = useMemo(() => {
    if (!config) return [];
    if (selectedType === 'all') return config.keywordGroups;
    return config.keywordGroups.filter(g => g.type === selectedType);
  }, [config, selectedType]);

  const activeGroups = useMemo(() => {
    if (selectedGroupIds.length === 0) return typeFilteredGroups;
    return typeFilteredGroups.filter(g => selectedGroupIds.includes(g.id));
  }, [typeFilteredGroups, selectedGroupIds]);

  const filteredKeywords = useMemo(() => {
    if (!data) return [];
    const activeIds = new Set(activeGroups.map(g => g.id));
    return data.keywords.filter(kw => kw.assignedGroupId && activeIds.has(kw.assignedGroupId));
  }, [data, activeGroups]);

  const aggregates = useMemo(() => {
    if (!data || !config) return [];
    return aggregateByGroupAndMonth(filteredKeywords, activeGroups);
  }, [data, config, filteredKeywords, activeGroups]);

  const stats = useMemo(() => computeSummaryStats(aggregates), [aggregates]);

  // Share of Search: contextual based on selected type filter
  const shareOfSearchGroups = useMemo(() => {
    if (!config) return [];
    let groups: typeof config.keywordGroups;

    if (selectedType === 'product') {
      groups = config.keywordGroups.filter(g => g.type === 'product');
    } else if (selectedType === 'category') {
      groups = config.keywordGroups.filter(g => g.type === 'category');
    } else {
      groups = config.keywordGroups.filter(g => g.type === 'brand' || g.type === 'competitor');
    }

    if (selectedGroupIds.length > 0) {
      groups = groups.filter(g => selectedGroupIds.includes(g.id));
    }
    return groups;
  }, [config, selectedGroupIds, selectedType]);

  const shareOfSearchSubtitle = useMemo(() => {
    if (selectedType === 'product') return 'Each product line as % of total product search';
    if (selectedType === 'category') return 'Each category as % of total category search';
    return 'Brand vs competitors as % of total branded search';
  }, [selectedType]);

  const shareOfSearchKeywords = useMemo(() => {
    if (!data) return [];
    const ids = new Set(shareOfSearchGroups.map(g => g.id));
    return data.keywords.filter(kw => kw.assignedGroupId && ids.has(kw.assignedGroupId));
  }, [data, shareOfSearchGroups]);

  const shareOfSearchAggregates = useMemo(() => {
    if (!data || !config) return [];
    return aggregateByGroupAndMonth(shareOfSearchKeywords, shareOfSearchGroups);
  }, [data, config, shareOfSearchKeywords, shareOfSearchGroups]);

  const handleExportCsv = useCallback(() => {
    if (!data || !config || !project) return;
    const csv = generateCsv(data.keywords, config.keywordGroups);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.slug}-keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, config, project]);

  function toggleGroup(groupId: string) {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  }

  function selectType(type: KeywordGroupType | 'all') {
    setSelectedType(type);
    setSelectedGroupIds([]);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-bg-card rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-bg-card rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-bg-card rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!project || !config) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted mb-4">Demand Tracker not configured.</p>
        <Link href={`/${projectSlug}`} className="text-accent hover:text-accent-hover">Back to project</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b border-border-subtle bg-bg-card">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Demand Tracker</h1>
            {data && (
              <p className="text-xs text-text-muted mt-0.5">
                {data.keywords.length} keywords — Last updated: {new Date(data.fetchedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={!data}
              className="text-sm text-text-secondary hover:text-text-primary px-4 py-2 border border-border rounded-lg transition-colors disabled:opacity-50"
            >
              Export CSV
            </button>
            <Link
              href={`/${projectSlug}/demand-tracker/settings`}
              className="text-sm text-text-muted hover:text-text-secondary px-4 py-2 border border-border-subtle rounded-lg transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">
        {/* Type filter row */}
        {groupTypes.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted mr-1">View:</span>
            <button
              onClick={() => selectType('all')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                selectedType === 'all'
                  ? 'bg-accent text-bg-primary'
                  : 'bg-bg-card text-text-muted hover:text-text-secondary border border-border-subtle'
              }`}
            >
              All
            </button>
            {groupTypes.map(type => (
              <button
                key={type}
                onClick={() => selectType(type)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-card text-text-muted hover:text-text-secondary border border-border-subtle'
                }`}
              >
                {GROUP_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}

        {/* Group filter row — only shown when a specific type is selected */}
        {selectedType !== 'all' && typeFilteredGroups.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted mr-1">Groups:</span>
            {typeFilteredGroups.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  selectedGroupIds.length === 0 || selectedGroupIds.includes(g.id)
                    ? 'opacity-100'
                    : 'opacity-40'
                }`}
                style={{
                  backgroundColor: g.color + '20',
                  color: g.color,
                  borderWidth: 1,
                  borderColor: selectedGroupIds.includes(g.id) ? g.color : 'transparent',
                }}
              >
                {g.name} ({g.matchedKeywords.length})
              </button>
            ))}
            {selectedGroupIds.length > 0 && (
              <button
                onClick={() => setSelectedGroupIds([])}
                className="text-xs text-text-muted hover:text-text-secondary ml-2"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {!data ? (
          <div className="bg-bg-card rounded-xl p-12 border border-border-subtle text-center">
            <p className="text-text-muted mb-4">No keyword data loaded yet.</p>
            <Link
              href={`/${projectSlug}/demand-tracker/settings`}
              className="text-accent hover:text-accent-hover font-medium"
            >
              Go to settings to fetch sheet data
            </Link>
          </div>
        ) : (
          <>
            <SummaryCards stats={stats} />

            <div className="flex gap-1 border-b border-border">
              {([
                { key: 'trend', label: 'Trend' },
                { key: 'comparison', label: 'Comparison' },
                { key: 'share', label: 'Share of Search' },
                { key: 'yoy', label: 'Year-over-Year' },
                { key: 'keywords', label: 'Keywords' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'trend' && (
              <SearchVolumeTrend data={aggregates} groups={activeGroups} />
            )}
            {tab === 'comparison' && (
              <GroupComparisonBar data={aggregates.slice(-3)} groups={activeGroups} />
            )}
            {tab === 'share' && (
              <ShareOfSearch data={shareOfSearchAggregates} groups={shareOfSearchGroups} subtitle={shareOfSearchSubtitle} />
            )}
            {tab === 'yoy' && (
              <YoYComparison data={aggregates} />
            )}
            {tab === 'keywords' && (
              <KeywordTable
                keywords={filteredKeywords}
                groups={config.keywordGroups}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
