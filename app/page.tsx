import Link from 'next/link';
import { getProjects, getDTConfig } from '@/lib/store';
import { TOOLS } from '@/lib/tools';

export default function HomePage() {
  const projects = getProjects();

  return (
    <div className="min-h-screen bg-bg-primary p-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Strategy Tools</h1>
            <p className="text-text-muted mt-1">Select a project to get started</p>
          </div>
          <Link
            href="/new"
            className="bg-accent text-bg-primary font-semibold px-6 py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
          >
            New Project
          </Link>
        </div>

        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Projects</h2>

        {projects.length === 0 ? (
          <div className="bg-bg-card rounded-xl p-8 border border-border-subtle text-center">
            <p className="text-text-muted mb-4">No projects yet.</p>
            <Link
              href="/new"
              className="text-accent hover:text-accent-hover font-medium"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => {
              const enabledTools = project.tools.filter(t => t.enabled);
              const dtConfig = getDTConfig(project.slug);
              const groupCount = dtConfig?.keywordGroups.length || 0;

              return (
                <Link
                  key={project.slug}
                  href={`/${project.slug}`}
                  className="bg-bg-card hover:bg-bg-card-hover rounded-xl p-6 border border-border-subtle transition-colors block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">{project.name}</h3>
                      <p className="text-sm text-text-muted mt-1">
                        {enabledTools.length} {enabledTools.length === 1 ? 'tool' : 'tools'} active
                        {groupCount > 0 && ` — ${groupCount} keyword groups`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-accent font-medium">
                        Open →
                      </span>
                      <p className="text-xs text-text-muted mt-1">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {enabledTools.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {enabledTools.map(t => {
                        const def = TOOLS.find(d => d.id === t.toolId);
                        return def ? (
                          <span
                            key={t.toolId}
                            className="text-xs px-2.5 py-1 rounded-full font-medium bg-accent/10 text-accent"
                          >
                            {def.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
