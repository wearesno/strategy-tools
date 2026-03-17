'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      const project = await res.json();
      router.push(`/${project.slug}`);
    }
    setCreating(false);
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link href="/" className="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block">
          ← Back to projects
        </Link>

        <h1 className="text-2xl font-bold text-text-primary mb-2">New Project</h1>
        <p className="text-sm text-text-muted mb-8">Create a project for a client or brand to start using strategy tools.</p>

        <form onSubmit={handleCreate} className="bg-bg-card rounded-xl border border-border-subtle p-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. New Balance Australia"
            className="w-full bg-bg-input text-text-primary border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:outline-none placeholder:text-text-muted/50"
            autoFocus
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="mt-4 w-full bg-accent text-bg-primary font-semibold py-2.5 rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}
