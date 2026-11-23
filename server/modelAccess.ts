import { GEMINI_KEY_HEADER, isGeminiKey } from '../shared/geminiKey.js';
import { GEMINI_NEON_MODEL, NEMOTRON_MODEL, type ModelId } from '../shared/models.js';
import { geminiApiKeys } from './apiKeys.js';

export function modelAccess(req: any, res: any, model: ModelId): { geminiKey?: string } | undefined {
  res.setHeader('Cache-Control', 'no-store');
  if (model === NEMOTRON_MODEL) {
    if (process.env.OPENROUTER_API_KEY) return {};
    res.status(503).json({ error: 'Nemotron requires a configured OpenRouter key. Choose a Gemini model or ask the project owner to configure OpenRouter.' });
    return;
  }

  const key = req.headers[GEMINI_KEY_HEADER];
  if (key !== undefined && !isGeminiKey(key)) {
    res.status(400).json({ error: 'Enter a valid Gemini API key.' });
    return;
  }
  if (model === GEMINI_NEON_MODEL && !key) {
    res.status(403).json({ error: 'Connect a paid Gemini API key with Gemini 4 Neon access in Studio.' });
    return;
  }
  if (!key && !geminiApiKeys().length && !process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'Connect a Gemini API key in Studio or ask the project owner to configure an AI provider.' });
    return;
  }
  return { geminiKey: key };
}
