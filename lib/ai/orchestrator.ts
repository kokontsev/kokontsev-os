/**
 * AI Orchestrator
 * 
 * Manages interactions with OpenAI API for:
 * - Message classification
 * - Response generation
 * 
 * TODO: Implement AI integration for v0.1
 */

import type { ClassificationType, ClassificationResponse, AIResponse } from '@/lib/types';

/**
 * Classify a message using OpenAI API
 * 
 * @param content - The message content to classify
 * @param language - The language of the message
 * @returns Classification result with type and confidence
 */
export async function classifyMessage(
  content: string,
  language: string = 'ru'
): Promise<ClassificationResponse> {
  // TODO: Implement OpenAI API call for classification
  // 1. Build few-shot prompt based on classification rules
  // 2. Call OpenAI GPT-4 mini
  // 3. Parse response to extract classification and confidence
  // 4. Handle rate limiting and errors

  throw new Error('Not implemented');
}

/**
 * Generate a response for a classified message
 * 
 * @param content - The original message content
 * @param classification - The classification type
 * @param language - The language for the response
 * @returns Generated response
 */
export async function generateResponse(
  content: string,
  classification: ClassificationType,
  language: string = 'ru'
): Promise<AIResponse> {
  // TODO: Implement OpenAI API call for response generation
  // 1. Build prompt based on classification type
  // 2. Call OpenAI GPT-4 mini
  // 3. Parse response
  // 4. Count tokens used
  // 5. Handle errors

  throw new Error('Not implemented');
}

/**
 * Classification rules and few-shot examples
 * 
 * These are used in the prompts sent to OpenAI
 */
export const classificationRules = {
  task: {
    description: 'An action or activity that needs to be completed',
    examples: [
      'Купить молоко и хлеб',
      'Написать письмо другу',
      'Подумать над архитектурой',
    ],
  },
  daily_log: {
    description: 'A fact, event, or observation from daily life',
    examples: [
      'Сегодня хорошо выспался',
      'Встреча прошла успешно',
      'Я заметил что люблю работать по утрам',
    ],
  },
  solution: {
    description: 'An answer, approach, or method to solve a problem',
    examples: [
      'Интегрировать OpenAI можно через npm package',
      'Проблема была в CORS',
      'Конфликт решается через диалог',
    ],
  },
  idea: {
    description: 'A creative thought, hypothesis, or concept',
    examples: [
      'Можно создать приложение для записи идей',
      'Что если добавить memory module?',
      'Интересно как работает классификация в других системах',
    ],
  },
  blocker: {
    description: 'A problem, obstacle, or risk that needs attention',
    examples: [
      'Не знаю как интегрировать Notion API',
      'OpenAI API дорогой, может быть альтернатива?',
      'Беспокоюсь что система будет медленной',
    ],
  },
  plan_request: {
    description: 'A request to structure information or create a plan',
    examples: [
      'Составь план для v0.1',
      'Как лучше структурировать этот проект?',
      'Дай мне пошаговый план интеграции',
    ],
  },
};
