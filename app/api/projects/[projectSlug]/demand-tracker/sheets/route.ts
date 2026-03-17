import { NextResponse } from 'next/server';
import { getDTConfig, updateDTConfig, getDTData, setDTData } from '@/lib/store';
import { fetchAndParseSheet, mergeAndDeduplicateKeywords } from '@/lib/sheets-parser';
import type { SourceParseResult } from '@/lib/sheets-parser';
import { applyAllGroupMatches } from '@/lib/keyword-matcher';
import { extractSheetId } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const data = getDTData(projectSlug);
  if (!data) {
    return NextResponse.json({ error: 'No data found. Fetch the sheet first.' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const config = getDTConfig(projectSlug);
  if (!config) {
    return NextResponse.json({ error: 'Demand Tracker not configured for this project' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const sources = config.sheetSources || [];

  // Legacy fallback: no sheetSources, use old sheetId directly
  if (sources.length === 0) {
    const sheetUrl = body.sheetUrl || config.sheetUrl;
    const sheetId = body.sheetId || config.sheetId || extractSheetId(sheetUrl);

    if (!sheetId) {
      return NextResponse.json({ error: 'No sheet sources configured' }, { status: 400 });
    }

    try {
      const result = await fetchAndParseSheet(sheetId);
      if (result.errors.length > 0 && result.keywords.length === 0) {
        return NextResponse.json({ error: result.errors.join('; ') }, { status: 422 });
      }
      const keywords = applyAllGroupMatches(result.keywords, config.keywordGroups);
      const clientData = {
        clientSlug: projectSlug,
        keywords,
        fetchedAt: new Date().toISOString(),
        monthColumns: result.monthColumns,
      };
      setDTData(projectSlug, clientData);
      updateDTConfig(projectSlug, {
        sheetId,
        sheetUrl: sheetUrl || config.sheetUrl,
        parsedAt: new Date().toISOString(),
        keywordGroups: config.keywordGroups,
      });
      return NextResponse.json({ ...clientData, warnings: result.errors });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sheet';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Multi-source fetch: fetch all sources in parallel
  const validSources = sources.filter(s => s.sheetId);
  if (validSources.length === 0) {
    return NextResponse.json({ error: 'No sheet sources have valid sheet IDs' }, { status: 400 });
  }

  try {
    const fetchResults = await Promise.allSettled(
      validSources.map(async (source): Promise<SourceParseResult> => {
        const result = await fetchAndParseSheet(source.sheetId, source.gid || '0');
        return { sourceId: source.id, label: source.label, result };
      })
    );

    // Collect successful results and errors from failed ones
    const successfulResults: SourceParseResult[] = [];
    const fetchErrors: string[] = [];

    for (let i = 0; i < fetchResults.length; i++) {
      const r = fetchResults[i];
      if (r.status === 'fulfilled') {
        successfulResults.push(r.value);
      } else {
        const label = validSources[i].label;
        fetchErrors.push(`[${label}] Failed to fetch: ${r.reason?.message || 'Unknown error'}`);
      }
    }

    if (successfulResults.length === 0) {
      return NextResponse.json({ error: fetchErrors.join('; ') }, { status: 422 });
    }

    // Merge and deduplicate
    const merged = mergeAndDeduplicateKeywords(successfulResults);
    merged.errors.push(...fetchErrors);

    // Apply keyword group matching on the deduplicated set
    const keywords = applyAllGroupMatches(merged.keywords, config.keywordGroups);

    const clientData = {
      clientSlug: projectSlug,
      keywords,
      fetchedAt: new Date().toISOString(),
      monthColumns: merged.monthColumns,
    };

    setDTData(projectSlug, clientData);

    // Update per-source metadata
    const updatedSources = sources.map(s => {
      const fetched = successfulResults.find(r => r.sourceId === s.id);
      if (fetched) {
        return {
          ...s,
          lastFetchedAt: new Date().toISOString(),
          keywordCount: fetched.result.keywords.length,
        };
      }
      return s;
    });

    updateDTConfig(projectSlug, {
      sheetSources: updatedSources,
      sheetUrl: updatedSources[0]?.sheetUrl || config.sheetUrl,
      sheetId: updatedSources[0]?.sheetId || config.sheetId,
      parsedAt: new Date().toISOString(),
      keywordGroups: config.keywordGroups,
    });

    return NextResponse.json({
      ...clientData,
      mergeStats: merged.mergeStats,
      warnings: merged.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sheets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
