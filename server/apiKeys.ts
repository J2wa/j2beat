import { AsyncLocalStorage } from 'node:async_hooks';
import { GEMINI_NEON_MODEL } from '../shared/models.js';

export const geminiKeyContext = new AsyncLocalStorage<string | undefined>();

// Server-only; never return key values through API responses or progress events.
export function geminiApiKeys(): string[] {
  const numbered = Object.entries(process.env)
    .filter(([name]) => /^GEMINI_API_KEY_(?:[1-9]|10)$/.test(name))
    .sort(([a],[b]) => Number(a.split('_').at(-1)) - Number(b.split('_').at(-1)))
    .map(([,value]) => value);
  return [...new Set([process.env.GEMINI_API_KEY, ...numbered,
    ...(process.env.GEMINI_API_KEYS || '').split(/[\s,;]+/)]
    .map(value => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function geminiKeysForModel(model: unknown): string[] {
  if (model !== GEMINI_NEON_MODEL) return geminiApiKeys();
  const neonKey = geminiKeyContext.getStore();
  return neonKey ? [neonKey] : [];
}
