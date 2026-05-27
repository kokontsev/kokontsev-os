import OpenAI from 'openai';

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || 'openrouter/free';
}

export function createOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable');
  }

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
      ...(process.env.OPENROUTER_APP_NAME ? { 'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME } : {}),
    },
  });
}
