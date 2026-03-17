'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { TOOLS } from '@/lib/tools';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(setProject);
  }, [projectSlug]);

  const isActive = (href: string) => pathname === href;
  const isToolActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <aside className="w-64 bg-bg-card border-r border-border-subtle shrink-0">
        <div className="p-6">
          <Link href="/" className="block">
            <span className="text-xl font-bold text-accent tracking-tight">JAYWING</span>
            <span className="block text-xs text-text-muted mt-0.5">Strategy Tools</span>
          </Link>
        </div>

        {project && (
          <div className="px-6 pb-4 border-b border-border-subtle mb-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors mb-2 group"
            >
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              All Projects
            </Link>
            <p className="text-sm font-semibold text-text-primary truncate">{project.name}</p>
          </div>
        )}

        <nav className="px-3 space-y-0.5">
          <Link
            href={`/${projectSlug}`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(`/${projectSlug}`)
                ? 'bg-bg-card-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
            }`}
          >
            Overview
          </Link>

          {/* Enabled tools */}
          {project?.tools.filter(t => t.enabled).map(tool => {
            const def = TOOLS.find(d => d.id === tool.toolId);
            if (!def) return null;
            const href = def.href(projectSlug);
            return (
              <Link
                key={tool.toolId}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isToolActive(href)
                    ? 'bg-bg-card-hover text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                }`}
              >
                {def.name}
              </Link>
            );
          })}

          <div className="pt-4">
            <Link
              href={`/${projectSlug}/settings`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(`/${projectSlug}/settings`)
                  ? 'bg-bg-card-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-card-hover'
              }`}
            >
              Settings
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
