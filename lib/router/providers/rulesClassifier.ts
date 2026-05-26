import type { CaptureClassification, ClassifyCaptureInput } from '@/lib/router/types';

const truncate = (value: string, maxLength: number) => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trim()}...` : trimmed;
};

const hasAny = (text: string, patterns: string[]) => patterns.some((pattern) => text.includes(pattern));

export async function classifyCapture(input: ClassifyCaptureInput): Promise<CaptureClassification> {
  const text = input.text.trim();
  const normalized = text.toLowerCase();

  let type: CaptureClassification['type'] = 'unknown';
  let actionRequired = false;

  if (hasAny(normalized, ['сделать', 'надо', 'нужно', 'задача', 'купить', 'написать', 'проверить', 'дедлайн'])) {
    type = 'task';
    actionRequired = true;
  } else if (hasAny(normalized, ['решил', 'решение', 'выбираю', 'принял решение'])) {
    type = 'decision';
  } else if (hasAny(normalized, ['идея', 'можно было бы', 'придумал', 'что если'])) {
    type = 'idea';
  } else if (hasAny(normalized, ['блокер', 'застрял', 'не получается', 'проблема', 'мешает', 'риск'])) {
    type = 'blocker';
    actionRequired = true;
  } else if (hasAny(normalized, ['составь план', 'план', 'распланируй', 'как лучше'])) {
    type = 'planning_request';
    actionRequired = true;
  } else if (hasAny(normalized, ['устал', 'энергия', 'настроение', 'состояние', 'выгорел'])) {
    type = 'state';
  } else if (text.length > 0) {
    type = 'daily_log';
  }

  const area: CaptureClassification['area'] = hasAny(normalized, ['английский', 'english'])
    ? 'english'
    : hasAny(normalized, ['спорт', 'тренировка', 'зал', 'бег'])
      ? 'sport'
      : hasAny(normalized, ['деньги', 'финанс', 'бюджет', 'инвест'])
        ? 'finance'
        : hasAny(normalized, ['учеб', 'курс', 'экзамен'])
          ? 'study'
          : hasAny(normalized, ['проект', 'работ', 'клиент', 'созвон'])
            ? 'work'
            : hasAny(normalized, ['система', 'kokontsev', 'router', 'api'])
              ? 'system'
              : 'unknown';

  const urgency: CaptureClassification['urgency'] = hasAny(normalized, ['сегодня', 'срочно', 'до вечера'])
    ? 'today'
    : hasAny(normalized, ['на этой неделе', 'неделя', 'до пятницы'])
      ? 'this_week'
      : hasAny(normalized, ['в этом месяце', 'месяц'])
        ? 'this_month'
        : hasAny(normalized, ['потом', 'когда-нибудь', 'позже'])
          ? 'later'
          : 'unknown';

  const energySignal: CaptureClassification['energy_signal'] = hasAny(normalized, ['устал', 'нет сил', 'выгорел', 'низкая энергия'])
    ? 'low'
    : hasAny(normalized, ['заряжен', 'много сил', 'вдохновение', 'энергии много'])
      ? 'high'
      : 'unknown';

  const title = text ? truncate(text, 80) : 'Без названия';

  return {
    type,
    title,
    summary: text ? truncate(text, 180) : 'Недостаточно данных для классификации.',
    area,
    project_hint: area === 'system' ? 'Kokontsev OS' : null,
    urgency,
    energy_signal: energySignal,
    action_required: actionRequired,
    suggested_next_action: actionRequired
      ? 'Уточнить первый конкретный шаг и срок выполнения.'
      : 'Сохранить запись как контекст и вернуться к ней при обзоре.',
  };
}
