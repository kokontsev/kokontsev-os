import type { NateDayPlan, NateDayPlanRequest, NateOperationalSnapshot } from '@/lib/nate/types';

export type PlanValidationSeverity = 'ok' | 'warning' | 'critical';

export interface PlanValidationViolation {
  code: string;
  severity: 'warning' | 'critical';
  message: string;
  suggested_fix: string;
}

export interface PlanValidationContext {
  isStudySprint: boolean;
  operationalSnapshot?: NateOperationalSnapshot;
}

export interface PlanValidationResult {
  valid: boolean;
  severity: PlanValidationSeverity;
  violations: PlanValidationViolation[];
}

const lowEnergySignals = ['сильно устал', 'вымотался', 'нет сил', 'перегруз'];
const tradingSignals = ['трейдинг', 'журнал', 'сделк', 'план по активам', 'актив', 'рынок'];
const lighteningSignals = ['легк', 'облегч', 'миним', 'восстанов', 'коротк', 'береж'];
const testSignals = ['telegram webhook', 'test capture', 'health check', 'manual_test', 'пример:', 'тест'];
const heavySignals = ['deep work', 'deep', 'backtesting', 'backtest', 'бэктест', 'стратег', 'разработ', 'архитект'];

const textIncludesAny = (text: string | undefined, patterns: string[]) => {
  const lower = (text || '').toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
};

const taskText = (task: { title: string; area: string }) => `${task.title} ${task.area}`.toLowerCase();

const allTaskText = (plan: NateDayPlan) => {
  return [...plan.main_tasks, ...plan.support_tasks, ...plan.optional_tasks].map(taskText).join('\n');
};

const isLowEnergy = (input: NateDayPlanRequest) => input.energy === 'low' || textIncludesAny(input.user_message, lowEnergySignals);

const isProtectedSunday = (input: NateDayPlanRequest) => input.day_type === 'weekend' && textIncludesAny(input.user_message, ['воскресенье']);

const isMonday = (date?: string) => {
  if (!date) return false;
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
};

const hasStudyClosedSignal = (input: NateDayPlanRequest) => {
  return textIncludesAny(input.user_message, [
    'учебные задачи закрыты',
    'учебная задача закрыта',
    'учеба закрыта',
    'подготовка закрыта',
    'магистратура закрыта',
    'магистратуру сегодня уже сделал',
    'поступление закрыто',
    'с учебой все закрыто',
    'по учебе на сегодня все',
    'главная учебная задача выполнена',
    'сначала закрыл учебу',
    'сознательно выбираю',
  ]);
};

const hasExplanation = (plan: NateDayPlan, needles: string[]) => textIncludesAny(plan.nate_comment, needles);

const plannedMinutes = (plan: NateDayPlan) => {
  return [...plan.main_tasks, ...plan.support_tasks].reduce((total, task) => total + task.estimated_minutes, 0);
};

const getRecommendedLimit = (input: NateDayPlanRequest, plan: NateDayPlan) => {
  if (plan.mode === 'weekend_protected' || isProtectedSunday(input)) return 60;
  if (plan.mode === 'recovery' || (input.day_type === 'workday' && isLowEnergy(input))) return 90;
  if (input.day_type === 'weekend') return 180;
  if (input.day_type === 'workday') return 180;
  return 150;
};

const hasRelevantTradingSignal = (input: NateDayPlanRequest, context: PlanValidationContext) => {
  if (textIncludesAny(input.user_message, tradingSignals) || isMonday(input.date)) {
    return true;
  }

  return (context.operationalSnapshot?.open_tasks || []).some((task) => {
    if (!task || typeof task !== 'object') return false;
    const row = task as Record<string, unknown>;
    const area = typeof row.area === 'string' ? row.area.toLowerCase() : '';
    const priority = typeof row.priority === 'string' ? row.priority.toLowerCase() : String(row.priority || '').toLowerCase();
    return area === 'trading' && priority === 'high';
  });
};

const pushViolation = (
  violations: PlanValidationViolation[],
  code: string,
  severity: 'warning' | 'critical',
  message: string,
  suggestedFix: string,
) => {
  violations.push({
    code,
    severity,
    message,
    suggested_fix: suggestedFix,
  });
};

export function validateDayPlan(plan: NateDayPlan, input: NateDayPlanRequest, context: PlanValidationContext): PlanValidationResult {
  const violations: PlanValidationViolation[] = [];
  const requiredFields: Array<keyof NateDayPlan> = [
    'day_focus',
    'mode',
    'fixed_commitments',
    'main_tasks',
    'support_tasks',
    'optional_tasks',
    'do_not_do',
    'risks',
    'nate_comment',
    'estimated_total_planned_minutes',
    'plan_quality_warnings',
    'requires_confirmation',
  ];

  for (const field of requiredFields) {
    if (plan[field] === undefined || plan[field] === null) {
      pushViolation(violations, 'missing_required_field', 'critical', `Missing required field: ${field}.`, 'Return the full planner schema.');
    }
  }

  if (isLowEnergy(input) && plan.mode !== 'recovery' && !hasExplanation(plan, lighteningSignals)) {
    pushViolation(
      violations,
      'low_energy_not_recovery',
      'critical',
      'Low energy requires recovery mode or an explicitly lightened plan.',
      'Set mode to recovery or explicitly explain the lightened Study Sprint plan.',
    );
  }

  if (isProtectedSunday(input) && plan.mode !== 'weekend_protected') {
    pushViolation(
      violations,
      'sunday_not_protected',
      'critical',
      'Sunday weekend request must use weekend_protected mode.',
      'Set mode to weekend_protected and protect relationships/rest.',
    );
  }

  if (textIncludesAny(allTaskText(plan), testSignals)) {
    pushViolation(
      violations,
      'test_capture_used',
      'critical',
      'Plan appears to use test or health_check captures as real tasks.',
      'Remove test/dev/health_check items from tasks.',
    );
  }

  if (textIncludesAny(allTaskText(plan), ['сменить стратег', 'изменить стратег', 'обновить правила', 'поменять фокус']) && plan.requires_confirmation !== true) {
    pushViolation(
      violations,
      'strategic_change_without_confirmation',
      'critical',
      'Strategic or external changes require confirmation.',
      'Keep requires_confirmation=true and move strategic changes to optional or decision proposal.',
    );
  }

  const studyClosed = hasStudyClosedSignal(input);
  const mainAreas = plan.main_tasks.map((task) => task.area);

  if (context.isStudySprint && !studyClosed && (mainAreas.includes('finance') || mainAreas.includes('english') || mainAreas.includes('nate'))) {
    const hasStudyConflictExplanation = hasExplanation(plan, ['study', 'admission', 'магистратур', 'учеб']);
    pushViolation(
      violations,
      'secondary_main_task_in_study_sprint',
      'warning',
      'Finance, English, or Nate is a main task during Study Sprint without clear study-closed context.',
      hasStudyConflictExplanation
        ? 'This can remain if it is a conscious one-off choice and capacity is respected.'
        : 'Explain the conflict in nate_comment or move the task to support/optional.',
    );
  }

  const limit = getRecommendedLimit(input, plan);
  const totalMinutes = plannedMinutes(plan);
  if (totalMinutes > limit) {
    pushViolation(
      violations,
      'planned_minutes_over_limit',
      'warning',
      `Planned minutes ${totalMinutes} exceed recommended limit ${limit}.`,
      'Move lower-priority support tasks to optional_tasks.',
    );
  }

  const maxSupport = plan.mode === 'recovery' || plan.mode === 'weekend_protected' || (input.day_type === 'workday' && isLowEnergy(input)) ? 1 : 2;
  if (plan.support_tasks.length > maxSupport) {
    pushViolation(
      violations,
      'too_many_support_tasks',
      'warning',
      `Too many support tasks: ${plan.support_tasks.length}, recommended max is ${maxSupport}.`,
      'Keep only the lightest support tasks and move the rest to optional_tasks.',
    );
  }

  if (plan.mode === 'weekend_protected') {
    const nonLightTasks = [...plan.main_tasks, ...plan.support_tasks].filter(
      (task) => task.estimated_minutes > 30 || ['work', 'finance', 'nate'].includes(task.area) || textIncludesAny(taskText(task), heavySignals),
    );
    if (nonLightTasks.length) {
      pushViolation(
        violations,
        'sunday_contains_non_light_tasks',
        'warning',
        'Protected Sunday contains non-light tasks.',
        'Move work, finance, Nate, backtesting, and deep work to optional_tasks or do_not_do.',
      );
    }
  }

  if (textIncludesAny(allTaskText(plan), ['вечер', 'после работы']) && textIncludesAny(allTaskText(plan), heavySignals)) {
    pushViolation(
      violations,
      'evening_deep_work_implied',
      'warning',
      'Plan implies evening deep work.',
      'Protect evening for Nastya/rest and move deep work to a morning or work-window block.',
    );
  }

  const tradingSupport = plan.support_tasks.some((task) => task.area === 'trading' || taskText(task).includes('трейдинг'));
  if (tradingSupport && !hasRelevantTradingSignal(input, context)) {
    pushViolation(
      violations,
      'trading_without_relevance',
      'warning',
      'Trading journal is in support_tasks without explicit relevance.',
      'Move trading journal to optional_tasks unless there were trades, a trading plan, or Monday planning.',
    );
  }

  if (context.isStudySprint && plan.mode !== 'study_sprint' && plan.mode !== 'recovery' && plan.mode !== 'weekend_protected') {
    pushViolation(
      violations,
      'ignores_study_sprint',
      'warning',
      'Plan ignores Study / Admission Sprint.',
      'Use study_sprint mode or explain why today consciously deviates.',
    );
  }

  const hasCritical = violations.some((violation) => violation.severity === 'critical');
  const hasWarnings = violations.some((violation) => violation.severity === 'warning');

  return {
    valid: !hasCritical,
    severity: hasCritical ? 'critical' : hasWarnings ? 'warning' : 'ok',
    violations,
  };
}
