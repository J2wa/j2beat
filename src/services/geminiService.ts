import { DEFAULT_MODEL, type ModelId } from '../../shared/models';
import { splitResearch } from '../../shared/research';
import { put } from "@vercel/blob/client";
const progress = (stage:string) => window.dispatchEvent(new CustomEvent('analysis-progress',{detail:stage}));

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
// Credentials and prompt assembly live exclusively in the server function.
async function request(audioFile: File, options: Record<string, unknown>): Promise<string> {
  progress('Preparing audio upload');
  let audio: {data?:string;path?:string;type:string};
  const type=audioFile.type || (audioFile.name.endsWith('.wav')?'audio/wav':'audio/mpeg');
  if(audioFile.size > 3*1024*1024) {
    if(audioFile.size>100*1024*1024)throw new Error('Audio uploads currently support files up to 100 MB.');
    const extension=audioFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'') || 'mp3';
    const pathname = `audio/${crypto.randomUUID()}.${extension}`;
    progress('Requesting upload permission');
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('/api/upload', {method:'POST', signal:AbortSignal.timeout(30000), headers:{'Content-Type':'application/json'}, body:JSON.stringify({type:'blob.generate-client-token',payload:{pathname,multipart:true,clientPayload:null}})});
    } catch { throw new Error('Upload permission request timed out or could not connect. The AI has not started. Check your connection and retry.'); }
    const tokenBody = await tokenResponse.json().catch(()=>({}));
    if(!tokenResponse.ok || !tokenBody.clientToken) throw new Error(errorMessage(tokenBody.error, 'Could not authorize the audio upload. Sign in again and retry. The AI has not started.'));
    progress('Uploading audio — 0%');
    let blob;
    try {
      blob = await put(pathname,audioFile,{token:tokenBody.clientToken,abortSignal:AbortSignal.timeout(120000),access:'private',multipart:true,contentType:type,
        onUploadProgress:({percentage})=>progress(percentage >= 100 ? 'Finalizing audio upload' : `Uploading audio — ${Math.floor(percentage)}%`)});
    } catch { throw new Error('Audio upload failed or exceeded 2 minutes. The AI has not started. Check your connection or try a smaller audio file.'); }
    audio={path:blob.pathname,type};
  } else {
  progress('Reading audio file');
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
    body: JSON.stringify({ audio, songHint: audioFile.name.slice(0, 500), ...options }),
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
          if(event.error) throw new Error(errorMessage(event.error, 'AI analysis failed. Your input is preserved. Please retry.'));
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
  if (!response.ok) throw new Error(errorMessage(body.error, `Analysis failed (HTTP ${response.status}). Your input is preserved. Please retry.`));
  if (!body.text) throw new Error('The server returned an empty annotation. Please retry.');
  return body.text;
}
export function annotateAudio(audioFile: File, isSimplified = false, isHighAccuracy = false, creativeGuidance = '', audioDuration = 0, activeProfile = 'PRODUCER', annotationProfile = 'default', model: ModelId = DEFAULT_MODEL) {
  return request(audioFile, {action:'annotate', isSimplified, isHighAccuracy, creativeGuidance, audioDuration, activeProfile, annotationProfile, model});
}
export function refineAnnotation(audioFile: File, previousResult: string, feedback: string, isSimplified = false, isHighAccuracy = false, creativeGuidance = '', audioDuration = 0, activeProfile = 'PRODUCER', annotationProfile = 'default', model: ModelId = DEFAULT_MODEL) {
  return request(audioFile, {action:'refine', previousResult:splitResearch(previousResult).annotation, feedback, isSimplified, isHighAccuracy, creativeGuidance, audioDuration, activeProfile, annotationProfile, model});
}
