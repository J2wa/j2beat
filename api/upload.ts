import { requireSession } from '../server/auth.js';
import { handleUpload } from '@vercel/blob/client';
export default async function handler(req:any,res:any) {
 if (!requireSession(req, res)) return;
 if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
 try {
  const result=await handleUpload({body:req.body,request:req,onBeforeGenerateToken:async(pathname)=>{
   if(!/^audio\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(pathname))throw new Error('Invalid audio path');
   return {allowedContentTypes:['audio/*'],maximumSizeInBytes:100*1024*1024,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+30*60*1000};
  }});
  res.status(200).json(result);
 }catch{res.status(503).json({error:'Audio storage is unavailable. Connect the private j2beat-audio Blob store to this Vercel project.'});}
}
