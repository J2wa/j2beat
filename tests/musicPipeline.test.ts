import {unavailableResearch} from '../server/songResearch.ts';
const noResearch = async () => unavailableResearch();
import {splitResearch} from '../shared/research.ts';
import assert from 'node:assert/strict';
import {cleanEvidence, generateMusicAnnotation} from '../server/musicPipeline.ts';
const section = {start:0,end:10,label:'opening',observations:'Piano enters.'};
const raw = JSON.stringify({overview:'Piano',sections:[section,{...section,start:9,end:12},{...section,start:12,end:25},{...section,start:-1,end:2},null],uncertainties:['Tempo unclear']});
const clean = cleanEvidence(raw,20);
assert.equal(clean.sections.length,1);
assert.ok(clean.uncertainties.some(s=>s.includes('4 invalid')));
assert.throws(()=>cleanEvidence('not json',20));
assert.throws(()=>cleanEvidence('{}',20));
assert.equal(cleanEvidence('```json\n'+JSON.stringify({overview:'x',sections:[]})+'\n```',0).sections.length,0);
const fullRaw = JSON.stringify({overview:'Piano',sections:[{...section,end:20}]});
const finalText = '- **Start Time:** 00:00\nFinal annotation';
const request = {model:'gemini-2.5-flash',contents:[{parts:[{text:'User notes'}, {inlineData:{data:'YQ==',mimeType:'audio/wav'}}]}],config:{systemInstruction:'Keep output labels'}};
let calls:any[]=[];
const generate = async (r:any, options:any) => {calls.push({r,options});return {text:calls.length===1?fullRaw:finalText};};
assert.equal(splitResearch((await generateMusicAnnotation(request,20,generate,noResearch)).text).annotation,finalText);
assert.equal(calls.length,3);
assert.ok(calls[1].r.contents.every((c:any)=>c.parts.every((p:any)=>!p.inlineData)));
assert.equal(calls[1].options.metadataOnly,true);
assert.ok(calls[2].r.config.systemInstruction.includes('AUDIO QA'));
assert.ok(calls[2].r.contents[0].parts.some((part:any)=>part.inlineData?.data==='YQ=='));
assert.ok(calls[2].r.contents[0].parts[0].text.includes(finalText));
assert.ok(calls[2].options.deadline > calls[1].options.deadline);
assert.equal(calls[0].options.maxAttempts,1);
assert.equal(calls[0].r.model,request.model);
assert.equal(calls[0].r.contents[0].parts.find((p:any)=>p.inlineData).inlineData.data,'YQ==');
assert.ok(calls[1].r.config.systemInstruction.includes('Validated preliminary'));
assert.ok(!calls[1].r.config.systemInstruction.includes('"end":25'));
assert.equal(request.config.systemInstruction,'Keep output labels');
calls=[];
await generateMusicAnnotation(request,20,async(r:any)=>{calls.push(r);if(calls.length===1)throw Error('offline');return {text:'- **Start Time:** 00:00\ndirect'};},noResearch);
assert.ok(calls[1].config.systemInstruction.includes('extraction was unavailable'));
console.log('Passed evidence cleanup, duration/overlap rejection, two-stage audio flow and graceful fallback.');
const {progressContext} = await import('../server/progress.ts');
const stages:string[]=[];
await progressContext.run(stage=>stages.push(stage),()=>generateMusicAnnotation(request,20,async(r:any)=>({text:r.config.responseMimeType?fullRaw:finalText}),noResearch));
assert.deepEqual(stages,['Analyzing audio','Searching Google for song context','Writing annotation from analysis','Reviewing draft against audio']);
console.log('Passed actual pipeline progress events.');


const {coverageIssues,timelineIssues} = await import('../server/musicPipeline.ts');
const intervals = [0,45,90,127,170].map((start,i,a)=>({...section,start,end:a[i+1]??210}));
const full210 = JSON.stringify({overview:'Guitar track',sections:intervals});
const final210 = intervals.map(s=>'- **Start Time:** '+Math.floor(s.start/60)+':'+String(s.start%60).padStart(2,'0')+'\n- **Section Type:** section').join('\n\n');
const short210 = intervals.slice(0,4).map(s=>'- **Start Time:** '+Math.floor(s.start/60)+':'+String(s.start%60).padStart(2,'0')).join('\n');
assert.ok(coverageIssues([{start:0,end:60},{start:60,end:127}],210).length);
assert.ok(coverageIssues([{start:0,end:60},{start:65,end:120},{start:120,end:170},{start:170,end:210}],210).length);
assert.equal(coverageIssues(intervals,210).length,0);
assert.ok(timelineIssues(short210,210).length);
assert.equal(timelineIssues(final210,210,intervals.map(s=>s.start)).length,0);
assert.ok(timelineIssues('- **Start Time:** 00:00\n- **Start Time:** 00:00',20).length);
// An early ending triggers another audio pass, not a text-only guess.
calls=[];
await generateMusicAnnotation(request,210,async(r:any,o:any)=>{
  calls.push({r,o});
  return {text:calls.length===1 ? JSON.stringify({overview:'x',sections:intervals.slice(0,3)}) : calls.length===2 ? full210 : final210};
},noResearch);
assert.equal(calls.length,4);
assert.ok(calls[1].r.contents[0].parts.some((p:any)=>p.inlineData));
assert.equal(calls[2].o.metadataOnly,true);
// Writer omissions are retried against the full listening evidence.
calls=[];
await generateMusicAnnotation(request,210,async(r:any,o:any)=>{
  calls.push({r,o}); return {text:calls.length===1?full210:calls.length===2?short210:final210};
},noResearch);
assert.equal(calls.length,4);
// Persistent truncation must never be returned as a successful annotation.
let count=0;
await assert.rejects(generateMusicAnnotation(request,210,async()=>({text:++count===1?full210:short210}),noResearch),/full recording/);
// If both evidence passes miss the ending, final analysis keeps the original audio.
calls=[];
await generateMusicAnnotation(request,210,async(r:any,o:any)=>{
  calls.push({r,o}); return {text:calls.length<=2?fullRaw:final210};
},noResearch);
assert.equal(calls[2].o.metadataOnly,false);
assert.ok(calls[2].r.contents[0].parts.some((p:any)=>p.inlineData));
console.log('Passed 3:30 coverage, missing tail/gap checks, audio recheck, writer repair and incomplete-result rejection.');

const completeDraft = 'Timeline Sections\n- **Start Time:** 0:00\n- **Section Type:** intro\n- **Narrative Description:** Piano plays.\n- **Instruments:** Piano\n- **Vibe Tags:** Calm\n- **Melody:** Piano clipped notes\n\nGlobal Musical Matrix\n8. Instrumentation: Piano supplies harmony.';
const correctedDraft = completeDraft.replace('Piano plays.', 'Piano anchors the harmony with clipped chords.');
const review = async (output: string | Error) => splitResearch((await generateMusicAnnotation(request,20,async(r:any)=>{
  if (r.config.responseMimeType) return {text:fullRaw};
  if (r.config.systemInstruction.includes('AUDIO QA')) {
    if (output instanceof Error) throw output;
    return {text:output};
  }
  return {text:completeDraft};
},noResearch)).text);
const reviewed = await review(correctedDraft);
assert.equal(reviewed.annotation,correctedDraft);
assert.equal(reviewed.audioQaIncomplete,false);
for (const invalidReview of [new Error('provider offline'), correctedDraft.replace('0:00','0:01'), correctedDraft.split('\n8. Instrumentation')[0]]) {
  const fallback = await review(invalidReview);
  assert.equal(fallback.annotation,completeDraft);
  assert.equal(fallback.audioQaIncomplete,true);
}
console.log('Passed audio QA corrections, malformed review rejection, and incomplete QA status.');
