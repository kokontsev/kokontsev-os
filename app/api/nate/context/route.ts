import { NextRequest, NextResponse } from 'next/server';
import { loadNateContext, type NateContextScope } from '@/lib/nate/contextLoader';

export const dynamic = 'force-dynamic';

const parseProjects = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((project) => project.trim())
    .filter(Boolean);
};

const parseScope = (value: string | null): NateContextScope => {
  if (!value) {
    return 'default';
  }

  if (value === 'default' || value === 'all' || value === 'planning' || value === 'project') {
    return value;
  }

  throw new Error(`unsupported scope: ${value}`);
};

export async function GET(request: NextRequest) {
  try {
    const scope = parseScope(request.nextUrl.searchParams.get('scope'));
    const projects = parseProjects(request.nextUrl.searchParams.get('projects'));
    const context = await loadNateContext({ scope, projects });

    return NextResponse.json({
      ok: true,
      ...context,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal error';
    const status = message.includes('required') || message.includes('missing') ? 500 : 400;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status },
    );
  }
}
