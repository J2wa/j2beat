export const GEMINI_KEY_HEADER = 'x-aces-gemini-key';

export function isGeminiKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{16,512}$/.test(value);
}
