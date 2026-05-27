export const nateProjectNames = ['work', 'finance', 'trading', 'sport', 'english', 'personality', 'relationships', 'education'] as const;

export type NateProjectName = (typeof nateProjectNames)[number];

export const nateDayTypes = ['workday', 'weekend', 'unknown'] as const;

export type NateDayType = (typeof nateDayTypes)[number];

export const nateEnergyLevels = ['low', 'normal', 'high', 'unknown'] as const;

export type NateEnergyLevel = (typeof nateEnergyLevels)[number];

export type NatePlanMode = 'study_sprint' | 'workday' | 'recovery' | 'weekend_protected' | 'normal';

export type NatePlanArea =
  | 'education'
  | 'work'
  | 'sport'
  | 'trading'
  | 'finance'
  | 'english'
  | 'relationships'
  | 'nate'
  | 'personal';

export interface NateDayPlanRequest {
  date?: string;
  user_message?: string;
  day_type: NateDayType;
  energy: NateEnergyLevel;
  projects?: NateProjectName[];
}

export interface NateMainTask {
  title: string;
  area: NatePlanArea;
  why: string;
  estimated_minutes: number;
  priority: 'high' | 'medium' | 'low';
}

export interface NateSupportTask {
  title: string;
  area: string;
  estimated_minutes: number;
}

export interface NateFixedCommitment {
  title: string;
  area: string;
  estimated_minutes: number | null;
}

export interface NateOptionalTask {
  title: string;
  area: string;
  estimated_minutes: number;
  condition: string;
}

export interface NateDayPlan {
  day_focus: string;
  mode: NatePlanMode;
  fixed_commitments: NateFixedCommitment[];
  main_tasks: NateMainTask[];
  support_tasks: NateSupportTask[];
  optional_tasks: NateOptionalTask[];
  do_not_do: string[];
  risks: string[];
  nate_comment: string;
  estimated_total_planned_minutes: number;
  plan_quality_warnings: string[];
  validator_warnings?: string[];
  requires_confirmation: true;
}

export interface NateOperationalSnapshot {
  open_tasks: unknown[];
  recent_captures: unknown[];
  recent_daily_logs: unknown[];
  recent_decisions: unknown[];
}
