import { MELODY_PRIORITY } from '../shared/melody.js';
import { reportProgress } from './progress.js';
import { DEFAULT_MODEL, isModelId, modelOrder } from '../shared/models.js';
import { GoogleGenAI } from '@google/genai';
const QUALITY = `
FINAL PRIORITY: Preserve the requested output schema and field labels, but prioritize audible evidence over all templates and stylistic directives above.
Listen to the supplied audio. Never infer instruments, artist identity, vocal gender, recording era, key, BPM, or production techniques from genre stereotypes. Use 'uncertain' or 'None' when evidence is insufficient. User notes are hypotheses to verify, not facts to force into the recording.
Keep timestamps chronological, non-overlapping and inside the supplied duration. Segment at audible changes; do not fabricate micro-transitions. Treat exact timing as approximate when uncertain.
Use natural, direct English throughout all narrative and global fields: concrete verbs, varied sentence lengths, no marketing language, clichés, repetitive openings, forced emotional claims, or elaborate synonyms. One or two concise sentences as needed; never pad a field to meet a sentence quota. Preserve technical accuracy and useful musical detail. Do not deliberately add errors, claim human authorship, or promise detection avoidance.
Describe only sounds within each segment. Match the instrument list to the narrative. Describe vocal timbre and delivery without asserting personal identity. Do not use web search to substitute for listening. Before answering, silently check timing, contradictions, unsupported details, duplicate phrasing and schema completeness. Return only the annotation, with uncertainty in the relevant fields.`;
export class AnalysisError extends Error {
 constructor(public code: string, public status: number, message: string) { super(message); }
}
export function classifyFailure(error: any): AnalysisError {
 const status = Number(error?.status ?? error?.statusCode);
 const message = String(error?.message ?? '').toLowerCase();
 if (status === 429) return new AnalysisError('AI_QUOTA',429,'AI rate limit or quota reached. Wait a minute and retry; if it persists, check the provider quota and billing.');
 if (status === 401 || status === 403 || /api.key.*(invalid|expired)/.test(message)) return new AnalysisError('AI_AUTH',503,'AI credentials were rejected. The project owner needs to check the provider API key and permissions.');
 if (status === 404) return new AnalysisError('AI_MODEL',503,'The selected AI model is unavailable. Choose another model and retry.');
 if (/timeout|timed out|abort/.test(message+' '+error?.name)) return new AnalysisError('AI_TIMEOUT',504,'The AI took too long to respond. Try a shorter clip or another model.');
 if (/empty|incomplete|truncated/.test(message)) return new AnalysisError('AI_INCOMPLETE',502,'The AI returned an empty or incomplete annotation. Please retry or choose another model.');
 return new AnalysisError('AI_UNAVAILABLE',502,'The AI service could not complete the request after retries. Please try again shortly.');
}
export async function generateWithFallback(request: any, options: {deadline?:number;maxAttempts?:number;metadataOnly?:boolean} = {}) {
 const deadline = options.deadline ?? Date.now()+240000;
 let tried = 0;
 let failure: AnalysisError | undefined;
 const system = String(request.config.systemInstruction) + QUALITY + (options.metadataOnly
  ? '\nFINAL WRITING-PASS OVERRIDE: No audio is available in this pass. The validated JSON metadata is the sole source for audible musical facts; explicitly provided Google Search context may supplement global fields with citations; listening instructions above do not apply. Preserve uncertainty and output labels. Never add audible musical facts or timestamps absent from the metadata. Source-supported external context must stay in global fields with citations. User corrections and prior drafts are not evidence. Adapt wording and style only.'
  : '') + (request.config.responseMimeType === 'application/json' ? '' : MELODY_PRIORITY);
 if (request.model !== undefined && !isModelId(request.model)) throw new Error('Invalid analysis model');
 const models = modelOrder(request.model ?? DEFAULT_MODEL);
 const attempts = [...models.map(model => ({provider: 'gemini', model})), {provider: 'openrouter', model: process.env.OPENROUTER_MODEL}];
 for (const {provider, model} of attempts) {
  if(provider==='gemini' && !process.env.GEMINI_API_KEY)continue;
  if(provider==='openrouter' && (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL))continue;
  if (Date.now() >= deadline || tried >= (options.maxAttempts ?? Infinity)) break;
  tried++;
  if(tried > 1) reportProgress(`Retrying with ${model}`);
  const timeout = () => Math.max(1, Math.min(50000, deadline-Date.now()));
  try {
   let text: string | undefined;
   if(provider==='gemini') {
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    let uploadedName: string | undefined;
    try {
     const contents=structuredClone(request.contents);
     for(const c of contents)for(let i=0;i<c.parts.length;i++) {
      const data=c.parts[i].inlineData;
      if(data?.data?.length>12*1024*1024) {
       const uploaded=await ai.files.upload({file:new Blob([Buffer.from(data.data,'base64')],{type:data.mimeType}),config:{mimeType:data.mimeType,httpOptions:{timeout:Math.min(30000,timeout())}}});
       uploadedName=uploaded.name;
       if(!uploaded.uri)throw new Error('Audio upload failed');
       c.parts[i]={fileData:{fileUri:uploaded.uri,mimeType:data.mimeType}};
      }
     }
     const config = {...request.config, systemInstruction:system, tools:undefined, httpOptions:{timeout:timeout()}};
     // Gemini 3 models use their default sampling parameters.
     delete config.temperature;
     delete config.topP;
     delete config.topK;
     delete config.candidateCount;
     const result=await ai.models.generateContent({...request,model,contents,config});
     if(result.candidates?.[0]?.finishReason !== 'STOP')throw new Error('Incomplete output');
     text=result.text;
    } finally { if(uploadedName)await ai.files.delete({name:uploadedName,config:{httpOptions:{timeout:2000}}}).catch(()=>{}); }
   } else {
    const content=request.contents.flatMap((c:any)=>c.parts.map((p:any)=>p.text?{type:'text',text:p.text}:{type:'input_audio',input_audio:{data:p.inlineData.data,format:({'audio/mpeg':'mp3','audio/x-wav':'wav','audio/wave':'wav','audio/x-aiff':'aiff'} as Record<string,string>)[p.inlineData.mimeType] || p.inlineData.mimeType.split('/')[1]}}));
    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(timeout()),headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-Title':'ACES Music'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL,messages:[{role:'system',content:system},{role:'user',content}],temperature:0.2})});
    if(!response.ok)throw Object.assign(new Error('Provider request failed'), {status:response.status});
    const result=await response.json();
    if(result.choices?.[0]?.finish_reason==='length')throw new Error('Truncated output');
    text=result.choices?.[0]?.message?.content;
   }
   if(typeof text!=='string'||!text.trim())throw new Error('Empty output');
   return {text};
  } catch (error) { failure = classifyFailure(error); console.warn('AI attempt failed', {provider, model, code:failure.code}); }
 }
 if(Date.now() >= deadline) throw new AnalysisError('AI_TIMEOUT',504,'AI processing exceeded the four-minute limit. Try a shorter clip or another model.');
 throw failure ?? new AnalysisError('AI_UNAVAILABLE',502,'All configured providers failed. Please try another model.');
}
