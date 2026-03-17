'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { TOOLS } from '@/lib/tools';

export default function ProjectOverviewPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setProject(data); setLoading(false); });
  }, [projectSlug]);

  async function enableTool(toolId: string) {
    if (!project) return;

    // Create the tool config via PUT (which handles first-time setup)
    await fetch(`/api/projects/${projectSlug}/demand-tracker/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: '', keywordGroups: [] }),
    });

    // Refresh project data
    const updated = await fetch(`/api/projects/${projectSlug}`).then(r => r.json());
    setProject(updated);

    // Navigate to the tool's settings page
    const def = TOOLS.find(t => t.id === toolId);
    if (def) router.push(`${def.href(projectSlug)}/settings`);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-bg-card rounded" />
          <div className="h-40 bg-bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">Project not found.</p>
        <Link href="/" className="text-accent hover:text-accent-hover mt-2 inline-block">Back to projects</Link>
      </div>
    );
  }

  const enabledToolIds = new Set(project.tools.filter(t => t.enabled).map(t => t.toolId));

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-text-primary mb-1">{project.name}</h1>
        <p className="text-sm text-text-muted mb-8">Select a tool to get started or add a new one.</p>

        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Tools</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLS.map(tool => {
            const isEnabled = enabledToolIds.has(tool.id);

            return (
              <div
                key={tool.id}
                className="bg-bg-card rounded-xl border border-border-subtle p-6 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-text-primary">{tool.name}</h3>
                  {isEnabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-muted mb-5 leading-relaxed">{tool.description}</p>

                {isEnabled ? (
                  <div className="flex gap-3">
                    <Link
                      href={tool.href(projectSlug)}
                      className="bg-accent text-bg-primary font-semibold px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
                    >
                      Open Dashboard
                    </Link>
                    <Link
                      href={`${tool.href(projectSlug)}/settings`}
                      className="text-sm text-text-muted hover:text-text-secondary px-4 py-2 border border-border-subtle rounded-lg transition-colors"
                    >
                      Settings
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => enableTool(tool.id)}
                    className="text-sm font-medium text-accent hover:text-accent-hover px-4 py-2 border border-accent/30 rounded-lg hover:border-accent/60 transition-colors"
                  >
                    + Add Tool
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
