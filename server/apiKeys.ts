import { randomInt } from 'node:crypto';

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

export function orderedGeminiKeys(): string[] {
  const keys = geminiApiKeys();
  if (!keys.length) return [];
  // Random starting key distributes independent serverless invocations.
  const start = randomInt(keys.length);
  return [...keys.slice(start), ...keys.slice(0,start)];
}
