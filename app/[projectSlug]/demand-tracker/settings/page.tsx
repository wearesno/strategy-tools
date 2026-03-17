'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { DemandTrackerConfig, KeywordGroup, KeywordGroupType, SheetSource } from '@/lib/types';
import { CHART_COLORS } from '@/lib/types';
import { generateId, extractSheetId } from '@/lib/utils';

export default function DemandTrackerSettingsPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [config, setConfig] = useState<DemandTrackerConfig | null>(null);
  const [tab, setTab] = useState<'sheets' | 'groups' | 'data'>('sheets');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string>('');

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}/demand-tracker/config`)
      .then(r => r.ok ? r.json() : null)
      .then(setConfig);
  }, [projectSlug]);

  const saveConfig = useCallback(async (updates: Partial<DemandTrackerConfig>) => {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectSlug}/demand-tracker/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setConfig(updated);
    setSaving(false);
  }, [projectSlug]);

  async function handleFetchSheet() {
    setFetching(true);
    setFetchResult('');
    try {
      const res = await fetch(`/api/projects/${projectSlug}/demand-tracker/sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const stats = data.mergeStats;
        if (stats && stats.totalBeforeDedup !== stats.totalAfterDedup) {
          setFetchResult(
            `Fetched ${stats.totalAfterDedup.toLocaleString()} unique keywords ` +
            `(${stats.duplicatesRemoved.toLocaleString()} duplicates removed) ` +
            `across ${data.monthColumns?.length || 0} months.`
          );
        } else {
          setFetchResult(
            `Fetched ${data.keywords?.length?.toLocaleString() || 0} keywords ` +
            `across ${data.monthColumns?.length || 0} months.`
          );
        }
        // Refresh config
        const configRes = await fetch(`/api/projects/${projectSlug}/demand-tracker/config`);
        setConfig(await configRes.json());
      } else {
        setFetchResult(`Error: ${data.error}`);
      }
    } catch {
      setFetchResult('Failed to fetch sheets.');
    }
    setFetching(false);
  }

  async function handleApplyMatches() {
    setFetching(true);
    setFetchResult('');
    try {
      const res = await fetch(`/api/projects/${projectSlug}/demand-tracker/match`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFetchResult(`Matched ${data.matched}/${data.total} keywords. ${data.unmatched} ungrouped.`);
      } else {
        setFetchResult(`Error: ${data.error}`);
      }
    } catch {
      setFetchResult('Failed to apply matches.');
    }
    setFetching(false);
  }

  if (!config) {
    return <div className="p-10 text-text-muted">Loading...</div>;
  }

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Demand Tracker Settings</h1>
        <Link
          href={`/${projectSlug}/demand-tracker`}
          className="text-sm text-accent hover:text-accent-hover font-medium"
        >
          View Dashboard →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {(['sheets', 'groups', 'data'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'sheets' && (
        <SheetsTab config={config} onSave={saveConfig} saving={saving} />
      )}

      {tab === 'groups' && (
        <GroupsTab config={config} onSave={saveConfig} saving={saving} />
      )}

      {tab === 'data' && (
        <div className="space-y-6 max-w-xl">
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Fetch & Merge</h3>
            <p className="text-sm text-text-muted mb-4">
              Last fetched: {config.parsedAt ? new Date(config.parsedAt).toLocaleString() : 'Never'}
            </p>

            {/* Per-source breakdown */}
            {(config.sheetSources || []).length > 0 && (
              <div className="mb-4 space-y-2">
                {config.sheetSources.map(source => (
                  <div key={source.id} className="flex items-center justify-between text-xs text-text-muted bg-bg-card-hover rounded-lg px-3 py-2">
                    <span className="text-text-secondary font-medium">{source.label}</span>
                    <div className="flex items-center gap-3">
                      {source.keywordCount > 0 && (
                        <span>{source.keywordCount.toLocaleString()} keywords</span>
                      )}
                      {source.lastFetchedAt && (
                        <span>{new Date(source.lastFetchedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleFetchSheet}
                disabled={fetching || !(config.sheetSources?.some(s => s.sheetId) || config.sheetId)}
                className="bg-accent text-bg-primary font-semibold px-5 py-2 rounded-lg hover:bg-accent-hover transition-colors text-sm disabled:opacity-50"
              >
                {fetching
                  ? 'Fetching...'
                  : `Fetch All Sheets${(config.sheetSources || []).length > 0 ? ` (${config.sheetSources.length})` : ''}`
                }
              </button>
              <button
                onClick={handleApplyMatches}
                disabled={fetching}
                className="bg-bg-card-hover text-text-primary font-semibold px-5 py-2 rounded-lg hover:bg-border transition-colors text-sm border border-border disabled:opacity-50"
              >
                Re-apply Matches
              </button>
            </div>
            {fetchResult && (
              <p className={`text-sm mt-3 ${fetchResult.startsWith('Error') ? 'text-error' : 'text-success'}`}>
                {fetchResult}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SheetsTab({ config, onSave, saving }: {
  config: DemandTrackerConfig;
  onSave: (updates: Partial<DemandTrackerConfig>) => void;
  saving: boolean;
}) {
  const [sources, setSources] = useState<SheetSource[]>(config.sheetSources || []);

  function addSource() {
    const newSource: SheetSource = {
      id: generateId(),
      label: `Sheet ${sources.length + 1}`,
      sheetUrl: '',
      sheetId: '',
      lastFetchedAt: null,
      keywordCount: 0,
    };
    const updated = [...sources, newSource];
    setSources(updated);
    onSave({ sheetSources: updated });
  }

  function updateSource(id: string, updates: Partial<SheetSource>) {
    const updated = sources.map(s => {
      if (s.id !== id) return s;
      const merged = { ...s, ...updates };
      // Auto-extract sheetId from URL
      if (updates.sheetUrl !== undefined) {
        merged.sheetId = extractSheetId(updates.sheetUrl) || '';
      }
      return merged;
    });
    setSources(updated);
    onSave({ sheetSources: updated });
  }

  function removeSource(id: string) {
    const updated = sources.filter(s => s.id !== id);
    setSources(updated);
    onSave({ sheetSources: updated });
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-text-muted">
          Add one or more Google Keyword Planner sheet exports. Keywords are automatically deduplicated across sheets.
        </p>
      </div>

      {sources.map((source, index) => (
        <div
          key={source.id}
          className="bg-bg-card rounded-xl border border-border-subtle p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-bg-card-hover text-text-muted text-xs font-semibold shrink-0">
                {index + 1}
              </div>
              <input
                value={source.label}
                onChange={e => updateSource(source.id, { label: e.target.value })}
                placeholder="Sheet label"
                className="bg-transparent border-0 text-text-primary font-semibold text-sm focus:outline-none placeholder:text-text-muted min-w-0 flex-1"
              />
            </div>
            <button
              onClick={() => removeSource(source.id)}
              className="text-sm text-text-muted hover:text-error transition-colors shrink-0 ml-2"
            >
              Remove
            </button>
          </div>

          <input
            value={source.sheetUrl}
            onChange={e => updateSource(source.id, { sheetUrl: e.target.value })}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
          />

          {/* Optional GID field */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-text-muted shrink-0">Tab (gid):</label>
              <input
                value={source.gid || ''}
                onChange={e => updateSource(source.id, { gid: e.target.value || undefined })}
                placeholder="0"
                className="w-24 bg-bg-input border border-border rounded px-2.5 py-1.5 text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            {source.sheetId && (
              <span className="text-xs text-success">✓ Sheet ID detected</span>
            )}
            {source.sheetUrl && !source.sheetId && (
              <span className="text-xs text-error">Invalid URL</span>
            )}
          </div>

          {/* Stats row */}
          {(source.lastFetchedAt || source.keywordCount > 0) && (
            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              {source.keywordCount > 0 && (
                <span>{source.keywordCount.toLocaleString()} keywords</span>
              )}
              {source.lastFetchedAt && (
                <span>Last fetched: {new Date(source.lastFetchedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addSource}
        className="w-full bg-bg-card hover:bg-bg-card-hover rounded-xl border border-border-subtle border-dashed p-4 text-sm text-text-muted hover:text-text-secondary transition-colors"
      >
        + Add Sheet Source
      </button>

      {saving && <p className="text-xs text-text-muted">Saving...</p>}
    </div>
  );
}

function GroupsTab({ config, onSave, saving }: {
  config: DemandTrackerConfig;
  onSave: (updates: Partial<DemandTrackerConfig>) => void;
  saving: boolean;
}) {
  const [groups, setGroups] = useState<KeywordGroup[]>(config.keywordGroups);
  const [editingId, setEditingId] = useState<string | null>(null);

  function addGroup() {
    const colorIndex = groups.length % CHART_COLORS.length;
    const newGroup: KeywordGroup = {
      id: generateId(),
      name: 'New Group',
      color: CHART_COLORS[colorIndex],
      type: 'custom',
      seedTerms: [],
      excludeTerms: [],
      matchedKeywords: [],
    };
    const updated = [...groups, newGroup];
    setGroups(updated);
    setEditingId(newGroup.id);
    onSave({ keywordGroups: updated });
  }

  function updateGroup(id: string, updates: Partial<KeywordGroup>) {
    const updated = groups.map(g => g.id === id ? { ...g, ...updates } : g);
    setGroups(updated);
    onSave({ keywordGroups: updated });
  }

  function removeGroup(id: string) {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    onSave({ keywordGroups: updated });
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div
          key={group.id}
          className="bg-bg-card rounded-xl border border-border-subtle p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={group.color}
                onChange={e => updateGroup(group.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <div>
                {editingId === group.id ? (
                  <input
                    autoFocus
                    value={group.name}
                    onChange={e => updateGroup(group.id, { name: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                    className="bg-bg-input border border-border rounded px-3 py-1 text-text-primary font-semibold focus:outline-none focus:border-accent"
                  />
                ) : (
                  <button
                    onClick={() => setEditingId(group.id)}
                    className="text-text-primary font-semibold hover:text-accent"
                  >
                    {group.name}
                  </button>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={group.type}
                    onChange={e => updateGroup(group.id, { type: e.target.value as KeywordGroupType })}
                    className="text-xs bg-bg-input border border-border rounded px-2 py-1 text-text-muted"
                  >
                    <option value="brand">Brand</option>
                    <option value="competitor">Competitor</option>
                    <option value="category">Category</option>
                    <option value="product">Product</option>
                    <option value="custom">Custom</option>
                  </select>
                  <span className="text-xs text-text-muted">
                    {group.matchedKeywords.length} keywords matched
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Line width */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-text-muted whitespace-nowrap">Line</label>
                <select
                  value={group.strokeWidth ?? 2}
                  onChange={e => updateGroup(group.id, { strokeWidth: Number(e.target.value) })}
                  className="text-xs bg-bg-input border border-border rounded px-1.5 py-1 text-text-muted w-14"
                >
                  {[1, 2, 3, 4, 5].map(w => (
                    <option key={w} value={w}>{w}px</option>
                  ))}
                </select>
              </div>
              {/* Trend line toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={group.showTrendLine ?? false}
                  onChange={e => updateGroup(group.id, { showTrendLine: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-border accent-accent"
                />
                <span className="text-xs text-text-muted whitespace-nowrap">Trend</span>
              </label>
              <button
                onClick={() => removeGroup(group.id)}
                className="text-sm text-text-muted hover:text-error transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Include Terms <span className="font-normal text-text-muted/60">(one per line — keywords must contain one of these)</span>
            </label>
            <textarea
              value={group.seedTerms.join('\n')}
              onChange={e => {
                const seeds = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                updateGroup(group.id, { seedTerms: seeds });
              }}
              placeholder="e.g. running shoes"
              rows={3}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent resize-y"
            />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Exclude Terms <span className="font-normal text-text-muted/60">(one per line — keywords containing these are removed)</span>
            </label>
            <textarea
              value={(group.excludeTerms || []).join('\n')}
              onChange={e => {
                const excludes = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                updateGroup(group.id, { excludeTerms: excludes });
              }}
              placeholder="e.g. nike, adidas"
              rows={2}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {group.matchedKeywords.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-1.5">Matched keywords:</p>
              <div className="flex flex-wrap gap-1.5">
                {group.matchedKeywords.slice(0, 10).map(kw => (
                  <span
                    key={kw}
                    className="text-xs px-2 py-0.5 rounded-full bg-bg-card-hover text-text-secondary"
                  >
                    {kw}
                  </span>
                ))}
                {group.matchedKeywords.length > 10 && (
                  <span className="text-xs text-text-muted">
                    +{group.matchedKeywords.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addGroup}
        className="w-full bg-bg-card hover:bg-bg-card-hover rounded-xl border border-border-subtle border-dashed p-4 text-sm text-text-muted hover:text-text-secondary transition-colors"
      >
        + Add Keyword Group
      </button>

      {saving && <p className="text-xs text-text-muted">Saving...</p>}
    </div>
  );
}
