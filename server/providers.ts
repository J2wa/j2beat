import { DEFAULT_MODEL, isModelId, modelOrder } from '../shared/models.js';
import { GoogleGenAI } from '@google/genai';
const QUALITY = `
FINAL PRIORITY: Preserve the requested output schema and field labels, but prioritize audible evidence over all templates and stylistic directives above.
Listen to the supplied audio. Never infer instruments, artist identity, vocal gender, recording era, key, BPM, or production techniques from genre stereotypes. Use 'uncertain' or 'None' when evidence is insufficient. User notes are hypotheses to verify, not facts to force into the recording.
Keep timestamps chronological, non-overlapping and inside the supplied duration. Segment at audible changes; do not fabricate micro-transitions. Treat exact timing as approximate when uncertain.
Use natural, direct English throughout all narrative and global fields: concrete verbs, varied sentence lengths, no marketing language, clichés, repetitive openings, forced emotional claims, or elaborate synonyms. One or two concise sentences as needed; never pad a field to meet a sentence quota. Preserve technical accuracy and useful musical detail. Do not deliberately add errors, claim human authorship, or promise detection avoidance.
Describe only sounds within each segment. Match the instrument list to the narrative. Describe vocal timbre and delivery without asserting personal identity. Do not use web search to substitute for listening. Before answering, silently check timing, contradictions, unsupported details, duplicate phrasing and schema completeness. Return only the annotation, with uncertainty in the relevant fields.`;
export async function generateWithFallback(request: any) {
 const system = String(request.config.systemInstruction) + QUALITY;
 if (request.model !== undefined && !isModelId(request.model)) throw new Error('Invalid analysis model');
 const models = modelOrder(request.model ?? DEFAULT_MODEL);
 const attempts = [...models.map(model => ({provider: 'gemini', model})), {provider: 'openrouter', model: process.env.OPENROUTER_MODEL}];
 for (const {provider, model} of attempts) {
  if(provider==='gemini' && !process.env.GEMINI_API_KEY)continue;
  if(provider==='openrouter' && (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL))continue;
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
       const uploaded=await ai.files.upload({file:new Blob([Buffer.from(data.data,'base64')],{type:data.mimeType}),config:{mimeType:data.mimeType,httpOptions:{timeout:30000}}});
       uploadedName=uploaded.name;
       if(!uploaded.uri)throw new Error('Audio upload failed');
       c.parts[i]={fileData:{fileUri:uploaded.uri,mimeType:data.mimeType}};
      }
     }
     const config = {...request.config, systemInstruction:system, tools:undefined, httpOptions:{timeout:50000}};
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
    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(50000),headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-Title':'ACES Music'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL,messages:[{role:'system',content:system},{role:'user',content}],temperature:0.2})});
    if(!response.ok)throw new Error('Provider request failed');
    const result=await response.json();
    if(result.choices?.[0]?.finish_reason==='length')throw new Error('Truncated output');
    text=result.choices?.[0]?.message?.content;
   }
   if(typeof text!=='string'||!text.trim())throw new Error('Empty output');
   return {text};
  } catch { /* Try the next model/provider; never expose keys or raw provider errors. */ }
 }
 throw new Error('All configured providers failed');
}
