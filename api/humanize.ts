import { AnalysisError } from '../server/providers.js';
import { musicProseFields } from '../shared/musicHumanizer.js';
import { requireSession } from '../server/auth.js';
import { geminiKeyContext } from '../server/apiKeys.js';
import { modelAccess } from '../server/modelAccess.js';
import { humanizeMusic } from '../server/musicHumanizer.js';
import { isModelId, DEFAULT_MODEL } from '../shared/models.js';
export const config = {maxDuration: 120};
export default async function handler(req: any, res: any) {
  if (!requireSession(req,res)) return;
  if (req.method !== 'POST') {res.setHeader('Allow','POST'); return res.status(405).json({error:'Use POST to humanize wording.'});}
  const {text, model = DEFAULT_MODEL, fieldId, instruction} = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 120000 || !isModelId(model)) return res.status(400).json({error:'Provide a music annotation up to 120,000 characters and a supported model.'});
  if ((fieldId !== undefined && (typeof fieldId !== 'string' || !/^f[0-9]+$/.test(fieldId) || !musicProseFields(text).some(field=>field.id===fieldId))) || (instruction !== undefined && (typeof instruction !== 'string' || instruction.length>2000))) return res.status(400).json({error:'Choose a description and provide revision instructions up to 2,000 characters.'});
  const access = modelAccess(req, res, model);
  if (!access) return;
  try {return res.status(200).json({text:await geminiKeyContext.run(access.geminiKey, () => humanizeMusic(text,model,undefined,{fieldId,instruction}))});}
  catch (error) {if (error instanceof AnalysisError) return res.status(error.status).json({error:error.message}); return res.status(502).json({error:'Could not produce a wording edit that passed validation. Your original is unchanged. Retry or choose another model.'});}
}
