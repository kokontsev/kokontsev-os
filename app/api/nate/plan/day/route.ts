import { NextRequest, NextResponse } from 'next/server';
import { generateNateDayPlan } from '@/lib/nate/dayPlanner';
import { nateDayTypes, nateEnergyLevels, nateProjectNames, type NateDayPlanRequest, type NateProjectName } from '@/lib/nate/types';

export const dynamic = 'force-dynamic';

interface RawDayPlanRequest {
  date?: unknown;
  user_message?: unknown;
  day_type?: unknown;
  energy?: unknown;
  projects?: unknown;
}

const isOneOf = <T extends readonly string[]>(value: unknown, allowed: T): value is T[number] => {
  return typeof value === 'string' && allowed.includes(value);
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseProjects(value: unknown): NateProjectName[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('projects must be an array');
  }

  const projects = value.map((project) => {
    if (!isOneOf(project, nateProjectNames)) {
      throw new Error(`unknown project: ${String(project)}`);
    }

    return project;
  });

  return projects.length ? projects : undefined;
}

function parseBody(body: RawDayPlanRequest): NateDayPlanRequest {
  const date = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : undefined;

  if (date && !isIsoDate(date)) {
    throw new Error('date must be in YYYY-MM-DD format');
  }

  if (!isOneOf(body.day_type, nateDayTypes)) {
    throw new Error('day_type must be workday, weekend, or unknown');
  }

  if (!isOneOf(body.energy, nateEnergyLevels)) {
    throw new Error('energy must be low, normal, high, or unknown');
  }

  return {
    ...(date ? { date } : {}),
    ...(typeof body.user_message === 'string' && body.user_message.trim() ? { user_message: body.user_message.trim() } : {}),
    day_type: body.day_type,
    energy: body.energy,
    projects: parseProjects(body.projects),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RawDayPlanRequest;
    const input = parseBody(body);
    const result = await generateNateDayPlan(input);

    return NextResponse.json({
      ok: true,
      plan: result.plan,
      metadata: result.metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal error';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
