import { geminiApiKeys } from '../server/apiKeys.js';
import { requireSession } from '../server/auth.js';
export default function handler(req: any, res: any) {
 if (!requireSession(req, res)) return;
 res.setHeader('Cache-Control', 'no-store');
 const gemini=geminiApiKeys().length > 0;
 const openrouter=Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);
 res.status(200).json({ready:gemini||openrouter,providers:{gemini,openrouter},primary:process.env.AI_PRIMARY_PROVIDER==='openrouter'?'openrouter':'gemini'});
}
