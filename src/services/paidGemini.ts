import { GEMINI_KEY_HEADER, isGeminiKey } from '../../shared/geminiKey';
import { NEMOTRON_MODEL } from '../../shared/models';

// Keep the user's credential in memory for this signed-in tab.
let personalKey: string | undefined;

export function setPaidGeminiKey(key?: string) {
  personalKey = key;
}

export function paidGeminiHeaders(model: unknown): Record<string, string> {
  return personalKey && model !== NEMOTRON_MODEL ? { [GEMINI_KEY_HEADER]: personalKey } : {};
}

export async function checkPaidGeminiKey(key: string, signal: AbortSignal): Promise<{neon: boolean}> {
  if (!isGeminiKey(key)) throw new Error('Enter a valid Gemini API key from Google AI Studio.');
  const response = await fetch('/api/status', {
    method: 'POST',
    headers: { [GEMINI_KEY_HEADER]: key },
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.neon !== 'boolean') {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not check the Gemini key. Try again.');
  }
  return { neon: data.neon };
}
