import { progressContext } from '../server/progress.js';
import { AnalysisError } from '../server/providers.js';
import { DEFAULT_MODEL, isModelId, type ModelId } from '../shared/models.js';
import { requireSession } from '../server/auth.js';
import { get, del } from '@vercel/blob';
import { annotateAudio, refineAnnotation } from '../server/annotation.js';
export const config = { maxDuration: 300 };
export default async function handler(req: any, res: any) {
 if (!requireSession(req, res)) return;
 res.setHeader('Cache-Control', 'no-store');
 if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({error:'Use POST for analysis.'}); }
 if (!process.env.GEMINI_API_KEY && !(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL)) return res.status(503).json({error:'AI analysis is not configured. Configure Gemini or OpenRouter in Vercel.'});
 const b = req.body;
 if (b?.model !== undefined && !isModelId(b.model)) return res.status(400).json({error:'Choose a supported analysis model.'});
 if(b?.audio?.path) {
  const path=b.audio.path;
  if(typeof path!=='string'||!/^audio\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(path))return res.status(400).json({error:'Invalid audio reference.'});
  try {
   const stored=await get(path,{access:'private'});
   if(!stored || stored.statusCode!==200 || stored.blob.size>100*1024*1024)throw new Error('Invalid upload');
   b.audio.data=Buffer.from(await new Response(stored.stream).arrayBuffer()).toString('base64');
  }catch{return res.status(400).json({error:'Could not read the audio upload. Please upload again.'});}
  finally{await del(path).catch(()=>{});}
 }
 if (!b || !['annotate','refine'].includes(b.action) || !b.audio || typeof b.audio.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.audio.data) || typeof b.audio.type !== 'string' || !/^audio\/[a-z0-9.+-]+$/i.test(b.audio.type)) return res.status(400).json({error:'Provide a valid audio file.'});
 if (!b.audio.path && b.audio.data.length > 4194304) return res.status(413).json({error:'Use the direct upload flow for this file.'});
 if (b.songHint !== undefined && (typeof b.songHint !== 'string' || b.songHint.length > 500)) return res.status(400).json({error:'Invalid song filename clue.'});
 if (![b.creativeGuidance,b.feedback,b.previousResult].every(v => v === undefined || (typeof v === 'string' && v.length <= 120000))) return res.status(400).json({error:'The supplied text is invalid or too long.'});
 if (b.action === 'refine' && (!b.previousResult || !b.feedback?.trim())) return res.status(400).json({error:'Provide an annotation and correction instructions.'});
 const profiles=['PRODUCER','VOCAL','R&B','SOLOIST','ACOUSTIC','TEXTURE','RHYTHM','EXPERT','AMBIENT','DYNAMICS'];
 if (!profiles.includes(b.activeProfile) || !['default','brief'].includes(b.annotationProfile) || typeof b.audioDuration !== 'number' || !Number.isFinite(b.audioDuration) || b.audioDuration < 0) return res.status(400).json({error:'Invalid analysis settings.'});
 const streaming = req.headers.accept === 'application/x-ndjson';
 const emit = (event:any) => { if (!res.destroyed && !res.writableEnded) res.write(JSON.stringify(event)+'\n'); };
 if(streaming) { res.setHeader('Content-Type','application/x-ndjson'); res.setHeader('X-Accel-Buffering','no'); res.flushHeaders(); emit({stage:'Preparing AI analysis'}); }
 try {
   const args = [b.audio, !!b.isSimplified, !!b.isHighAccuracy, b.creativeGuidance || '', b.audioDuration, b.activeProfile, b.annotationProfile, b.model ?? DEFAULT_MODEL, b.songHint || ''] as const;
   const text = await progressContext.run(stage => {if(streaming) emit({stage});}, async () => b.action === 'refine'
    ? await refineAnnotation(b.audio,b.previousResult,b.feedback,...args.slice(1) as [boolean,boolean,string,number,string,string,ModelId,string])
    : await annotateAudio(...args));
   if(streaming) {emit({text}); return res.end();}
   return res.status(200).json({text});
 } catch (error) { if(streaming) { emit({error:error instanceof AnalysisError ? error.message+' Your input has been preserved.' : 'AI analysis failed. Your input is preserved. Please retry.'}); return res.end(); } if (error instanceof AnalysisError) return res.status(error.status).json({code:error.code,error:error.message+' Your input has been preserved.'}); return res.status(502).json({error:'The AI provider could not complete the analysis. Please retry, or ask the project owner to check the API key and model availability. Your input has been preserved.'}); }
}
