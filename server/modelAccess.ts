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

  if (model === GEMINI_NEON_MODEL) {
    const key = req.headers[GEMINI_KEY_HEADER];
    if (isGeminiKey(key)) return { geminiKey: key };
    if (key !== undefined) {
      res.status(400).json({ error: 'Enter a valid Gemini API key.' });
    } else {
      res.status(403).json({ error: 'Connect a paid Gemini API key with Gemini 4 Neon access in Studio.' });
    }
    return;
  }

  if (!geminiApiKeys().length && !process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'Ask the project owner to configure a Gemini or OpenRouter key for this model.' });
    return;
  }
  return {};
}
