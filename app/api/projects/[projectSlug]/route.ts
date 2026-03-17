import { NextResponse } from 'next/server';
import { getProject, updateProject, deleteProject } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const project = getProject(projectSlug);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const updates = await request.json();
  const project = updateProject(projectSlug, updates);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectSlug: string }> }
) {
  const { projectSlug } = await params;
  const deleted = deleteProject(projectSlug);
  if (!deleted) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
