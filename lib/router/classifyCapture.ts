import type { CaptureClassification, ClassifyCaptureInput } from '@/lib/router/types';
import { classifyCapture as classifyWithOpenRouter } from '@/lib/router/providers/openrouterClassifier';
import { classifyCapture as classifyWithRules } from '@/lib/router/providers/rulesClassifier';

export async function classifyCapture(input: ClassifyCaptureInput): Promise<CaptureClassification> {
  const provider = process.env.LLM_PROVIDER || 'openrouter';

  if (provider === 'rules') {
    return classifyWithRules(input);
  }

  if (provider === 'openrouter') {
    try {
      return await classifyWithOpenRouter(input);
    } catch (error) {
      console.warn('OpenRouter classification failed; falling back to rules classifier.');
      return classifyWithRules(input);
    }
  }

  return classifyWithRules(input);
}
