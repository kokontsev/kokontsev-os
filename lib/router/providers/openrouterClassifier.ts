import OpenAI from 'openai';
import {
  captureAreas,
  captureEnergySignals,
  captureTypes,
  captureUrgencies,
  type CaptureClassification,
  type ClassifyCaptureInput,
} from '@/lib/router/types';

const defaultClassification: CaptureClassification = {
  type: 'unknown',
  title: 'Без названия',
  summary: 'Недостаточно данных для классификации.',
  area: 'unknown',
  project_hint: null,
  urgency: 'unknown',
  energy_signal: 'unknown',
  action_required: false,
  suggested_next_action: 'Добавить больше контекста, если запись требует действия.',
};

const systemPrompt = `Ты классификатор входящих заметок для Kokontsev OS.
Верни только JSON без markdown.
Все summary и recommendations пиши на русском.
Не придумывай лишние детали.
Если данных мало, возвращай unknown в соответствующих полях.
Схема ответа строго:
{
  "type": "task" | "daily_log" | "decision" | "idea" | "blocker" | "state" | "planning_request" | "unknown",
  "title": "short title",
  "summary": "short summary in Russian",
  "area": "work" | "study" | "english" | "sport" | "finance" | "personal" | "system" | "unknown",
  "project_hint": "string or null",
  "urgency": "today" | "this_week" | "this_month" | "later" | "unknown",
  "energy_signal": "low" | "normal" | "high" | "unknown",
  "action_required": true,
  "suggested_next_action": "short recommendation in Russian"
}`;

const isOneOf = <T extends readonly string[]>(value: unknown, allowed: T): value is T[number] =>
  typeof value === 'string' && allowed.includes(value);

function normalizeClassification(value: unknown): CaptureClassification {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('OpenRouter response is not an object');
  }

  const record = value as Record<string, unknown>;

  return {
    type: isOneOf(record.type, captureTypes) ? record.type : 'unknown',
    title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : defaultClassification.title,
    summary: typeof record.summary === 'string' && record.summary.trim() ? record.summary.trim() : defaultClassification.summary,
    area: isOneOf(record.area, captureAreas) ? record.area : 'unknown',
    project_hint: typeof record.project_hint === 'string' && record.project_hint.trim() ? record.project_hint.trim() : null,
    urgency: isOneOf(record.urgency, captureUrgencies) ? record.urgency : 'unknown',
    energy_signal: isOneOf(record.energy_signal, captureEnergySignals) ? record.energy_signal : 'unknown',
    action_required: typeof record.action_required === 'boolean' ? record.action_required : false,
    suggested_next_action:
      typeof record.suggested_next_action === 'string' && record.suggested_next_action.trim()
        ? record.suggested_next_action.trim()
        : defaultClassification.suggested_next_action,
  };
}

export async function classifyCapture(input: ClassifyCaptureInput): Promise<CaptureClassification> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable');
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
      ...(process.env.OPENROUTER_APP_NAME ? { 'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME } : {}),
    },
  });

  const completion = await client.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          source: input.source || 'api',
          text: input.text,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('OpenRouter returned empty response');
  }

  return normalizeClassification(JSON.parse(content.trim()));
}
