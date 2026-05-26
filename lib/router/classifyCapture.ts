import type { CaptureClassification, ClassifyCaptureInput } from '@/lib/router/types';
import { classifyCapture as classifyWithOpenRouter } from '@/lib/router/providers/openrouterClassifier';
import { classifyCapture as classifyWithRules } from '@/lib/router/providers/rulesClassifier';

function applyDeterministicOverrides(
  input: ClassifyCaptureInput,
  classification: CaptureClassification
): CaptureClassification {
  const text = input.text.trim();
  const normalized = text.toLowerCase();
  const isExplicitTask =
    normalized.includes('добавь задачу') ||
    normalized.includes('добавить задачу') ||
    normalized.includes('задачу:') ||
    normalized.includes('создай задачу') ||
    normalized.includes('нужно ') ||
    normalized.includes('надо ');

  if (!isExplicitTask) {
    return classification;
  }

  return {
    ...classification,
    type: 'task',
    area:
      normalized.includes('speakout') || normalized.includes('английск') || normalized.includes('english')
        ? 'english'
        : classification.area,
    project_hint: normalized.includes('speakout') ? 'Speakout' : classification.project_hint,
    urgency: normalized.includes('завтра') ? 'this_week' : classification.urgency,
    action_required: true,
  };
}

export async function classifyCapture(input: ClassifyCaptureInput): Promise<CaptureClassification> {
  const provider = process.env.LLM_PROVIDER || 'openrouter';

  if (provider === 'rules') {
    return applyDeterministicOverrides(input, await classifyWithRules(input));
  }

  if (provider === 'openrouter') {
    try {
      return applyDeterministicOverrides(input, await classifyWithOpenRouter(input));
    } catch (error) {
      console.warn('OpenRouter classification failed; falling back to rules classifier.');
      return applyDeterministicOverrides(input, await classifyWithRules(input));
    }
  }

  return applyDeterministicOverrides(input, await classifyWithRules(input));
}
