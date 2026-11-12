import { requireSession } from '../server/auth.js';
import { get, del } from '@vercel/blob';
import { IMPORTED_AUDIO_PATH, importedAudioExpiresAt } from '../shared/importExpiry.js';
import { Readable } from 'node:stream';
export default async function handler(req:any,res:any) {
 res.setHeader('Cache-Control','private, no-store');
 if(!requireSession(req,res))return;
 if(!['GET','DELETE'].includes(req.method))return res.status(405).json({error:'Use GET.'});
 const path=req.query.path;
 if(typeof path!=='string'||!IMPORTED_AUDIO_PATH.test(path))return res.status(400).json({error:'Invalid saved audio.'});
 try {
  if(req.method==='DELETE'){await del(path);return res.status(200).json({deleted:true});}
  const stored=await get(path,{access:'private'});
  if(!stored||stored.statusCode!==200)return res.status(404).json({error:'Saved audio was not found.'});
  const expiresAt = importedAudioExpiresAt(stored.blob.uploadedAt);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    await stored.stream.cancel().catch(() => {});
    return res.status(410).json({error:'This imported track expired. Import it again to listen or analyze.'});
  }
  res.setHeader('X-Audio-Expires-At', new Date(expiresAt).toISOString());
  res.setHeader('Content-Type','audio/mpeg');
  Readable.fromWeb(stored.stream as any).pipe(res);
 }catch{return res.status(502).json({error:'Could not load saved audio.'});}
}
