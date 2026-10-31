import { annotateAudio, refineAnnotation } from '../server/annotation.js';
export const config = { maxDuration: 120 };
export default async function handler(req: any, res: any) {
 res.setHeader('Cache-Control', 'no-store');
 if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({error:'Use POST for analysis.'}); }
 if (!process.env.GEMINI_API_KEY) return res.status(503).json({error:'AI analysis is not configured. The project owner must add GEMINI_API_KEY in Vercel.'});
 const b = req.body;
 if (!b || !['annotate','refine'].includes(b.action) || !b.audio || typeof b.audio.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.audio.data) || typeof b.audio.type !== 'string' || !/^audio\/[a-z0-9.+-]+$/i.test(b.audio.type)) return res.status(400).json({error:'Provide a valid audio file.'});
 if (b.audio.data.length > 4194304) return res.status(413).json({error:'AI uploads must be under 3 MB. Use a compressed MP3.'});
 if (![b.creativeGuidance,b.feedback,b.previousResult].every(v => v === undefined || (typeof v === 'string' && v.length <= 120000))) return res.status(400).json({error:'The supplied text is invalid or too long.'});
 if (b.action === 'refine' && (!b.previousResult || !b.feedback?.trim())) return res.status(400).json({error:'Provide an annotation and correction instructions.'});
 const profiles=['PRODUCER','VOCAL','R&B','SOLOIST','ACOUSTIC','TEXTURE','RHYTHM','EXPERT','AMBIENT','DYNAMICS'];
 if (!profiles.includes(b.activeProfile) || !['default','brief'].includes(b.annotationProfile) || typeof b.audioDuration !== 'number' || !Number.isFinite(b.audioDuration) || b.audioDuration < 0) return res.status(400).json({error:'Invalid analysis settings.'});
 try {
   const args = [b.audio, !!b.isSimplified, !!b.isHighAccuracy, b.creativeGuidance || '', b.audioDuration, b.activeProfile, b.annotationProfile] as const;
   const text = b.action === 'refine'
    ? await refineAnnotation(b.audio,b.previousResult,b.feedback,...args.slice(1) as [boolean,boolean,string,number,string,string])
    : await annotateAudio(...args);
   return res.status(200).json({text});
 } catch { return res.status(502).json({error:'The AI provider could not complete the analysis. Please retry, or ask the project owner to check the API key and model availability. Your input has been preserved.'}); }
}
