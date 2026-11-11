import { requireSession } from '../server/auth.js';
import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
export default async function handler(req:any,res:any) {
 if(!requireSession(req,res))return;
 if(req.method!=='GET')return res.status(405).json({error:'Use GET.'});
 const path=req.query.path;
 if(typeof path!=='string'||!/^music\/[a-f0-9-]{36}\.mp3$/.test(path))return res.status(400).json({error:'Invalid saved audio.'});
 try {
  const stored=await get(path,{access:'private'});
  if(!stored||stored.statusCode!==200)return res.status(404).json({error:'Saved audio was not found.'});
  res.setHeader('Content-Type','audio/mpeg');
  Readable.fromWeb(stored.stream as any).pipe(res);
 }catch{return res.status(502).json({error:'Could not load saved audio.'});}
}
