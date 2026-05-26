import { supabaseServer } from '@/lib/db/client';
import type { CaptureClassification } from '@/lib/router/types';

export type RoutedTo = 'tasks' | 'daily_logs' | 'decisions' | 'planning_rules' | 'none';

export interface RouteCaptureInput {
  captureId: string;
  rawText: string;
  source: string;
  classification: CaptureClassification;
}

export interface RouteCaptureResult {
  routed: boolean;
  routed_to: RoutedTo;
  routed_id: string | null;
  warning?: string;
}

const energyToScore = (energySignal: CaptureClassification['energy_signal']) => {
  if (energySignal === 'low') return 3;
  if (energySignal === 'normal') return 6;
  if (energySignal === 'high') return 8;
  return null;
};

const taskPriority = (urgency: CaptureClassification['urgency']) => (urgency === 'today' ? 'high' : 'normal');

const warningFromError = (target: RoutedTo, error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown routing error';
  return `Capture saved, but routing to ${target} failed: ${message}`;
};

async function markCaptureProcessed(captureId: string): Promise<string | undefined> {
  const supabase = supabaseServer();
  const { error } = await supabase.from('captures').update({ processed: true }).eq('id', captureId);

  if (error) {
    return `Routing succeeded, but capture processed flag was not updated: ${error.message}`;
  }

  return undefined;
}

export async function routeCapture(input: RouteCaptureInput): Promise<RouteCaptureResult> {
  const { captureId, rawText, source, classification } = input;

  let routedTo: RoutedTo = 'none';
  let payload: Record<string, unknown> | null = null;

  if (classification.type === 'task') {
    routedTo = 'tasks';
    payload = {
      title: classification.title,
      description: classification.summary,
      area: classification.area,
      status: 'open',
      priority: taskPriority(classification.urgency),
      urgency: classification.urgency,
      source,
    };
  } else if (classification.type === 'blocker') {
    routedTo = 'tasks';
    payload = {
      title: classification.title,
      description: `BLOCKER: ${classification.summary}`,
      area: classification.area,
      status: 'open',
      priority: 'high',
      urgency: classification.urgency,
      source,
    };
  } else if (classification.type === 'daily_log' || classification.type === 'state') {
    routedTo = 'daily_logs';
    payload = {
      log_date: new Date().toISOString().slice(0, 10),
      summary: classification.summary,
      new_inputs: rawText,
      energy: energyToScore(classification.energy_signal),
      load: null,
    };
  } else if (classification.type === 'planning_request') {
    routedTo = 'decisions';
    payload = {
      title: classification.title,
      reason: classification.summary,
      area: classification.area,
      status: 'proposed',
      impact: classification.suggested_next_action,
    };
  } else if (classification.type === 'decision') {
    routedTo = 'decisions';
    payload = {
      title: classification.title,
      reason: classification.summary,
      area: classification.area,
      status: 'active',
      impact: classification.suggested_next_action,
    };
  }

  if (!payload || routedTo === 'none') {
    return {
      routed: false,
      routed_to: 'none',
      routed_id: null,
    };
  }

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.from(routedTo).insert(payload).select('id').single();

    if (error) {
      return {
        routed: false,
        routed_to: routedTo,
        routed_id: null,
        warning: warningFromError(routedTo, new Error(error.message)),
      };
    }

    const processedWarning = await markCaptureProcessed(captureId);

    return {
      routed: true,
      routed_to: routedTo,
      routed_id: data.id,
      ...(processedWarning ? { warning: processedWarning } : {}),
    };
  } catch (error) {
    return {
      routed: false,
      routed_to: routedTo,
      routed_id: null,
      warning: warningFromError(routedTo, error),
    };
  }
}
