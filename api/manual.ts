import { geminiApiKeys } from '../server/apiKeys.js';
import { requireSession } from '../server/auth.js';
import { generateWithFallback } from '../server/providers.js';
import { DEFAULT_MODEL, isModelId, NEMOTRON_MODEL } from '../shared/models.js';
import { MANUAL_MODE_PROMPT } from '../shared/manualMode.js';
export const config = {maxDuration:120};
export default async function handler(req:any,res:any) {
 if (!requireSession(req,res)) return;
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
 const {text,model=DEFAULT_MODEL}=req.body||{};
 if(typeof text!=='string'||!text.trim()||text.length>120000||!isModelId(model))return res.status(400).json({error:'Provide an input sheet up to 120,000 characters.'});
 if ((!geminiApiKeys().length && !process.env.OPENROUTER_API_KEY) || (model === NEMOTRON_MODEL && !process.env.OPENROUTER_API_KEY)) {
  return res.status(503).json({error:'The selected AI provider is not configured.'});
 }
 try {
 const result=await generateWithFallback({model,contents:[{parts:[{text}]}],config:{systemInstruction:MANUAL_MODE_PROMPT}}, {deadline:Date.now()+110000,copyeditOnly:true});
 if(!result.text?.trim() || !result.text.includes('Global Musical Matrix'))throw Error('Empty or incomplete response');
 return res.status(200).json({text:result.text});
 }catch{return res.status(502).json({error:'Writing failed. Your input sheet is unchanged. Please retry.'});}
}
