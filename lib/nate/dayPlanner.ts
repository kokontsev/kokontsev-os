import { createOpenRouterClient, getOpenRouterModel } from '@/lib/ai/openrouter';
import { supabaseServer } from '@/lib/db/client';
import { loadNateContext } from '@/lib/nate/contextLoader';
import { normalizeDayPlan } from '@/lib/nate/planGuardrails';
import { validateDayPlan, type PlanValidationResult } from '@/lib/nate/planValidator';
import type {
  NateDayPlan,
  NateDayPlanRequest,
  NateFixedCommitment,
  NateMainTask,
  NateOperationalSnapshot,
  NateOptionalTask,
  NatePlanArea,
  NatePlanMode,
  NateProjectName,
  NateSupportTask,
} from '@/lib/nate/types';

const planAreas: NatePlanArea[] = ['education', 'work', 'sport', 'trading', 'finance', 'english', 'relationships', 'nate', 'personal'];
const planModes: NatePlanMode[] = ['study_sprint', 'workday', 'recovery', 'weekend_protected', 'normal'];
const lowEnergySignals = ['сильно устал', 'вымотался', 'нет сил', 'перегруз'];

export interface GenerateDayPlanResult {
  plan: NateDayPlan;
  metadata: {
    date: string;
    model: string;
    model_fallback: boolean;
    validator: PlanValidationResult & {
      repaired_by_model: boolean;
      hard_guardrails_applied: boolean;
    };
    context_character_count: number;
    used_sections: string[];
  };
}

interface PlannerLimits {
  maxMainTasks: number;
  maxSupportTasks: number;
  maxPlannedMinutes: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const asString = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim() ? value.trim() : fallback);

const asNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  return fallback;
};

const textIncludesAny = (text: string | undefined, patterns: string[]) => {
  const lower = (text || '').toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
};

const userIsLowEnergy = (input: NateDayPlanRequest) => input.energy === 'low' || textIncludesAny(input.user_message, lowEnergySignals);

const userMentionsSunday = (input: NateDayPlanRequest) => textIncludesAny(input.user_message, ['воскресенье']);

const isWeekendProtected = (input: NateDayPlanRequest) => input.day_type === 'weekend' && userMentionsSunday(input);

const isThursdayDate = (date?: string) => {
  if (!date) {
    return false;
  }

  return new Date(`${date}T00:00:00Z`).getUTCDay() === 4;
};

const userMentionsThursday = (input: NateDayPlanRequest) => textIncludesAny(input.user_message, ['четверг']);

const isThursday = (input: NateDayPlanRequest) => isThursdayDate(input.date) || userMentionsThursday(input);

const isMilitaryDay = (input: NateDayPlanRequest) => textIncludesAny(input.user_message, ['военная кафедра', 'военка', 'военной кафедр']);

const isStudySprint = (input: NateDayPlanRequest) => {
  const projects = input.projects || [];
  return projects.length === 0 || projects.includes('education');
};

const getLimits = (input: NateDayPlanRequest): PlannerLimits => {
  if (isWeekendProtected(input)) {
    return { maxMainTasks: 1, maxSupportTasks: 1, maxPlannedMinutes: 60 };
  }

  if (isMilitaryDay(input)) {
    return { maxMainTasks: 1, maxSupportTasks: 1, maxPlannedMinutes: 60 };
  }

  if (input.day_type === 'weekend') {
    return { maxMainTasks: 1, maxSupportTasks: 1, maxPlannedMinutes: 90 };
  }

  if (input.day_type === 'workday' && userIsLowEnergy(input)) {
    return { maxMainTasks: 1, maxSupportTasks: 1, maxPlannedMinutes: 90 };
  }

  if (input.day_type === 'workday') {
    return { maxMainTasks: 1, maxSupportTasks: 2, maxPlannedMinutes: 180 };
  }

  return { maxMainTasks: 2, maxSupportTasks: 2, maxPlannedMinutes: userIsLowEnergy(input) ? 90 : 150 };
};

const getForcedMode = (input: NateDayPlanRequest): NatePlanMode | null => {
  if (isWeekendProtected(input)) {
    return 'weekend_protected';
  }

  if (userIsLowEnergy(input)) {
    return 'recovery';
  }

  if (input.day_type === 'weekend') {
    return 'weekend_protected';
  }

  if (isStudySprint(input)) {
    return 'study_sprint';
  }

  return null;
};

const asFixedCommitment = (value: unknown): NateFixedCommitment | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: asString(value.title, 'Фиксированное обязательство'),
    area: asString(value.area, 'personal'),
    estimated_minutes: value.estimated_minutes === null ? null : asNumber(value.estimated_minutes, 0),
  };
};

const asMainTask = (value: unknown): NateMainTask | null => {
  if (!isRecord(value)) {
    return null;
  }

  const area = typeof value.area === 'string' && planAreas.includes(value.area as NatePlanArea) ? (value.area as NatePlanArea) : 'personal';
  const priority =
    value.priority === 'high' || value.priority === 'medium' || value.priority === 'low' ? value.priority : 'medium';

  return {
    title: asString(value.title, 'Сфокусироваться на главной задаче дня'),
    area,
    why: asString(value.why, 'Это поддерживает главный фокус дня.'),
    estimated_minutes: asNumber(value.estimated_minutes, 45),
    priority,
  };
};

const asSupportTask = (value: unknown): NateSupportTask | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: asString(value.title, 'Поддерживающее действие'),
    area: asString(value.area, 'personal'),
    estimated_minutes: asNumber(value.estimated_minutes, 15),
  };
};

const asOptionalTask = (value: unknown): NateOptionalTask | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: asString(value.title, 'Опциональная задача'),
    area: asString(value.area, 'personal'),
    estimated_minutes: asNumber(value.estimated_minutes, 20),
    condition: asString(value.condition, 'Только если основные задачи закрыты и есть ресурс.'),
  };
};

const asStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim());
  return items.length ? items : fallback;
};

const sumTaskMinutes = (mainTasks: NateMainTask[], supportTasks: NateSupportTask[]) => {
  return [...mainTasks, ...supportTasks].reduce((total, task) => total + task.estimated_minutes, 0);
};

function normalizePlan(value: unknown, input: NateDayPlanRequest): NateDayPlan {
  if (!isRecord(value)) {
    throw new Error('planner response is not an object');
  }

  const fixedCommitments = Array.isArray(value.fixed_commitments) ? value.fixed_commitments.map(asFixedCommitment).filter(Boolean) : [];
  const mainTasks = Array.isArray(value.main_tasks) ? value.main_tasks.map(asMainTask).filter(Boolean) : [];
  const supportTasks = Array.isArray(value.support_tasks) ? value.support_tasks.map(asSupportTask).filter(Boolean) : [];
  const optionalTasks = Array.isArray(value.optional_tasks) ? value.optional_tasks.map(asOptionalTask).filter(Boolean) : [];
  const modelMode = typeof value.mode === 'string' && planModes.includes(value.mode as NatePlanMode) ? (value.mode as NatePlanMode) : 'normal';

  const plan: NateDayPlan = {
    day_focus: asString(value.day_focus, 'Собрать реалистичный день вокруг одного главного фокуса.'),
    mode: modelMode,
    fixed_commitments: fixedCommitments as NateFixedCommitment[],
    main_tasks: mainTasks as NateMainTask[],
    support_tasks: supportTasks as NateSupportTask[],
    optional_tasks: optionalTasks as NateOptionalTask[],
    do_not_do: asStringArray(value.do_not_do, ['Не распыляться на новые необязательные проекты.']),
    risks: asStringArray(value.risks, ['Перегрузить день и сорвать восстановление.']),
    nate_comment: asString(value.nate_comment, 'План должен быть коротким и проверяемым.'),
    estimated_total_planned_minutes: asNumber(value.estimated_total_planned_minutes, 0),
    plan_quality_warnings: asStringArray(value.plan_quality_warnings, []),
    requires_confirmation: true,
  };

  return plan;
}

function enforcePlanLimits(plan: NateDayPlan, input: NateDayPlanRequest): NateDayPlan {
  const limits = getLimits(input);
  const warnings = [...plan.plan_quality_warnings];
  const forcedMode = getForcedMode(input);
  const fixedCommitments = [...plan.fixed_commitments];

  if (input.day_type === 'workday' && !fixedCommitments.some((item) => item.title.toLowerCase().includes('рабоч'))) {
    fixedCommitments.unshift({ title: 'Рабочий день', area: 'work', estimated_minutes: null });
  }

  if (isMilitaryDay(input) && !fixedCommitments.some((item) => item.title.toLowerCase().includes('воен'))) {
    fixedCommitments.push({ title: 'Военная кафедра', area: 'education', estimated_minutes: null });
  }

  if (forcedMode && plan.mode !== forcedMode) {
    warnings.push(`Mode changed from ${plan.mode} to ${forcedMode} by planner guardrails.`);
  }

  let mainTasks = [...plan.main_tasks];
  let supportTasks = [...plan.support_tasks];
  const optionalTasks = [...plan.optional_tasks];
  const doNotDo = [...plan.do_not_do];

  if (isWeekendProtected(input)) {
    mainTasks = mainTasks.map((task) => ({ ...task, estimated_minutes: Math.min(task.estimated_minutes, 30) }));
  }

  if (input.day_type === 'workday' && !userIsLowEnergy(input)) {
    mainTasks = mainTasks.map((task) => ({ ...task, estimated_minutes: Math.min(Math.max(task.estimated_minutes, 60), 120) }));
  }

  if (input.day_type === 'workday' && userIsLowEnergy(input)) {
    mainTasks = mainTasks.map((task) => ({ ...task, estimated_minutes: Math.min(Math.max(task.estimated_minutes, 30), 60) }));
  }

  if (isMilitaryDay(input)) {
    mainTasks = mainTasks.map((task) => ({ ...task, estimated_minutes: Math.min(task.estimated_minutes, 45) }));
  }

  if (isThursday(input) || isMilitaryDay(input)) {
    const blockedSportMainTasks = mainTasks.filter((task) => task.area === 'sport');
    const blockedSportSupportTasks = supportTasks.filter((task) => task.area === 'sport');

    if (blockedSportMainTasks.length || blockedSportSupportTasks.length) {
      optionalTasks.push(
        ...blockedSportMainTasks.map((task) => ({
          title: task.title,
          area: task.area,
          estimated_minutes: task.estimated_minutes,
          condition: isMilitaryDay(input) ? 'Не сегодня: военная кафедра, без тренировки.' : 'Не сегодня: четверг не использовать для тренировок.',
        })),
        ...blockedSportSupportTasks.map((task) => ({
          title: task.title,
          area: task.area,
          estimated_minutes: task.estimated_minutes,
          condition: isMilitaryDay(input) ? 'Не сегодня: военная кафедра, без тренировки.' : 'Не сегодня: четверг не использовать для тренировок.',
        })),
      );
      warnings.push(isMilitaryDay(input) ? 'Sport tasks moved to optional_tasks because military department day blocks training.' : 'Sport tasks moved to optional_tasks because Thursday is not used for training.');
      mainTasks = mainTasks.filter((task) => task.area !== 'sport');
      supportTasks = supportTasks.filter((task) => task.area !== 'sport');
    }
  }

  if (mainTasks.length > limits.maxMainTasks) {
    const overflow = mainTasks.slice(limits.maxMainTasks);
    optionalTasks.push(
      ...overflow.map((task) => ({
        title: task.title,
        area: task.area,
        estimated_minutes: task.estimated_minutes,
        condition: 'Только если основной план закрыт и есть свободный ресурс.',
      })),
    );
    warnings.push(`Main tasks reduced to ${limits.maxMainTasks}. Extra tasks moved to optional_tasks.`);
    mainTasks = mainTasks.slice(0, limits.maxMainTasks);
  }

  if (supportTasks.length > limits.maxSupportTasks) {
    const overflow = supportTasks.slice(limits.maxSupportTasks);
    optionalTasks.push(
      ...overflow.map((task) => ({
        title: task.title,
        area: task.area,
        estimated_minutes: task.estimated_minutes,
        condition: 'Только если не мешает главному фокусу дня.',
      })),
    );
    warnings.push(`Support tasks reduced to ${limits.maxSupportTasks}. Extra tasks moved to optional_tasks.`);
    supportTasks = supportTasks.slice(0, limits.maxSupportTasks);
  }

  while (sumTaskMinutes(mainTasks, supportTasks) > limits.maxPlannedMinutes && supportTasks.length > 0) {
    const task = supportTasks.pop();
    if (task) {
      optionalTasks.unshift({
        title: task.title,
        area: task.area,
        estimated_minutes: task.estimated_minutes,
        condition: 'Перенести, если план уже превышает лимит времени.',
      });
    }
  }

  while (sumTaskMinutes(mainTasks, supportTasks) > limits.maxPlannedMinutes && mainTasks.length > 1) {
    const task = mainTasks.pop();
    if (task) {
      optionalTasks.unshift({
        title: task.title,
        area: task.area,
        estimated_minutes: task.estimated_minutes,
        condition: 'Не делать сегодня без отдельного подтверждения.',
      });
    }
  }

  if (sumTaskMinutes(mainTasks, supportTasks) > limits.maxPlannedMinutes && mainTasks[0]) {
    mainTasks[0] = { ...mainTasks[0], estimated_minutes: limits.maxPlannedMinutes };
    warnings.push(`Main task time capped to keep planned time within ${limits.maxPlannedMinutes} minutes.`);
  }

  const totalMinutes = sumTaskMinutes(mainTasks, supportTasks);

  if (totalMinutes >= limits.maxPlannedMinutes) {
    doNotDo.push('Не добавлять сверху новые задачи без снятия одной из текущих.');
  }

  doNotDo.push('Не планировать deep work вечером: вечер защищен под Настю и восстановление.');

  if (isThursday(input)) {
    doNotDo.push('Не ставить тренировку на четверг.');
  }

  if (isMilitaryDay(input)) {
    doNotDo.push('Не ставить deep work и тренировку в день военной кафедры.');
  }

  if (!doNotDo.length) {
    doNotDo.push('Не превращать Kokontsev OS в способ прокрастинировать вместо одного следующего действия.');
  }

  return {
    ...plan,
    mode: forcedMode || plan.mode,
    fixed_commitments: fixedCommitments,
    main_tasks: mainTasks,
    support_tasks: supportTasks,
    optional_tasks: optionalTasks,
    do_not_do: [...new Set(doNotDo)],
    estimated_total_planned_minutes: totalMinutes,
    plan_quality_warnings: [...new Set(warnings)],
    requires_confirmation: true,
  };
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('planner response does not contain JSON');
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

const isTestText = (text: string) => {
  const lower = text.toLowerCase();
  return (
    lower.includes('telegram webhook') ||
    lower.includes('test capture') ||
    lower.includes('health check') ||
    lower.includes('example') ||
    lower.includes('пример:') ||
    lower.includes('тест')
  );
};

const rowText = (row: Record<string, unknown>) => {
  return Object.values(row)
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
};

const userMessageMentionsRow = (row: Record<string, unknown>, userMessage?: string) => {
  if (!userMessage) {
    return false;
  }

  const message = userMessage.toLowerCase();
  const title = typeof row.title === 'string' ? row.title.toLowerCase() : '';
  const area = typeof row.area === 'string' ? row.area.toLowerCase() : '';
  const projectHint = typeof row.project_hint === 'string' ? row.project_hint.toLowerCase() : '';

  return Boolean((title && message.includes(title.slice(0, 24))) || (area && message.includes(area)) || (projectHint && message.includes(projectHint)));
};

function filterOpenTasks(rows: unknown[], input: NateDayPlanRequest): unknown[] {
  const today = input.date || todayIsoDate();
  const requestedProjects = new Set<NateProjectName>(input.projects || []);

  return rows.filter((row) => {
    if (!isRecord(row)) {
      return false;
    }

    if (row.status !== 'open') {
      return false;
    }

    const dueDate = typeof row.due_date === 'string' ? row.due_date : null;
    const priority = typeof row.priority === 'string' ? row.priority.toLowerCase() : String(row.priority || '').toLowerCase();
    const area = typeof row.area === 'string' ? row.area : '';

    return (
      Boolean(dueDate && dueDate <= today) ||
      priority === 'high' ||
      requestedProjects.has(area as NateProjectName) ||
      userMessageMentionsRow(row, input.user_message)
    );
  });
}

function filterRecentCaptures(rows: unknown[], input: NateDayPlanRequest): unknown[] {
  return rows.filter((row) => {
    if (!isRecord(row)) {
      return false;
    }

    const source = typeof row.source === 'string' ? row.source : '';
    const rawText = typeof row.raw_text === 'string' ? row.raw_text : '';

    if (source === 'manual_test' || source === 'health_check') {
      return false;
    }

    if (isTestText(rawText) || isTestText(rowText(row))) {
      return false;
    }

    return userMessageMentionsRow(row, input.user_message) || row.action_required === true;
  });
}

async function loadOperationalSnapshot(input: NateDayPlanRequest): Promise<NateOperationalSnapshot> {
  const supabase = supabaseServer();

  const [tasks, captures, dailyLogs, decisions] = await Promise.all([
    supabase
      .from('tasks')
      .select('id,title,description,status,priority,due_date,area,urgency,created_at,updated_at')
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(40),
    supabase
      .from('captures')
      .select('id,raw_text,source,type,area,project_hint,action_required,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('daily_logs')
      .select('id,log_date,summary,new_inputs,energy,load,created_at')
      .order('created_at', { ascending: false })
      .limit(7),
    supabase
      .from('decisions')
      .select('id,title,reason,decision_text,rationale,area,status,impact,created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const firstError = tasks.error || captures.error || dailyLogs.error || decisions.error;
  if (firstError) {
    throw new Error(`failed to load planning data: ${firstError.message}`);
  }

  return {
    open_tasks: filterOpenTasks(tasks.data || [], input).slice(0, 20),
    recent_captures: filterRecentCaptures(captures.data || [], input).slice(0, 10),
    recent_daily_logs: dailyLogs.data || [],
    recent_decisions: decisions.data || [],
  };
}

function buildFallbackPlan(input: NateDayPlanRequest): NateDayPlan {
  const isWeekend = input.day_type === 'weekend';
  const lowEnergy = userIsLowEnergy(input);
  const projects = input.projects && input.projects.length ? input.projects : ['education', 'work', 'sport', 'trading', 'relationships'];
  const mode: NatePlanMode = getForcedMode(input) || 'normal';
  const fixedCommitments: NateFixedCommitment[] = [];
  const mainTasks: NateMainTask[] = [];
  const supportTasks: NateSupportTask[] = [];
  const optionalTasks: NateOptionalTask[] = [];

  if (input.day_type === 'workday') {
    fixedCommitments.push({ title: 'Рабочий день', area: 'work', estimated_minutes: null });
  }

  if (isMilitaryDay(input)) {
    fixedCommitments.push({ title: 'Военная кафедра', area: 'education', estimated_minutes: null });
  }

  if (isWeekendProtected(input)) {
    fixedCommitments.push({ title: 'Воскресенье с Настей / отдых', area: 'relationships', estimated_minutes: null });
  } else if (!lowEnergy && isWeekend) {
    mainTasks.push({
      title: 'Один короткий полезный шаг без захвата выходного',
      area: projects.includes('sport') ? 'sport' : 'personal',
      why: 'Выходной должен оставаться выходным, поэтому задача только короткая и заранее ограниченная.',
      estimated_minutes: 30,
      priority: 'medium',
    });
  } else if (projects.includes('education')) {
    mainTasks.push({
      title: lowEnergy ? 'Минимальный шаг по учебе или поступлению' : 'Главный шаг по учебе или поступлению',
      area: 'education',
      why: lowEnergy
        ? 'При усталости нужно сохранить Study / Admission Sprint, но не добивать ресурс.'
        : 'Текущий период Study / Admission Sprint требует одного настоящего учебного фокуса.',
      estimated_minutes: lowEnergy ? 35 : 75,
      priority: 'high',
    });
  } else if (projects.includes('work')) {
    mainTasks.push({
      title: 'Закрыть один рабочий фокус',
      area: 'work',
      why: 'На workday нужен один главный результат, а не попытка обслужить все проекты.',
      estimated_minutes: lowEnergy ? 45 : 90,
      priority: 'high',
    });
  }

  if (!isWeekendProtected(input) && !isThursday(input) && !isMilitaryDay(input)) {
    supportTasks.push({
      title: lowEnergy ? 'Легкая прогулка или разминка' : 'Поддержать спорт минимальным форматом',
      area: 'sport',
      estimated_minutes: lowEnergy ? 15 : 30,
    });
  }

  if (projects.includes('trading') || textIncludesAny(input.user_message, ['трейдинг', 'сделк', 'журнал'])) {
    optionalTasks.push({
      title: 'Заполнить трейдинг-журнал',
      area: 'trading',
      estimated_minutes: 15,
      condition: 'Только если были сделки, разбор рынка или заранее запланированная проверка.',
    });
  }

  optionalTasks.push({
    title: 'Английский или финансы',
    area: 'personal',
    estimated_minutes: 20,
    condition: 'Только если основной план закрыт и это не ухудшает восстановление.',
  });

  return enforcePlanLimits(
    {
      day_focus: lowEnergy
        ? 'Восстановление с одним минимально полезным шагом'
        : isWeekendProtected(input)
          ? 'Воскресенье с Настей и восстановлением'
          : projects.includes('education')
            ? 'Подготовка к магистратуре с защитой энергии'
            : 'Один главный фокус без перегруза',
      mode,
      fixed_commitments: fixedCommitments,
      main_tasks: mainTasks,
      support_tasks: supportTasks,
      optional_tasks: optionalTasks,
      do_not_do: [
        'Не превращать Kokontsev OS в прокрастинацию вместо следующего действия.',
        'Не добавлять задачи сверх лимита без снятия текущих.',
        'Не жертвовать сном ради ощущения продуктивности.',
      ],
      risks: ['Перегрузить день старыми задачами из базы.', 'Смешать фиксированную работу с реальным extra-планом.'],
      nate_comment:
        'Я собрал бережный план по базовым правилам Нейта: один главный фокус, без перегруза и без захвата вечера. Подтверди, что такой фокус сегодня подходит.',
      estimated_total_planned_minutes: sumTaskMinutes(mainTasks, supportTasks),
      plan_quality_warnings: ['Fallback planner used.'],
      requires_confirmation: true,
    },
    input,
  );
}

function buildPlannerPrompt(input: NateDayPlanRequest, context: string, snapshot: NateOperationalSnapshot) {
  const limits = getLimits(input);

  return `Ты Нейт, персональный second brain advisor Олега.
Отвечай на русском. Верни только JSON без markdown.

Сначала выбери главный фокус дня, потом отсекать лишнее. Не пытайся обслужить все проекты в один день.
Главный источник правил - память Нейта ниже.
Текущий период: Study / Admission Sprint.
Финальная структура будет проверена deterministic guardrails, но ты сам должен сразу стараться не нарушать правила.
Если запрос пользователя конфликтует с Study / Admission Sprint, объясни конфликт в nate_comment и plan_quality_warnings.

Жесткие лимиты:
- max main_tasks: ${limits.maxMainTasks}
- max support_tasks: ${limits.maxSupportTasks}
- max extra planned minutes: ${limits.maxPlannedMinutes}
- fixed_commitments не входят в extra planned minutes.

Правила режима:
- energy=low или фразы "сильно устал", "вымотался", "нет сил", "перегруз" => mode recovery или study_sprint с явным облегчением.
- weekend + "воскресенье" => mode weekend_protected.
- Study / Admission Sprint и день не recovery/weekend_protected => mode study_sprint.

Правила планирования:
- Работа, военная кафедра и внешние обязательства идут в fixed_commitments, не в support_tasks.
- На workday можно добавить fixed_commitment "Рабочий день", но это не задача.
- Вечер почти всегда защищен под Настю и восстановление. Не планируй deep work вечером.
- Workday normal energy: максимум 1 deep task на 60-120 минут + 1-2 support tasks.
- Workday low energy: максимум 1 task на 30-60 минут + 0-1 support task.
- Короткие окна на работе подходят только для легких задач: коммуникации, quick review, запись capture, трейдинг-журнал, мелкие проверки.
- Обед иногда лучше использовать для коммуникации с коллегами, а не забивать задачами.
- Тренировка в будни занимает около 60 минут + 7 минут до зала; учитывай это как реальный блок времени.
- Воскресенье защищено под Настю и восстановление.
- Четверг не использовать для тренировок.
- Военная кафедра = special day: no deep work, no training.
- Recent captures использовать как фон. Не превращать их в задачи без явной актуальности.
- Старые dev/test captures игнорировать.
- Английский и финансы летом только поддержка.
- Трейдинг добавлять только если есть план/журнал/день проверки, либо пользователь упомянул трейдинг.
- Спорт добавлять, если это помогает сохранить минимум; при low energy только легкий формат.
- Всегда указывай do_not_do.
- Всегда проверь, не стал ли Kokontsev OS прокрастинацией.
- Если лишние задачи полезны, клади их в optional_tasks с условием.

JSON-схема:
{
  "day_focus": "string",
  "mode": "study_sprint" | "workday" | "recovery" | "weekend_protected" | "normal",
  "fixed_commitments": [{"title":"string","area":"string","estimated_minutes": number | null}],
  "main_tasks": [{"title":"string","area":"education" | "work" | "sport" | "trading" | "finance" | "english" | "relationships" | "nate" | "personal","why":"string","estimated_minutes":number,"priority":"high" | "medium" | "low"}],
  "support_tasks": [{"title":"string","area":"string","estimated_minutes":number}],
  "optional_tasks": [{"title":"string","area":"string","estimated_minutes":number,"condition":"string"}],
  "do_not_do": ["string"],
  "risks": ["string"],
  "nate_comment": "string",
  "estimated_total_planned_minutes": number,
  "plan_quality_warnings": ["string"],
  "requires_confirmation": true
}

Input:
${JSON.stringify(input, null, 2)}

Filtered operational memory from Supabase:
${JSON.stringify(snapshot, null, 2)}

Nate memory context:
${context}`;
}

async function callOpenRouterPlanner(prompt: string, input: NateDayPlanRequest): Promise<NateDayPlan> {
  const client = createOpenRouterClient();
  const completion = await client.chat.completions.create({
    model: getOpenRouterModel(),
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: 'Ты планировщик дня. Возвращай только валидный JSON по заданной схеме.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned empty planner response');
  }

  const parsed = extractJson(content);
  return normalizePlan(parsed, input);
}

async function repairPlanWithModel(plan: NateDayPlan, input: NateDayPlanRequest, validation: PlanValidationResult): Promise<NateDayPlan | null> {
  try {
    const client = createOpenRouterClient();
    const completion = await client.chat.completions.create({
      model: getOpenRouterModel(),
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Ты repair-layer для плана дня Нейта. Верни только валидный JSON по исходной схеме. Исправляй только critical violations, минимальными изменениями, сохраняя намерение пользователя, если оно не противоречит правилам.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              input,
              original_plan: plan,
              violations: validation.violations,
              repair_rules: [
                'Fix critical violations first.',
                'Preserve user intent when it does not conflict with Nate rules.',
                'Do not rewrite warning-only issues.',
                'Keep requires_confirmation=true.',
                'Return JSON only.',
              ],
            },
            null,
            2,
          ),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    return normalizePlan(extractJson(content), input);
  } catch {
    return null;
  }
}

const isMonday = (date?: string) => {
  if (!date) {
    return false;
  }

  return new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
};

const taskSearchText = (task: { title: string; area: string }) => `${task.title} ${task.area}`.toLowerCase();

const hasHighPriorityTradingTask = (snapshot: NateOperationalSnapshot) => {
  return snapshot.open_tasks.some((task) => {
    if (!task || typeof task !== 'object') {
      return false;
    }

    const row = task as Record<string, unknown>;
    const area = typeof row.area === 'string' ? row.area.toLowerCase() : '';
    const priority = typeof row.priority === 'string' ? row.priority.toLowerCase() : String(row.priority || '').toLowerCase();
    return area === 'trading' && priority === 'high';
  });
};

const hasExplicitTradingRelevance = (input: NateDayPlanRequest, snapshot: NateOperationalSnapshot) => {
  return (
    textIncludesAny(input.user_message, ['трейдинг', 'журнал', 'сделка', 'сделк', 'план по активам', 'рынок']) ||
    isMonday(input.date) ||
    hasHighPriorityTradingTask(snapshot)
  );
};

function applyMinimalPlannerCleanup(plan: NateDayPlan, input: NateDayPlanRequest, snapshot: NateOperationalSnapshot): NateDayPlan {
  const fixedCommitments = [...plan.fixed_commitments];
  const mainTasks = [...plan.main_tasks];
  let supportTasks = [...plan.support_tasks];
  const optionalTasks = [...plan.optional_tasks];
  const doNotDo = [...plan.do_not_do];
  const warnings = [...plan.plan_quality_warnings];
  const protectedSunday = isWeekendProtected(input);

  if (protectedSunday && !fixedCommitments.some((item) => item.title === 'Воскресенье с Настей / отдых')) {
    fixedCommitments.push({ title: 'Воскресенье с Настей / отдых', area: 'relationships', estimated_minutes: null });
  }

  if (protectedSunday) {
    const blockedSupport = supportTasks.filter((task) => {
      const text = taskSearchText(task);
      return (
        task.area === 'nate' ||
        task.area === 'finance' ||
        task.area === 'work' ||
        text.includes('kokontsev') ||
        text.includes('нейт') ||
        text.includes('backtest') ||
        text.includes('бэктест') ||
        text.includes('deep') ||
        text.includes('deep study')
      );
    });

    if (blockedSupport.length) {
      optionalTasks.push(
        ...blockedSupport.map((task) => ({
          title: task.title,
          area: task.area,
          estimated_minutes: task.estimated_minutes,
          condition: 'только если воскресенье уже сохранено для Насти и отдыха',
        })),
      );
      supportTasks = supportTasks.filter((task) => !blockedSupport.includes(task));
      warnings.push('Protected Sunday cleanup moved Nate/work/finance/deep support tasks to optional_tasks.');
      doNotDo.push('Не делать Nate/Kokontsev OS, finance, work, backtesting или deep study как обязательную задачу в protected Sunday.');
    }
  }

  if (!hasExplicitTradingRelevance(input, snapshot)) {
    const tradingSupport = supportTasks.filter((task) => task.area === 'trading' || taskSearchText(task).includes('трейдинг'));

    if (tradingSupport.length) {
      optionalTasks.push(
        ...tradingSupport.map((task) => ({
          title: task.title,
          area: task.area,
          estimated_minutes: task.estimated_minutes,
          condition: 'только если сегодня были сделки или нужно закрыть журнал',
        })),
      );
      supportTasks = supportTasks.filter((task) => !tradingSupport.includes(task));
      warnings.push('Trading journal moved to optional_tasks because there is no explicit trading relevance today.');
    }
  }

  if ((userIsLowEnergy(input) || plan.mode === 'recovery') && supportTasks.length > 1) {
    const sortedSupport = [...supportTasks].sort((a, b) => a.estimated_minutes - b.estimated_minutes);
    const keptSupport = sortedSupport.slice(0, 1);
    const movedSupport = supportTasks.filter((task) => !keptSupport.includes(task));

    optionalTasks.push(
      ...movedSupport.map((task) => ({
        title: task.title,
        area: task.area,
        estimated_minutes: task.estimated_minutes,
        condition: 'только если восстановление не проседает и главная задача закрыта',
      })),
    );
    supportTasks = keptSupport;
    warnings.push('Low energy cleanup kept only one light support task.');
  }

  const estimatedTotal = sumTaskMinutes(mainTasks, supportTasks);

  return {
    ...plan,
    fixed_commitments: fixedCommitments,
    support_tasks: supportTasks,
    optional_tasks: optionalTasks,
    do_not_do: [...new Set(doNotDo)],
    estimated_total_planned_minutes: estimatedTotal,
    plan_quality_warnings: [...new Set(warnings)],
  };
}

function attachValidatorWarnings(plan: NateDayPlan, validation: PlanValidationResult): NateDayPlan {
  const warningMessages = validation.violations
    .filter((violation) => violation.severity === 'warning')
    .map((violation) => violation.message);

  if (!warningMessages.length) {
    return plan;
  }

  const calibration = `Калибровка Нейта: есть предупреждения по плану (${warningMessages.length}). Проверь, не распыляешься ли ты и не вытесняешь ли главный фокус.`;

  return {
    ...plan,
    validator_warnings: warningMessages,
    nate_comment: plan.nate_comment.includes('Калибровка Нейта') ? plan.nate_comment : `${plan.nate_comment}\n\n${calibration}`,
  };
}

export async function generateNateDayPlan(input: NateDayPlanRequest): Promise<GenerateDayPlanResult> {
  const date = input.date || todayIsoDate();
  const normalizedInput = { ...input, date };
  const context = await loadNateContext({ scope: 'planning', projects: input.projects });
  const snapshot = await loadOperationalSnapshot(normalizedInput);
  const prompt = buildPlannerPrompt(normalizedInput, context.combined_context, snapshot);

  let modelFallback = false;
  let plan: NateDayPlan;
  let repairedByModel = false;
  let hardGuardrailsApplied = false;

  try {
    plan = await callOpenRouterPlanner(prompt, normalizedInput);
  } catch {
    modelFallback = true;
    plan = buildFallbackPlan(normalizedInput);
  }

  const validationContext = {
    isStudySprint: true,
    operationalSnapshot: snapshot,
  };

  plan = applyMinimalPlannerCleanup(plan, normalizedInput, snapshot);
  let validation = validateDayPlan(plan, normalizedInput, validationContext);

  if (validation.severity === 'critical' && !modelFallback) {
    const repairedPlan = await repairPlanWithModel(plan, normalizedInput, validation);

    if (repairedPlan) {
      const cleanedRepairedPlan = applyMinimalPlannerCleanup(repairedPlan, normalizedInput, snapshot);
      const repairedValidation = validateDayPlan(cleanedRepairedPlan, normalizedInput, validationContext);
      if (repairedValidation.severity !== 'critical') {
        plan = cleanedRepairedPlan;
        validation = repairedValidation;
        repairedByModel = true;
      }
    }
  }

  if (validation.severity === 'critical') {
    plan = normalizeDayPlan(plan, normalizedInput, validationContext);
    plan = applyMinimalPlannerCleanup(plan, normalizedInput, snapshot);
    validation = validateDayPlan(plan, normalizedInput, validationContext);
    hardGuardrailsApplied = true;
  }

  if (validation.severity === 'warning') {
    plan = attachValidatorWarnings(plan, validation);
  }

  return {
    plan,
    metadata: {
      date,
      model: getOpenRouterModel(),
      model_fallback: modelFallback,
      validator: {
        ...validation,
        repaired_by_model: repairedByModel,
        hard_guardrails_applied: hardGuardrailsApplied,
      },
      context_character_count: context.metadata.character_count,
      used_sections: context.sections.map((section) => section.path),
    },
  };
}
