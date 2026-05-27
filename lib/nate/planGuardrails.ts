import type {
  NateDayPlan,
  NateDayPlanRequest,
  NateFixedCommitment,
  NateMainTask,
  NateOperationalSnapshot,
  NateOptionalTask,
  NatePlanArea,
  NatePlanMode,
  NateSupportTask,
} from '@/lib/nate/types';

export interface PlanGuardrailsContext {
  isStudySprint: boolean;
  operationalSnapshot?: NateOperationalSnapshot;
}

interface PlanLimits {
  maxMainTasks: number;
  maxSupportTasks: number;
  maxPlannedMinutes: number;
}

const lowEnergySignals = ['сильно устал', 'вымотался', 'нет сил', 'перегруз'];
const technicalFocusValues = ['education', 'study_sprint', 'recovery', 'weekend_protected', 'workday', 'normal'];
const studyConflictAreas = ['finance', 'english', 'nate'];
const weekendBlockedAreas = ['nate', 'finance', 'work'];
const heavyTaskSignals = ['deep', 'стратег', 'backtest', 'бэктест', 'разработ', 'архитект', 'тяжел', 'hard'];
const tradingSignals = ['трейдинг', 'журнал', 'сделк', 'план по активам', 'актив'];

const textIncludesAny = (text: string | undefined, patterns: string[]) => {
  const lower = (text || '').toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
};

const isLowEnergy = (input: NateDayPlanRequest) => input.energy === 'low' || textIncludesAny(input.user_message, lowEnergySignals);

const isSundayProtected = (input: NateDayPlanRequest) => input.day_type === 'weekend' && textIncludesAny(input.user_message, ['воскресенье']);

const isMonday = (date?: string) => {
  if (!date) {
    return false;
  }

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
    'главная учебная задача выполнена',
    'по учебе на сегодня все',
    'сначала закрыл учебу',
    'с учебой все закрыто',
  ]);
};

const asksForStudyConflictArea = (input: NateDayPlanRequest) => {
  return textIncludesAny(input.user_message, ['полностью', 'весь день', 'только']) && textIncludesAny(input.user_message, ['англий', 'финанс', 'нейт', 'kokontsev']);
};

const taskText = (task: { title: string; area: string }) => `${task.title} ${task.area}`.toLowerCase();

const isHeavyTask = (task: { title: string; area: string }) => {
  const text = taskText(task);
  return heavyTaskSignals.some((signal) => text.includes(signal)) || text.includes('backtesting') || text.includes('deep work');
};

const toOptionalFromMain = (task: NateMainTask, condition: string): NateOptionalTask => ({
  title: task.title,
  area: task.area,
  estimated_minutes: task.estimated_minutes,
  condition,
});

const toOptionalFromSupport = (task: NateSupportTask, condition: string): NateOptionalTask => ({
  title: task.title,
  area: task.area,
  estimated_minutes: task.estimated_minutes,
  condition,
});

const hasCommitment = (commitments: NateFixedCommitment[], needle: string) => {
  return commitments.some((commitment) => commitment.title.toLowerCase().includes(needle.toLowerCase()));
};

const addUnique = (items: string[], item: string) => {
  if (!items.includes(item)) {
    items.push(item);
  }
};

const getLimits = (input: NateDayPlanRequest, mode: NatePlanMode): PlanLimits => {
  if (mode === 'weekend_protected') {
    return { maxMainTasks: 1, maxSupportTasks: 1, maxPlannedMinutes: 60 };
  }

  if (mode === 'recovery' || (input.day_type === 'workday' && isLowEnergy(input))) {
    return { maxMainTasks: 1, maxSupportTasks: 1, maxPlannedMinutes: 90 };
  }

  if (input.day_type === 'workday') {
    return { maxMainTasks: 1, maxSupportTasks: 2, maxPlannedMinutes: 180 };
  }

  if (input.day_type === 'weekend') {
    return { maxMainTasks: 1, maxSupportTasks: 2, maxPlannedMinutes: 180 };
  }

  return { maxMainTasks: 2, maxSupportTasks: 2, maxPlannedMinutes: 150 };
};

const sumPlannedMinutes = (mainTasks: NateMainTask[], supportTasks: NateSupportTask[]) => {
  return [...mainTasks, ...supportTasks].reduce((total, task) => total + task.estimated_minutes, 0);
};

const hasRelevantTradingSignal = (input: NateDayPlanRequest, context: PlanGuardrailsContext) => {
  if (textIncludesAny(input.user_message, tradingSignals) || isMonday(input.date)) {
    return true;
  }

  const tasks = context.operationalSnapshot?.open_tasks || [];
  return tasks.some((task) => {
    if (!task || typeof task !== 'object') {
      return false;
    }

    const row = task as Record<string, unknown>;
    const area = typeof row.area === 'string' ? row.area.toLowerCase() : '';
    const priority = typeof row.priority === 'string' ? row.priority.toLowerCase() : String(row.priority || '').toLowerCase();
    return area === 'trading' && priority === 'high';
  });
};

const normalizeDayFocus = (focus: string, mode: NatePlanMode, context: PlanGuardrailsContext) => {
  const value = focus.trim();
  const lower = value.toLowerCase();

  if (lower === 'education') {
    return 'Подготовка к магистратуре';
  }

  if (lower === 'recovery') {
    return 'Восстановление и минимально полезный прогресс';
  }

  if (technicalFocusValues.includes(lower) || value.length < 8) {
    if (mode === 'recovery') {
      return 'Восстановление и минимально полезный прогресс';
    }

    if (mode === 'weekend_protected') {
      return 'Защищенное воскресенье: Настя, отдых и минимум лишнего';
    }

    if (context.isStudySprint) {
      return 'Подготовка к магистратуре без распыления';
    }

    return 'Один главный фокус дня без перегруза';
  }

  return value;
};

const ensureEducationMainTask = (mainTasks: NateMainTask[]): NateMainTask[] => {
  if (mainTasks.some((task) => task.area === 'education')) {
    return mainTasks;
  }

  const educationTask: NateMainTask = {
      title: 'Сделать главный шаг по учебе или поступлению',
      area: 'education',
      why: 'Study / Admission Sprint сейчас важнее вторичных направлений.',
      estimated_minutes: 60,
      priority: 'high',
    };

  return [educationTask, ...mainTasks];
};

export function normalizeDayPlan(plan: NateDayPlan, input: NateDayPlanRequest, context: PlanGuardrailsContext): NateDayPlan {
  let mode = plan.mode;
  const fixedCommitments = [...plan.fixed_commitments];
  let mainTasks = [...plan.main_tasks];
  let supportTasks = [...plan.support_tasks];
  const optionalTasks = [...plan.optional_tasks];
  const doNotDo = [...plan.do_not_do];
  const warnings = [...plan.plan_quality_warnings];

  if (isSundayProtected(input)) {
    mode = 'weekend_protected';
  } else if (isLowEnergy(input)) {
    mode = 'recovery';
  } else if (context.isStudySprint && mode !== 'recovery' && mode !== 'weekend_protected') {
    mode = 'study_sprint';
  }

  if (mode === 'weekend_protected') {
    if (!hasCommitment(fixedCommitments, 'Воскресенье с Настей') && !hasCommitment(fixedCommitments, 'отдых')) {
      fixedCommitments.push({ title: 'Воскресенье с Настей / отдых', area: 'relationships', estimated_minutes: null });
    }
  }

  if (input.day_type === 'workday' && !hasCommitment(fixedCommitments, 'Рабоч')) {
    fixedCommitments.unshift({ title: 'Рабочий день', area: 'work', estimated_minutes: null });
  }

  const studyClosed = hasStudyClosedSignal(input);
  const studyConflict = context.isStudySprint && asksForStudyConflictArea(input) && !studyClosed;

  if (context.isStudySprint && mode !== 'recovery' && mode !== 'weekend_protected' && !studyClosed) {
    const displacedMainTasks = mainTasks.filter((task) => studyConflictAreas.includes(task.area));
    if (displacedMainTasks.length) {
      optionalTasks.push(
        ...displacedMainTasks.map((task) =>
          toOptionalFromMain(task, 'Только после учебного шага: в Study Sprint это не главный фокус.'),
        ),
      );
      mainTasks = mainTasks.filter((task) => !studyConflictAreas.includes(task.area));
      addUnique(warnings, 'Finance/English/Nate main tasks moved because they conflict with Study Sprint.');
      addUnique(doNotDo, 'Не вытеснять подготовку к магистратуре английским, финансами или настройкой Нейта.');
    }

    mainTasks = ensureEducationMainTask(mainTasks);
  }

  if (studyConflict) {
    addUnique(warnings, 'User request conflicts with Study Sprint priorities.');
    addUnique(doNotDo, 'Запрос “полностью заняться английским/финансами/Нейтом” конфликтует с Admission Sprint: сначала учебный шаг.');
  }

  if (mode === 'weekend_protected') {
    const explicitShortTaskRequest = textIncludesAny(input.user_message, ['сделать', 'нужно', 'надо', 'хочу', 'коротк']);
    const blockedMain = mainTasks.filter(
      (task) => weekendBlockedAreas.includes(task.area) || isHeavyTask(task) || taskText(task).includes('backtest') || taskText(task).includes('бэктест'),
    );
    const blockedSupport = supportTasks.filter(
      (task) => weekendBlockedAreas.includes(task.area) || isHeavyTask(task) || taskText(task).includes('backtest') || taskText(task).includes('бэктест'),
    );

    optionalTasks.push(
      ...blockedMain.map((task) => toOptionalFromMain(task, 'Не в protected weekend: только если Олег явно подтвердит после отдыха.')),
      ...blockedSupport.map((task) => toOptionalFromSupport(task, 'Не в protected weekend: только если Олег явно подтвердит после отдыха.')),
    );

    mainTasks = mainTasks.filter((task) => !blockedMain.includes(task));
    supportTasks = supportTasks.filter((task) => !blockedSupport.includes(task));

    if (!explicitShortTaskRequest) {
      optionalTasks.push(...mainTasks.map((task) => toOptionalFromMain(task, 'Воскресенье защищено: не делать без явного подтверждения.')));
      mainTasks = [];
    } else {
      mainTasks = mainTasks.slice(0, 1).map((task) => ({ ...task, estimated_minutes: Math.min(task.estimated_minutes, 30) }));
    }

    supportTasks = supportTasks.filter((task) => !isHeavyTask(task)).slice(0, 1);
    addUnique(doNotDo, 'Не превращать воскресенье в рабочий день: work, finance, Nate development и backtesting только optional.');

    if (mainTasks.length || supportTasks.length) {
      addUnique(warnings, 'Protected Sunday still contains tasks; keep them short and confirmed.');
    }
  }

  if (mode === 'recovery') {
    const heavyMain = mainTasks.filter((task) => isHeavyTask(task) || ['finance', 'nate'].includes(task.area) || taskText(task).includes('backtest'));
    const heavySupport = supportTasks.filter((task) => isHeavyTask(task) || ['finance', 'nate'].includes(task.area) || taskText(task).includes('backtest'));

    optionalTasks.push(
      ...heavyMain.map((task) => toOptionalFromMain(task, 'Не при low energy: только после восстановления и явного подтверждения.')),
      ...heavySupport.map((task) => toOptionalFromSupport(task, 'Не при low energy: только после восстановления и явного подтверждения.')),
    );
    mainTasks = mainTasks.filter((task) => !heavyMain.includes(task));
    supportTasks = supportTasks.filter((task) => !heavySupport.includes(task));
    addUnique(doNotDo, 'Не делать deep Nate development, finance strategy, backtesting или тяжелую тренировку при low energy.');
  }

  if (!hasRelevantTradingSignal(input, context)) {
    const tradingSupport = supportTasks.filter((task) => task.area === 'trading' || taskText(task).includes('трейдинг'));
    if (tradingSupport.length) {
      optionalTasks.push(
        ...tradingSupport.map((task) =>
          toOptionalFromSupport(task, 'только если сегодня были сделки или нужно закрыть журнал'),
        ),
      );
      supportTasks = supportTasks.filter((task) => !tradingSupport.includes(task));
      addUnique(warnings, 'Trading journal moved to optional because there is no explicit trading relevance today.');
    }
  }

  const limits = getLimits(input, mode);

  if (mainTasks.length > limits.maxMainTasks) {
    optionalTasks.push(
      ...mainTasks.slice(limits.maxMainTasks).map((task) => toOptionalFromMain(task, 'Лишняя main task: только после выполнения основного плана.')),
    );
    mainTasks = mainTasks.slice(0, limits.maxMainTasks);
  }

  if (supportTasks.length > limits.maxSupportTasks) {
    optionalTasks.push(
      ...supportTasks.slice(limits.maxSupportTasks).map((task) => toOptionalFromSupport(task, 'Лишняя support task: только если остается ресурс.')),
    );
    supportTasks = supportTasks.slice(0, limits.maxSupportTasks);
  }

  while (sumPlannedMinutes(mainTasks, supportTasks) > limits.maxPlannedMinutes && supportTasks.length > 0) {
    const task = supportTasks.pop();
    if (task) {
      optionalTasks.unshift(toOptionalFromSupport(task, 'Перенесено из-за лимита времени.'));
    }
  }

  while (sumPlannedMinutes(mainTasks, supportTasks) > limits.maxPlannedMinutes && mainTasks.length > 1) {
    const task = mainTasks.pop();
    if (task) {
      optionalTasks.unshift(toOptionalFromMain(task, 'Перенесено из-за лимита времени.'));
    }
  }

  if (sumPlannedMinutes(mainTasks, supportTasks) > limits.maxPlannedMinutes && mainTasks[0]) {
    mainTasks[0] = { ...mainTasks[0], estimated_minutes: limits.maxPlannedMinutes };
  }

  const estimatedTotal = sumPlannedMinutes(mainTasks, supportTasks);

  if (estimatedTotal >= Math.floor(limits.maxPlannedMinutes * 0.85)) {
    addUnique(warnings, 'Plan is close to the time capacity limit.');
  }

  if (textIncludesAny(input.user_message, ['нейт', 'kokontsev', 'память', 'планировщик'])) {
    addUnique(warnings, 'Kokontsev OS/Nate work may become procrastination; keep it bounded.');
    addUnique(doNotDo, 'Не использовать настройку Нейта как прокрастинацию вместо главного действия.');
  }

  if (context.isStudySprint && !studyClosed && (mainTasks.some((task) => task.area === 'work' || task.area === 'finance' || task.area === 'english') || supportTasks.some((task) => task.area === 'finance' || task.area === 'english'))) {
    addUnique(warnings, 'Work/finance/English may displace Study Sprint.');
  }

  return {
    ...plan,
    day_focus: normalizeDayFocus(plan.day_focus, mode, context),
    mode,
    fixed_commitments: fixedCommitments,
    main_tasks: mainTasks,
    support_tasks: supportTasks,
    optional_tasks: optionalTasks,
    do_not_do: [...new Set(doNotDo)],
    estimated_total_planned_minutes: estimatedTotal,
    plan_quality_warnings: [...new Set(warnings)],
    requires_confirmation: true,
  };
}
