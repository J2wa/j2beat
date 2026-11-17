import { musicProseFields } from '../shared/musicHumanizer.js';
import { requireSession } from '../server/auth.js';
import { geminiApiKeys } from '../server/apiKeys.js';
import { humanizeMusic } from '../server/musicHumanizer.js';
import { isModelId, DEFAULT_MODEL, NEMOTRON_MODEL } from '../shared/models.js';
export const config = {maxDuration: 120};
export default async function handler(req: any, res: any) {
  if (!requireSession(req,res)) return;
  if (req.method !== 'POST') {res.setHeader('Allow','POST'); return res.status(405).json({error:'Use POST to humanize wording.'});}
  const {text, model = DEFAULT_MODEL, fieldId, instruction} = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 120000 || !isModelId(model)) return res.status(400).json({error:'Provide a music annotation up to 120,000 characters and a supported model.'});
  if ((fieldId !== undefined && (typeof fieldId !== 'string' || !/^f[0-9]+$/.test(fieldId) || !musicProseFields(text).some(field=>field.id===fieldId))) || (instruction !== undefined && (typeof instruction !== 'string' || instruction.length>2000))) return res.status(400).json({error:'Choose a description and provide revision instructions up to 2,000 characters.'});
  if ((!geminiApiKeys().length && !process.env.OPENROUTER_API_KEY) || (model === NEMOTRON_MODEL && !process.env.OPENROUTER_API_KEY)) return res.status(503).json({error:'The selected AI provider is not configured.'});
  try {return res.status(200).json({text:await humanizeMusic(text,model,undefined,{fieldId,instruction})});}
  catch {return res.status(502).json({error:'Could not produce a wording edit that passed validation. Your original is unchanged. Retry or choose another model.'});}
}
