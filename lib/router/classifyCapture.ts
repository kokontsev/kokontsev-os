import type { CaptureClassification, ClassifyCaptureInput } from '@/lib/router/types';
import { classifyCapture as classifyWithOpenRouter } from '@/lib/router/providers/openrouterClassifier';
import { classifyCapture as classifyWithRules } from '@/lib/router/providers/rulesClassifier';

const hasAny = (text: string, patterns: string[]) => patterns.some((pattern) => text.includes(pattern));

const areaPatterns: Array<{
  area: CaptureClassification['area'];
  patterns: string[];
}> = [
  { area: 'english', patterns: ['английский', 'speakout', 'anki', 'voa'] },
  { area: 'sport', patterns: ['спорт', 'тренировка', 'калистеника', 'зал', 'стойка', 'подтягивания'] },
  { area: 'study', patterns: ['вкр', 'диплом', 'учеба', 'универ'] },
  { area: 'work', patterns: ['работа', 'рабочая задача', 'проект по работе'] },
  { area: 'finance', patterns: ['деньги', 'финансы', 'бюджет'] },
  { area: 'system', patterns: ['бот', 'код', 'codex', 'supabase', 'telegram', 'api', 'notion', 'kokontsev os'] },
];

function detectArea(text: string): CaptureClassification['area'] | null {
  return areaPatterns.find(({ patterns }) => hasAny(text, patterns))?.area || null;
}

function detectMainArea(text: string, llmArea: CaptureClassification['area']): CaptureClassification['area'] {
  const accentMatch = text.match(/акцент на\s+([^,.!?]+)/);
  const tomorrowMatch = text.match(/хочу завтра\s+([^,.!?]+)/);
  const focusedArea = detectArea(accentMatch?.[1] || tomorrowMatch?.[1] || '');

  if (focusedArea) {
    return focusedArea;
  }

  const detectedAreas = areaPatterns.filter(({ patterns }) => hasAny(text, patterns)).map(({ area }) => area);

  if (detectedAreas.length === 1) {
    return detectedAreas[0];
  }

  return llmArea || 'unknown';
}

function detectUrgency(text: string, llmUrgency: CaptureClassification['urgency']): CaptureClassification['urgency'] {
  if (text.includes('сегодня') || text.includes('завтра')) return 'today';
  if (hasAny(text, ['на неделе', 'на неделю', 'ближайшие дни'])) return 'this_week';
  if (text.includes('в этом месяце')) return 'this_month';
  if (hasAny(text, ['потом', 'когда-нибудь', 'позже'])) return 'later';
  return llmUrgency || 'unknown';
}

function detectEnergySignal(
  text: string,
  llmEnergySignal: CaptureClassification['energy_signal']
): CaptureClassification['energy_signal'] {
  if (hasAny(text, ['устал', 'усталость', 'нет сил', 'перегруз', 'нагрузка высокая'])) return 'low';
  if (hasAny(text, ['нормально', 'нормальная энергия'])) return 'normal';
  if (hasAny(text, ['много сил', 'энергия высокая'])) return 'high';
  return llmEnergySignal || 'unknown';
}

export function normalizeClassification(
  rawText: string,
  llmClassification: CaptureClassification
): CaptureClassification {
  const text = rawText.trim().toLowerCase();
  const classification: CaptureClassification = {
    ...llmClassification,
    area: detectMainArea(text, llmClassification.area),
    urgency: detectUrgency(text, llmClassification.urgency),
    energy_signal: detectEnergySignal(text, llmClassification.energy_signal),
  };

  const isPlanningRequest = hasAny(text, [
    'давай',
    'сделаем акцент',
    'перестроим',
    'пересоберем',
    'поменяем план',
    'изменим план',
    'фокус',
    'режим',
    'акцент на',
  ]);
  const isDecision = hasAny(text, [
    'решил',
    'принимаю решение',
    'фиксируем',
    'оставляем так',
    'теперь делаем',
    'с этого момента',
  ]);
  const hasPlanningContext = hasAny(text, ['сделаем акцент', 'план', 'режим']);
  const isTask = hasAny(text, ['добавь задачу', 'нужно', 'надо', 'не забыть', 'сделать', 'завтра сделать']) && !hasPlanningContext;
  const isDailyLog = hasAny(text, ['сегодня', 'сделал', 'не сделал']);
  const isState = !isDailyLog && hasAny(text, ['усталость', 'энергия', 'нагрузка', 'сон']);
  const isBlocker = hasAny(text, ['застрял', 'мешает', 'не получается', 'проблема', 'ошибка', 'не понимаю']);
  const isIdea = text.startsWith('идея:') || text.includes('идея');

  if (isPlanningRequest) {
    return { ...classification, type: 'planning_request', action_required: true };
  }

  if (isDecision) {
    return { ...classification, type: 'decision', action_required: true };
  }

  if (isBlocker) {
    return { ...classification, type: 'blocker', action_required: true };
  }

  if (isIdea) {
    return { ...classification, type: 'idea' };
  }

  if (isTask) {
    return { ...classification, type: 'task', action_required: true };
  }

  if (isDailyLog) {
    return { ...classification, type: 'daily_log' };
  }

  if (isState) {
    return { ...classification, type: 'state' };
  }

  return classification;
}

export async function classifyCapture(input: ClassifyCaptureInput): Promise<CaptureClassification> {
  const provider = process.env.LLM_PROVIDER || 'openrouter';

  if (provider === 'rules') {
    return normalizeClassification(input.text, await classifyWithRules(input));
  }

  if (provider === 'openrouter') {
    try {
      return normalizeClassification(input.text, await classifyWithOpenRouter(input));
    } catch (error) {
      console.warn('OpenRouter classification failed; falling back to rules classifier.');
      return normalizeClassification(input.text, await classifyWithRules(input));
    }
  }

  return normalizeClassification(input.text, await classifyWithRules(input));
}

// Dev examples:
// "Давай на неделю сделаем акцент на спорте, но ВКР не бросаем." => planning_request, sport, decisions
// "Решил временно снизить английский до 20 минут в день." => decision, english, decisions
// "Добавь задачу: завтра 40 минут Speakout." => task, english, tasks
// "Сегодня усталость 7 из 10, сделал работу, английский не трогал." => daily_log, daily_logs
// "Я застрял с подключением Telegram webhook." => blocker, system, tasks
