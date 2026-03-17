'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project } from '@/lib/types';

export default function ProjectSettingsPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setProject(data);
        if (data) setName(data.name);
      });
  }, [projectSlug]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/projects/${projectSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/projects/${projectSlug}`, { method: 'DELETE' });
    router.push('/');
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="animate-pulse h-8 w-48 bg-bg-card rounded" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Project Settings</h1>

        <div className="bg-bg-card rounded-xl border border-border-subtle p-6 mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-bg-input text-text-primary border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving || name === project.name}
            className="mt-4 bg-accent text-bg-primary font-semibold px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="bg-bg-card rounded-xl border border-error/20 p-6">
          <h2 className="text-sm font-semibold text-error mb-2">Danger Zone</h2>
          <p className="text-sm text-text-muted mb-4">Permanently delete this project and all its tool data.</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-error px-4 py-2 border border-error/30 rounded-lg hover:bg-error/10 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
