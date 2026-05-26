export const captureTypes = [
  'task',
  'daily_log',
  'decision',
  'idea',
  'blocker',
  'state',
  'planning_request',
  'unknown',
] as const;

export const captureAreas = [
  'work',
  'study',
  'english',
  'sport',
  'finance',
  'personal',
  'system',
  'unknown',
] as const;

export const captureUrgencies = [
  'today',
  'this_week',
  'this_month',
  'later',
  'unknown',
] as const;

export const captureEnergySignals = [
  'low',
  'normal',
  'high',
  'unknown',
] as const;

export type CaptureType = (typeof captureTypes)[number];
export type CaptureArea = (typeof captureAreas)[number];
export type CaptureUrgency = (typeof captureUrgencies)[number];
export type CaptureEnergySignal = (typeof captureEnergySignals)[number];

export interface CaptureClassification {
  type: CaptureType;
  title: string;
  summary: string;
  area: CaptureArea;
  project_hint: string | null;
  urgency: CaptureUrgency;
  energy_signal: CaptureEnergySignal;
  action_required: boolean;
  suggested_next_action: string;
}

export interface ClassifyCaptureInput {
  text: string;
  source?: string;
}
