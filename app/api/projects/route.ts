import { NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/store';
import { slugify } from '@/lib/utils';
import type { Project } from '@/lib/types';

export async function GET() {
  return NextResponse.json(getProjects());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const project: Project = {
    slug: slugify(name),
    name,
    tools: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  createProject(project);
  return NextResponse.json(project, { status: 201 });
}
