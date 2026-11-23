import { GoogleGenAI } from '@google/genai';
import { GEMINI_KEY_HEADER, isGeminiKey } from '../shared/geminiKey.js';
import { GEMINI_NEON_MODEL } from '../shared/models.js';
import { geminiApiKeys } from '../server/apiKeys.js';
import { requireSession } from '../server/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireSession(req, res)) return;

  if (req.method === 'GET') {
    const gemini = geminiApiKeys().length > 0;
    const openrouter = Boolean(process.env.OPENROUTER_API_KEY);
    return res.status(200).json({
      ready: gemini || openrouter, providers: { gemini, openrouter },
      primary: process.env.AI_PRIMARY_PROVIDER === 'openrouter' ? 'openrouter' : 'gemini',
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET or POST.' });
  }

  const apiKey = req.headers[GEMINI_KEY_HEADER];
  if (!isGeminiKey(apiKey)) return res.status(400).json({ error: 'Enter a valid Gemini API key.' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const httpOptions = { timeout: 6000 };
    let neon = false;
    try {
      const model = await ai.models.get({ model: GEMINI_NEON_MODEL, config: { httpOptions } });
      neon = Boolean(model.supportedActions?.includes('generateContent'));
    } catch (error) {
      const status = Number((error as {status?: number})?.status);
      if (status !== 403 && status !== 404) throw error;
      // Check the key separately when the project cannot access Neon.
      await ai.models.list({ config: { pageSize: 1, httpOptions } });
    }
    return res.status(200).json({ neon });
  } catch (error) {
    const status = Number((error as {status?: number})?.status);
    if ([400, 401, 403].includes(status)) {
      return res.status(400).json({ error: 'Google rejected this Gemini API key. Check the key and its API permissions in Google AI Studio.' });
    }
    return res.status(502).json({ error: 'Could not check the key with Google. Try again shortly.' });
  }
}
