import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {sessionCookie} from '../server/auth.ts';
process.env.USER_PASSWORD='test-settings-password';
process.env.GEMINI_API_KEY='test-settings-key';
let calls=[];
globalThis.settingsMock={annotateAudio:async(...args)=>{calls.push(['annotate',...args]);return 'draft';},refineAnnotation:async(...args)=>{calls.push(['refine',...args]);return 'revised';},suggestGlobalMusic:async(...args)=>{calls.push(['suggest-global',...args]);return '{"suggestions":{}}';}};
const file=new URL('../api/annotate.ts',import.meta.url);
const source=readFileSync(file,'utf8')
 .replace("import { annotateAudio, refineAnnotation } from '../server/annotation.js';",'const {annotateAudio,refineAnnotation}=globalThis.settingsMock;')
 .replace("import { suggestGlobalMusic, suggestMusic } from '../server/musicSuggestions.js';",'const {suggestGlobalMusic}=globalThis.settingsMock; const suggestMusic=()=>{throw Error("Unexpected segment request")};')
 .replace("import { get, del } from '@vercel/blob';",'const get=()=>{throw Error("Unexpected upload")}; const del=async()=>{};')
 .replace(/from '(\.\.\/[^']+)\.js'/g,(_,path)=>'from '+JSON.stringify(new URL(path+'.ts',file).href));
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const headers={cookie:sessionCookie('Tester').split(';')[0],host:'localhost'};
const body={action:'annotate',audio:{data:'YQ==',type:'audio/wav'},audioDuration:45,isSimplified:true,isHighAccuracy:true,creativeGuidance:'Check shaker entry',model:'gemini-2.5-flash',songHint:'Song.wav'};
async function invoke(body){const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};await handler({method:'POST',headers,body},res);return res;}
assert.equal((await invoke(body)).statusCode,200);
assert.deepEqual(calls[0],['annotate',body.audio,true,true,'Check shaker entry',45,'gemini-2.5-flash','Song.wav']);
// Cached clients may still send either valid or unknown profile names. They are
// deliberately ignored; they cannot re-enable profile-specific writing.
assert.equal((await invoke({...body,activeProfile:'VOCAL',annotationProfile:'brief'})).statusCode,200);
assert.deepEqual(calls[1],calls[0]);
assert.equal((await invoke({...body,action:'refine',previousResult:'prior draft',feedback:'Check the bass',activeProfile:'old-template'})).statusCode,200);
assert.deepEqual(calls[2],['refine',body.audio,'prior draft','Check the bass',true,true,'Check shaker entry',45,'gemini-2.5-flash','Song.wav']);
assert.equal((await invoke({...body,model:'invalid'})).statusCode,400);
assert.equal((await invoke({...body,audioDuration:NaN})).statusCode,400);
const wholeSong = await invoke({...body,action:'suggest-global'});
assert.equal(wholeSong.statusCode,200);
assert.equal(wholeSong.body.text,'{"suggestions":{}}');
assert.deepEqual(calls[3],['suggest-global',body.audio,45,'gemini-2.5-flash']);
assert.equal((await invoke({...body,action:'suggest-global',audioDuration:0})).statusCode,400);
console.log('Passed template-free analysis/refinement settings, ignored stale profile fields, correct model argument forwarding, and retained settings validation.');

// Check the server assembly as well as the HTTP argument contract.
const assembled=[];
globalThis.settingsGeneration=async(request,duration)=>{assembled.push({request,duration});return {text:'annotation'};};
const annotationFile=new URL('../server/annotation.ts',import.meta.url);
const annotationSource=readFileSync(annotationFile,'utf8')
 .replace('import { generateMusicAnnotation } from "./musicPipeline.js";', 'const generateMusicAnnotation=globalThis.settingsGeneration;')
 .replace(/from (["'])(\.{1,2}\/[^"']+)\.js\1/g,(_,quote,path)=>'from '+JSON.stringify(new URL(path+'.ts',annotationFile).href));
const annotationJs=ts.transpileModule(annotationSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const server=await import('data:text/javascript;base64,'+Buffer.from(annotationJs).toString('base64'));
await server.annotateAudio(body.audio,true,true,'Check shaker entry',210.84,'gemini-2.5-flash','Song.wav');
await server.refineAnnotation(body.audio,'prior draft','Check bass',false,false,'',210.84,'gemini-2.5-flash','Song.wav');
for (const {request,duration} of assembled) {
 assert.equal(request.model,'gemini-2.5-flash');
 assert.equal(duration,210);
 assert.match(request.contents[0].parts[0].text,/3:30 \(210 seconds\)/);
 assert.match(request.config.systemInstruction,/NATURAL MUSIC WRITING/);
 assert.doesNotMatch(request.config.systemInstruction,/Template \d|#### Formulas|Use this emphasis|sentence quota:/);
 assert.equal(request.contents[0].parts[1].inlineData.data,'YQ==');
}
console.log('Passed generation and refinement prompt assembly without legacy templates or profile bias.');
