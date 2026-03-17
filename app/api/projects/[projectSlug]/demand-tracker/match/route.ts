import { NextResponse } from 'next/server';
import { getDTConfig, updateDTConfig, getDTData, setDTData } from '@/lib/store';
import { applyAllGroupMatches, previewSeedMatches } from '@/lib/keyword-matcher';

// Preview seed matches without applying
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const { searchParams } = new URL(request.url);
  const seeds = searchParams.get('seeds')?.split(',').filter(Boolean) || [];
  const excludes = searchParams.get('excludes')?.split(',').filter(Boolean) || [];

  const data = getDTData(projectSlug);
  if (!data) {
    return NextResponse.json({ error: 'No keyword data. Fetch the sheet first.' }, { status: 404 });
  }

  const preview = previewSeedMatches(data.keywords, seeds, excludes);
  return NextResponse.json(preview);
}

// Apply all group matches
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const config = getDTConfig(projectSlug);
  if (!config) {
    return NextResponse.json({ error: 'Demand Tracker not configured' }, { status: 404 });
  }

  const data = getDTData(projectSlug);
  if (!data) {
    return NextResponse.json({ error: 'No keyword data. Fetch the sheet first.' }, { status: 404 });
  }

  // Apply matching with current groups
  const keywords = applyAllGroupMatches(data.keywords, config.keywordGroups);

  // Update store
  setDTData(projectSlug, { ...data, keywords });
  updateDTConfig(projectSlug, { keywordGroups: config.keywordGroups });

  const assigned = keywords.filter(kw => kw.assignedGroupId).length;
  const total = keywords.length;

  return NextResponse.json({
    matched: assigned,
    total,
    unmatched: total - assigned,
    groups: config.keywordGroups.map(g => ({
      id: g.id,
      name: g.name,
      matchedCount: g.matchedKeywords.length,
    })),
  });
}
