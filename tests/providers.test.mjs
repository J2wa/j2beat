import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { DEFAULT_MODEL, MODEL_OPTIONS, modelOrder } from '../shared/models.ts';
let calls=[], responses=[], usedKeys=[];
globalThis.MockGoogleGenAI=class { constructor(options){usedKeys.push(options.apiKey);} files={upload:async()=>{globalThis.uploadCount++;if(globalThis.uploadError)throw globalThis.uploadError;return {name:"files/test",uri:"https://example.test/audio",state:"ACTIVE"};},delete:async()=>{globalThis.deleteCount++;}}; models={list:async()=>globalThis.modelCatalog ?? [],generateContent:async request=>{calls.push(request);const next=responses.shift();if(next instanceof Error)throw next;return next;}}; };
const source=readFileSync(new URL('../server/providers.ts',import.meta.url),'utf8')
 .replace("'./apiKeys.js'",JSON.stringify(new URL('../server/apiKeys.ts',import.meta.url).href))
 .replace("'../shared/melody.js'",JSON.stringify(new URL('../shared/melody.ts',import.meta.url).href))
 .replace("import { reportProgress } from './progress.js';", "const reportProgress = () => {};")
 .replace("import { GoogleGenAI } from '@google/genai';",'const GoogleGenAI = globalThis.MockGoogleGenAI;')
 .replace("'../shared/models.js'",JSON.stringify(new URL('../shared/models.ts',import.meta.url).href));
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {generateWithFallback}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
process.env.GEMINI_API_KEY='test';
delete process.env.OPENROUTER_API_KEY;
const request={contents:[{parts:[{text:'test'}]}],config:{systemInstruction:'test',temperature:0.2}};
const good={text:'annotation',candidates:[{finishReason:'STOP'}]};
responses=[good];
assert.equal((await generateWithFallback(request)).text,'annotation');
assert.equal(calls[0].model,'gemini-3.5-flash');
assert.equal(calls[0].config.temperature,undefined);
for(const option of MODEL_OPTIONS){
 calls=[];responses=[good];await generateWithFallback({...request,model:option.id});assert.equal(calls[0].model,option.id);
 assert.equal(new Set(modelOrder(option.id)).size,MODEL_OPTIONS.length);
}
for(const first of [new Error('timeout'),{text:'',candidates:[{finishReason:'STOP'}]},{text:'partial',candidates:[{finishReason:'MAX_TOKENS'}]}]){
 calls=[];responses=[first,new Error('unavailable'),new Error('unavailable'),good];
 assert.equal((await generateWithFallback(request)).text,'annotation');
 assert.deepEqual(calls.map(x=>x.model),modelOrder(DEFAULT_MODEL));
}
await assert.rejects(generateWithFallback({...request,model:'unapproved-model'}),/Invalid analysis model/);
process.env.OPENROUTER_API_KEY='test';process.env.OPENROUTER_MODEL='audio-model';
globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'router annotation'}}]})});
responses=MODEL_OPTIONS.map(()=>new Error());
assert.equal((await generateWithFallback(request)).text,'router annotation');
delete process.env.OPENROUTER_API_KEY;
responses=MODEL_OPTIONS.map(()=>new Error());
await assert.rejects(generateWithFallback(request),/could not complete|All configured providers failed|four-minute/g);
console.log('Passed: default, every selection, deduplicated fallback, invalid model, failure cases and OpenRouter fallback.');
calls=[];responses=[new Error('unavailable'),good];
await assert.rejects(generateWithFallback(request,{maxAttempts:1}),/could not complete|All configured providers failed|four-minute/g);
assert.equal(calls.length,1);
calls=[];
await assert.rejects(generateWithFallback(request,{deadline:Date.now()-1}),/could not complete|All configured providers failed|four-minute/g);
assert.equal(calls.length,0);
console.log('Passed single-attempt evidence budget and expired deadline.');
for(const [status,code] of [[429,'AI_QUOTA'],[401,'AI_AUTH'],[404,'AI_MODEL'],[503,'AI_UNAVAILABLE']]) {
 responses=[Object.assign(new Error('private provider details'),{status})];
 await assert.rejects(generateWithFallback(request,{maxAttempts:1}), e=>e.code===code && !e.message.includes('private provider details'));
}
console.log('Passed safe provider error categories.');

process.env.GEMINI_API_KEYS=Array.from({length:10},(_,i)=>'key-'+i).join(',');
delete process.env.GEMINI_API_KEY;
calls=[];usedKeys=[];responses=[...Array.from({length:9},()=>Object.assign(new Error('quota'),{status:429})),good];
assert.equal((await generateWithFallback(request,{maxAttempts:1})).text,'annotation');
assert.equal(new Set(usedKeys).size,10);
assert.ok(calls.every(c=>c.model===DEFAULT_MODEL));
delete process.env.GEMINI_API_KEYS;
process.env.GEMINI_API_KEY_1='numbered-only';
calls=[];usedKeys=[];responses=[good];
await generateWithFallback(request);
assert.deepEqual(usedKeys,['numbered-only']);
delete process.env.GEMINI_API_KEY_1;
process.env.GEMINI_API_KEY='test';
console.log('Passed ten-key failover on the same model and numbered-only configuration.');
const {geminiApiKeys} = await import('../server/apiKeys.ts');
process.env.GEMINI_API_KEYS='test, second\nsecond';
process.env.GEMINI_API_KEY_10='third';
assert.deepEqual(geminiApiKeys(),['test','third','second']);
delete process.env.GEMINI_API_KEYS;
delete process.env.GEMINI_API_KEY_10;
delete process.env.GEMINI_API_KEY;
process.env.OPENROUTER_API_KEY='test';process.env.OPENROUTER_MODEL='audio-model';
assert.equal((await generateWithFallback(request,{maxAttempts:1})).text,'router annotation');
delete process.env.OPENROUTER_API_KEY;
console.log('Passed deduplication and OpenRouter-only evidence fallback.');
process.env.GEMINI_API_KEY='test';
calls=[];responses=[good];
await generateWithFallback(request,{metadataOnly:true});
assert.ok(calls[0].config.httpOptions.timeout>50000);
responses=[Object.assign(new Error('timeout'),{status:503}),...MODEL_OPTIONS.slice(1).map(()=>Object.assign(new Error('missing'),{status:404}))];
await assert.rejects(generateWithFallback(request),error=>error.code==='AI_RETRIES_FAILED');
console.log('Passed writing budget and mixed failure reporting.');

calls=[];globalThis.modelCatalog=[
 {name:'models/gemini-3.6-flash',supportedActions:['generateContent']},
 {name:'models/gemini-3.6-flash-image',supportedActions:['generateContent']},
 {name:'models/embedding-model',supportedActions:['embedContent']}
];
responses=[Object.assign(new Error('not found'),{status:404}),good];
assert.equal((await generateWithFallback(request)).text,'annotation');
assert.equal(calls[1].model,'gemini-3.6-flash');
assert.equal(calls.length,2);
delete globalThis.modelCatalog;
console.log('Passed API-discovered model recovery and incompatible-model filtering.');

// Regression: 5 MB, the reported 9.3 MiB track, and 10 MiB stay inline.
const audioRequest = bytes => ({...request, contents:[{parts:[{inlineData:{data:Buffer.alloc(bytes).toString('base64'),mimeType:'audio/mpeg'}}]}]});
globalThis.uploadCount=0;globalThis.deleteCount=0;
for (const bytes of [5*1024*1024,Math.ceil(9.3*1024*1024),10*1024*1024]) {
 calls=[];responses=[good];
 const input=audioRequest(bytes);
 await generateWithFallback(input,{maxAttempts:1});
 assert.equal(globalThis.uploadCount,0);
 assert.equal(calls[0].contents[0].parts[0].inlineData.data,input.contents[0].parts[0].inlineData.data);
}
// Large payloads still use Files API and clean up after generation.
calls=[];responses=[good];
await generateWithFallback(audioRequest(14*1024*1024),{maxAttempts:1});
assert.equal(globalThis.uploadCount,1);
assert.equal(globalThis.deleteCount,1);
assert.ok(calls[0].contents[0].parts[0].fileData);
// Prompt bytes count too, including multi-byte UTF-8 text.
calls=[];responses=[good];
await generateWithFallback({...audioRequest(10*1024*1024),config:{systemInstruction:'音'.repeat(1_500_000)}},{maxAttempts:1});
assert.equal(globalThis.uploadCount,2);
// Upload 404s must not be reported as model errors or invoke generation.
calls=[];globalThis.uploadError=Object.assign(new Error('private upload failure'),{status:404});
await assert.rejects(generateWithFallback(audioRequest(14*1024*1024),{maxAttempts:1}),error=>error.code==='AI_AUDIO_UPLOAD' && !error.message.includes('private'));
assert.equal(calls.length,0);
delete globalThis.uploadError;
console.log('Passed audio size routing, total UTF-8 request budget, cleanup and upload error regression tests.');
