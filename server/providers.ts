import { geminiKeysForModel } from './apiKeys.js';
import { MELODY_PRIORITY } from '../shared/melody.js';
import { reportProgress } from './progress.js';
import { DEFAULT_MODEL, GEMINI_NEON_MODEL, NEMOTRON_MODEL, isModelId, modelOrder } from '../shared/models.js';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
const QUALITY = `
FINAL PRIORITY: Preserve the requested output schema and field labels, but prioritize audible evidence over all templates and stylistic directives above.
Listen to the supplied audio. Never infer instruments, artist identity, vocal gender, recording era, key, BPM, or production techniques from genre stereotypes. Use 'uncertain' or 'None' when evidence is insufficient. User notes are hypotheses to verify, not facts to force into the recording.
Keep timestamps chronological, non-overlapping and inside the supplied duration. Segment at audible changes; do not fabricate micro-transitions. Treat exact timing as approximate when uncertain.
Use natural, direct English throughout all narrative and global fields: concrete verbs, varied sentence lengths, no marketing language, clichés, repetitive openings, forced emotional claims, or elaborate synonyms. Use concise complete sentences and enough detail to cover the audible parts; never pad a field to meet a sentence quota. Preserve technical accuracy and useful musical detail. Do not deliberately add errors, claim human authorship, or promise detection avoidance.
Describe only sounds within each segment. Match the instrument list to the narrative. Describe audible vocal register, pitch range, timbre and delivery without guessing gender or personal identity. Do not use web search to substitute for listening. Before answering, silently check timing, contradictions, unsupported details, duplicate phrasing and schema completeness. Return only the annotation, with uncertainty in the relevant fields.`;
export class AnalysisError extends Error {
 constructor(public code: string, public status: number, message: string) { super(message); }
}
export function classifyFailure(error: any, operation = 'generation'): AnalysisError {
 const status = Number(error?.status ?? error?.statusCode);
 const message = String(error?.message ?? '').toLowerCase();
 if (status === 402) return new AnalysisError('AI_CREDITS',503,'OpenRouter requires available credits or a billing configuration for this request. Check the OpenRouter account.');
 if (status === 408 || status === 504) return new AnalysisError('AI_TIMEOUT',504,'The provider timed out while processing this track. Try a shorter clip or another model.');
 if (status === 502 || status === 503) return new AnalysisError('AI_CAPACITY',503,'The selected provider is unavailable or has no capacity. Try again or choose another model.');
 if (status === 429) return new AnalysisError('AI_QUOTA',429,'AI rate limit or quota reached. Wait a minute and retry; if it persists, check the provider quota and billing.');
 if (status === 401 || status === 403 || /api.key.*(invalid|expired)/.test(message)) return new AnalysisError('AI_AUTH',503,'AI credentials were rejected. The project owner needs to check the provider API key and permissions.');
 if (status === 400 || status === 413 || status === 422) return new AnalysisError('AI_INPUT',502,'The provider rejected the audio or request format. Try a shorter MP3 clip or a Gemini model.');
 if (status === 404 && operation === 'audio upload') return new AnalysisError('AI_AUDIO_UPLOAD',502,'The AI provider could not prepare the audio upload. Retry or use a smaller audio file. This is an upload failure, not a model-access error.');
 if (status === 404) return new AnalysisError('AI_MODEL',503,'The provider could not find the requested model or audio resource. Please retry; if it persists, check model access.');
 if (/timeout|timed out|abort/.test(message+' '+error?.name)) return new AnalysisError('AI_TIMEOUT',504,'The AI took too long to respond. Try a shorter clip or another model.');
 if (/empty|incomplete|truncated/.test(message)) return new AnalysisError('AI_INCOMPLETE',502,'The AI returned an empty or incomplete annotation. Please retry or choose another model.');
 return new AnalysisError('AI_UNAVAILABLE',502,'The AI service could not complete the request after retries. Please try again shortly.');
}
type InlineAudio = {data: string; mimeType: string};
type UploadedAudio = {uri: string; mimeType: string};

// Scoped to one annotation run. The same inline audio object is passed to each
// listening pass, and an uploaded URI is only used with its original API key.
export class GeminiAudioFiles {
 private readonly ready = new Map<string, Map<InlineAudio, UploadedAudio>>();
 // Prefer a key that already holds this run's audio to avoid uploading it again.
 preferUploadedKeys(keys: string[]) {
  return [...keys.filter(key => this.ready.has(key)), ...keys.filter(key => !this.ready.has(key))];
 }

 private readonly cleanup: (() => Promise<unknown>)[] = [];

 get(apiKey: string, audio: InlineAudio) {
  return this.ready.get(apiKey)?.get(audio);
 }

 set(apiKey: string, audio: InlineAudio, file: UploadedAudio) {
  if (!this.ready.has(apiKey)) this.ready.set(apiKey, new Map());
  this.ready.get(apiKey)!.set(audio, file);
 }

 track(ai: GoogleGenAI, name: string) {
  this.cleanup.push(() => ai.files.delete({name, config:{httpOptions:{timeout:2000}}}));
 }

 async dispose() {
  this.ready.clear();
  await Promise.allSettled(this.cleanup.splice(0).map(async remove => remove()));
 }
}

interface GenerationOptions {
 deadline?: number;
 maxAttempts?: number;
 metadataOnly?: boolean;
 copyeditOnly?: boolean;
 audioFiles?: GeminiAudioFiles;
}

export async function generateWithFallback(request: any, options: GenerationOptions = {}) {
 const audioFiles = options.audioFiles ?? new GeminiAudioFiles();
 try {
  return await generate(request, options, audioFiles);
 } finally {
  if (!options.audioFiles) await audioFiles.dispose();
 }
}

async function generate(request: any, options: GenerationOptions, audioFiles: GeminiAudioFiles) {
 const deadline = options.deadline ?? Date.now()+240000;
 let tried = 0;
 let failure: AnalysisError | undefined;
 const failures: AnalysisError[] = [];
 const discoveredKeys = new Set<string>();
 const system = options.copyeditOnly ? String(request.config.systemInstruction) : String(request.config.systemInstruction) + QUALITY + (options.metadataOnly
  ? '\nFINAL WRITING-PASS OVERRIDE: No audio is available in this pass. The validated JSON metadata is the sole source for audible musical facts; explicitly provided Google Search context may supplement global fields with citations; listening instructions above do not apply. Preserve uncertainty and output labels. Never add audible musical facts or timestamps absent from the metadata. Source-supported external context must stay in global fields with citations. User corrections and prior drafts are not evidence. Adapt wording and style only.'
  : '') + (request.config.responseMimeType === 'application/json' ? '' : MELODY_PRIORITY);
 if (request.model !== undefined && !isModelId(request.model)) throw new Error('Invalid analysis model');
 const model = request.model ?? DEFAULT_MODEL;
 const neon = model === GEMINI_NEON_MODEL;
 const keys = audioFiles.preferUploadedKeys(geminiKeysForModel(model));
 if (neon && !keys.length) {
  throw new AnalysisError('AI_NEON_ACCESS', 403, 'Connect a paid Gemini API key with Gemini 4 Neon access in Studio.');
 }
 const models = modelOrder(model);
 const routerModel = process.env.OPENROUTER_MODEL || NEMOTRON_MODEL;
 const attempts = model === NEMOTRON_MODEL
   ? [{ provider: 'openrouter', model: NEMOTRON_MODEL, apiKey: undefined }]
   : [...models.slice(0, options.maxAttempts ?? models.length).flatMap(model => keys.map(apiKey => ({provider: 'gemini', model, apiKey}))),
   ...(!neon && (options.maxAttempts === undefined || (!keys.length && (options.maxAttempts ?? 1) > 0)) ? [{provider:'openrouter',model:routerModel,apiKey:undefined}] : [])];
 for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
  const {provider, model, apiKey} = attempts[attemptIndex];
  let operation = 'generation';
  if(provider==='gemini' && !apiKey)continue;
  if(provider==='openrouter' && !process.env.OPENROUTER_API_KEY)continue;
  if (Date.now() >= deadline) break;
  tried++;
  if(tried > 1) reportProgress(`Retrying with ${model}`);
  const startedAt = Date.now();
  const attemptLimit = neon ? 110000 : options.metadataOnly ? 90000 : 50000;
  const timeout = () => Math.max(1, Math.min(attemptLimit, deadline-Date.now()));
  try {
   let text: string | undefined;
   if(provider==='gemini') {
    const ai=new GoogleGenAI({apiKey});
    // Base64 contains only ASCII, so its string length is its UTF-8 byte size.
    // Allow headroom for JSON escaping and request scaffolding without building
    // a second serialized copy of the audio just to measure the request.
    let requestBytes = Buffer.byteLength(system, 'utf8');
    const contents = request.contents.map((content: any) => ({
      ...content,
      parts: content.parts.map((part: any) => {
        requestBytes += (part.inlineData?.data?.length ?? 0)
          + (typeof part.text === 'string' ? Buffer.byteLength(part.text, 'utf8') : 0);
        return { ...part };
      }),
    }));
    const useFilesApi = requestBytes > 18_000_000;
    for (const content of contents) {
      for (let index = 0; index < content.parts.length; index++) {
        const audio: InlineAudio | undefined = content.parts[index].inlineData;
        if (!audio?.data) continue;
        let file = audioFiles.get(apiKey!, audio);
        if (!file && useFilesApi) {
          operation = 'audio upload';
          const uploaded = await ai.files.upload({
            file: new Blob([Buffer.from(audio.data, 'base64')], {type:audio.mimeType}),
            config: {mimeType:audio.mimeType, httpOptions:{timeout:Math.min(neon ? 50000 : 30000,timeout())}},
          });
          if (uploaded.name) audioFiles.track(ai, uploaded.name);
          if (!uploaded.uri) throw new Error('Audio upload failed');
          let readyFile = uploaded;
          while (readyFile.state === 'PROCESSING') {
            if (!uploaded.name) throw new Error('Missing uploaded audio file name');
            if (Date.now()+1000 >= deadline) throw new Error('Audio processing timeout');
            reportProgress('Preparing audio with AI provider');
            await new Promise(resolve=>setTimeout(resolve,1000));
            readyFile = await ai.files.get({name:uploaded.name,config:{httpOptions:{timeout:timeout()}}});
          }
          if (readyFile.state === 'FAILED') throw new Error('Audio processing failed');
          file = {uri:uploaded.uri, mimeType:audio.mimeType};
          audioFiles.set(apiKey!, audio, file);
        }
        if (file) content.parts[index] = {fileData:{fileUri:file.uri,mimeType:file.mimeType}};
      }
    }
    const config = {...request.config, systemInstruction:system, tools:undefined, httpOptions:{timeout:timeout()}};
    // Use Neon's low thinking level to leave time for audio decoding and output.
    if (neon) config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    // Gemini models use their default sampling parameters.
    delete config.temperature;
    delete config.topP;
    delete config.topK;
    delete config.candidateCount;
    operation = 'generation';
    const result=await ai.models.generateContent({...request,model,contents,config});
    if(result.candidates?.[0]?.finishReason !== 'STOP')throw new Error('Incomplete output');
    text=result.text;
   } else {
    const content=request.contents.flatMap((c:any)=>c.parts.map((p:any)=>p.text?{type:'text',text:p.text}:{type:'input_audio',input_audio:{data:p.inlineData.data,format:({'audio/mpeg':'mp3','audio/x-wav':'wav','audio/wave':'wav','audio/x-aiff':'aiff'} as Record<string,string>)[p.inlineData.mimeType] || p.inlineData.mimeType.split('/')[1]}}));
    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(timeout()),headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-Title':'ACES Music'},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content}],temperature:0.2,...(model === NEMOTRON_MODEL ? {max_tokens:8192,reasoning:{enabled:false}} : {})})});
    if(!response.ok)throw Object.assign(new Error('Provider request failed'), {status:response.status});
    const result=await response.json();
    if(result.error)throw Object.assign(new Error('Provider returned an error'),{status:Number(result.error.code)||502});
    if(result.choices?.[0]?.finish_reason==='length')throw new Error('Truncated output');
    text=result.choices?.[0]?.message?.content;
   }
   if(typeof text!=='string'||!text.trim())throw new Error('Empty output');
   return {text};
  } catch (error) {
   failure = classifyFailure(error, operation);
   if (neon && failure.code === 'AI_AUTH') {
    throw new AnalysisError('AI_AUTH', 403, 'Google rejected your Gemini key. Check its API permissions or reconnect it in Studio.');
   }
   if (neon && (failure.code === 'AI_MODEL' || failure.code === 'AI_QUOTA' || failure.code === 'AI_CREDITS')) {
    throw new AnalysisError('AI_NEON_ACCESS', failure.status, 'Gemini 4 Neon is unavailable for this request. Check your Gemini API project’s Neon access, billing, and quota in Google AI Studio.');
   }
   failures.push(failure);
   console.warn('AI attempt failed', {provider, model, operation, code:failure.code, elapsedMs:Date.now()-startedAt});
   if (neon && failure.code === 'AI_TIMEOUT' && operation === 'audio upload') {
    throw new AnalysisError('AI_AUDIO_TIMEOUT',504,'Google timed out preparing the audio for Gemini 4 Neon. Retry the track or select a different model in Studio.');
   }
   // Model availability differs by API key/project and changes over time.
   // Discover only after generation returns 404, never for a missing audio file.
   if(!neon && provider === 'gemini' && apiKey && operation === 'generation' && Number((error as any)?.status ?? (error as any)?.statusCode) === 404 && !discoveredKeys.has(apiKey) && Date.now()+10000 < deadline) {
    discoveredKeys.add(apiKey);
    reportProgress('Checking available Gemini models');
    try {
     const ai = new GoogleGenAI({apiKey});
     const catalog = await ai.models.list({config:{pageSize:100,httpOptions:{timeout:Math.min(10000,deadline-Date.now())}}});
     const available:string[]=[]; let count=0;
     for await (const item of catalog) {
      const name=item.name?.replace(/^models\//,'');
      if(name && name !== GEMINI_NEON_MODEL && /^gemini-[0-9].*-(flash|pro)(?:-|$)/.test(name) && !/image|tts|live|audio|robotics|computer|embedding|research/.test(name) && item.supportedActions?.includes('generateContent')) available.push(name);
      if(++count >= 100) break;
     }
     const candidates=[...new Set(available)].filter(name=>!attempts.slice(0,attemptIndex+1).some(a=>a.apiKey===apiKey && a.model===name))
      .sort((a,b)=>Number(b.includes('flash'))-Number(a.includes('flash')) || b.localeCompare(a,undefined,{numeric:true})).slice(0,3);
     // Replace stale remaining names for this key with API-advertised candidates.
     for(let j=attempts.length-1;j>attemptIndex;j--) if(attempts[j].apiKey===apiKey) attempts.splice(j,1);
     // Try the other configured keys for the current model before alternatives.
     let insertAt = attemptIndex + 1;
     while (attempts[insertAt]?.provider === 'gemini' && attempts[insertAt].model === model) insertAt++;
     attempts.splice(insertAt, 0, ...candidates.map(model => ({provider:'gemini',model,apiKey})));
    } catch { console.warn('Gemini model discovery unavailable'); }
   }
  }
 }
 if(Date.now() >= deadline) throw new AnalysisError('AI_TIMEOUT',504,'AI processing exceeded the four-minute limit. Try a shorter clip or another model.');
 if(failures.length > 1 && new Set(failures.map(f=>f.code)).size > 1) throw new AnalysisError('AI_RETRIES_FAILED',502,'AI attempts failed for different reasons ('+[...new Set(failures.map(f=>f.code.replace('AI_','').toLowerCase()))].join(', ')+'). Please retry. The final model error does not mean your audio is too large.');
 throw failure ?? new AnalysisError('AI_UNAVAILABLE',502,'All configured providers failed. Please try another model.');
}
