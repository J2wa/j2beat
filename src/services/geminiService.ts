import { DEFAULT_MODEL, type ModelId } from '../../shared/models';
import { upload } from "@vercel/blob/client";
// Credentials and prompt assembly live exclusively in the server function.
async function request(audioFile: File, options: Record<string, unknown>): Promise<string> {
  let audio: {data?:string;path?:string;type:string};
  const type=audioFile.type || (audioFile.name.endsWith('.wav')?'audio/wav':'audio/mpeg');
  if(audioFile.size > 3*1024*1024) {
    if(audioFile.size>100*1024*1024)throw new Error('Audio uploads currently support files up to 100 MB.');
    const extension=audioFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'') || 'mp3';
    const blob=await upload(`audio/${crypto.randomUUID()}.${extension}`,audioFile,{access:'private',handleUploadUrl:'/api/upload',multipart:true,contentType:type});
    audio={path:blob.pathname,type};
  } else {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read this audio file."));
    reader.readAsDataURL(audioFile);
  });
  audio={data,type};
  }
  const response = await fetch('/api/annotate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, ...options }),
  });
  const body = await response.json().catch(() => ({error: 'The server could not complete this request. Please try again.'}));
  if (!response.ok) throw new Error(body.error || 'Analysis failed. Please try again.');
  if (!body.text) throw new Error('The server returned an empty annotation. Please retry.');
  return body.text;
}
export function annotateAudio(audioFile: File, isSimplified = false, isHighAccuracy = false, creativeGuidance = '', audioDuration = 0, activeProfile = 'PRODUCER', annotationProfile = 'default', model: ModelId = DEFAULT_MODEL) {
  return request(audioFile, {action:'annotate', isSimplified, isHighAccuracy, creativeGuidance, audioDuration, activeProfile, annotationProfile, model});
}
export function refineAnnotation(audioFile: File, previousResult: string, feedback: string, isSimplified = false, isHighAccuracy = false, creativeGuidance = '', audioDuration = 0, activeProfile = 'PRODUCER', annotationProfile = 'default', model: ModelId = DEFAULT_MODEL) {
  return request(audioFile, {action:'refine', previousResult, feedback, isSimplified, isHighAccuracy, creativeGuidance, audioDuration, activeProfile, annotationProfile, model});
}
