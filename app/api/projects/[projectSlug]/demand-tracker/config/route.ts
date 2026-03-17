import { NextResponse } from 'next/server';
import { getProject, updateProject, getDTConfig, setDTConfig, updateDTConfig } from '@/lib/store';
import type { DemandTrackerConfig } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const config = getDTConfig(projectSlug);
  if (!config) {
    return NextResponse.json({ error: 'Demand Tracker not configured for this project' }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const updates = await request.json();

  let config = getDTConfig(projectSlug);

  if (!config) {
    // First time setup — create the config and enable the tool
    config = {
      projectSlug,
      sheetUrl: updates.sheetUrl || '',
      sheetId: updates.sheetId || '',
      sheetSources: updates.sheetSources || [],
      keywordGroups: updates.keywordGroups || [],
      parsedAt: null,
    };
    setDTConfig(projectSlug, config);

    // Enable the tool on the project
    const project = getProject(projectSlug);
    if (project) {
      const hasToolAlready = project.tools.some(t => t.toolId === 'demand-tracker');
      if (!hasToolAlready) {
        updateProject(projectSlug, {
          tools: [...project.tools, { toolId: 'demand-tracker', enabled: true, addedAt: new Date().toISOString() }],
        });
      }
    }

    return NextResponse.json(config, { status: 201 });
  }

  // Keep legacy fields in sync with first source
  const syncUpdates = { ...updates };
  const updatedSources = updates.sheetSources || config.sheetSources;
  if (updatedSources?.length > 0) {
    syncUpdates.sheetUrl = updatedSources[0].sheetUrl;
    syncUpdates.sheetId = updatedSources[0].sheetId;
  }

  const updated = updateDTConfig(projectSlug, syncUpdates);
  return NextResponse.json(updated);
}
