import { DEFAULT_MODEL, type ModelId } from '../../shared/models';
import { upload } from "@vercel/blob/client";
const progress = (stage:string) => window.dispatchEvent(new CustomEvent('analysis-progress',{detail:stage}));
// Credentials and prompt assembly live exclusively in the server function.
async function request(audioFile: File, options: Record<string, unknown>): Promise<string> {
  progress('Preparing audio upload');
  let audio: {data?:string;path?:string;type:string};
  const type=audioFile.type || (audioFile.name.endsWith('.wav')?'audio/wav':'audio/mpeg');
  if(audioFile.size > 3*1024*1024) {
    if(audioFile.size>100*1024*1024)throw new Error('Audio uploads currently support files up to 100 MB.');
    const extension=audioFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'') || 'mp3';
    const blob=await upload(`audio/${crypto.randomUUID()}.${extension}`,audioFile,{abortSignal:AbortSignal.timeout(120000),access:'private',handleUploadUrl:'/api/upload',multipart:true,contentType:type});
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
  progress('Sending audio to server');
  const response = await fetch('/api/annotate', {
    signal: AbortSignal.timeout(270000),
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept:'application/x-ndjson' },
    body: JSON.stringify({ audio, ...options }),
  }).catch((error) => {
    if(error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new Error('AI processing timed out after 4½ minutes. Your input is preserved. Try a shorter clip or another model.');
    throw new Error('Connection to the analysis server was lost. Check your internet connection and retry.');
  });
  if(response.ok && response.headers.get('content-type')?.includes('application/x-ndjson') && response.body) {
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ''; let text = '';
    try {
      while(true) {
        const {value,done} = await reader.read();
        pending += decoder.decode(value,{stream:!done});
        const lines = pending.split('\n'); pending = lines.pop()!;
        for(const line of lines) if(line.trim()) {
          const event = JSON.parse(line);
          if(event.stage) progress(event.stage);
          if(event.error) throw new Error(event.error);
          if(event.text) text = event.text;
        }
        if(done) break;
      }
    } catch(error) {
      if(error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new Error('AI processing timed out after 4½ minutes. Try a shorter clip or another model.');
      throw error;
    } finally { reader.releaseLock(); }
    if(!text) throw new Error('The connection ended before the annotation finished. Your input is preserved. Please retry.');
    progress('Finished'); return text;
  }
  const body = await response.json().catch(() => ({error: response.status === 504 ? 'The analysis server timed out. Try a shorter clip or another model.' : `Analysis server returned an unexpected response (HTTP ${response.status}). Please retry.`}));
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
