import assert from 'node:assert/strict';
import { researchFromResponse, researchSong, researchInstruction, unavailableResearch } from '../server/songResearch.ts';
import { attachResearch, splitResearch, researchAsMarkdown } from '../shared/research.ts';
import { generateMusicAnnotation } from '../server/musicPipeline.ts';
import { SYSTEM_PROMPT } from '../src/constants.ts';
import { KNOWLEDGE_BASE } from '../src/knowledgeBase.ts';
import { MELODY_INSTRUCTION } from '../shared/melody.ts';

const groundedResponse = {
  text: 'MATCH_SUPPORTED\nAn official release describes the song as a farewell.',
  candidates: [{finishReason:'STOP',groundingMetadata:{
    webSearchQueries:['Example Artist Example Song official meaning'],
    groundingChunks:[{web:{uri:'https://example.com/credits',title:'Official credits'}},{web:{uri:'javascript:alert(1)',title:'Unsafe'}}],
    groundingSupports:[{segment:{text:'The song explores farewell.'},groundingChunkIndices:[0]}, {segment:{text:'Untrusted passage'},groundingChunkIndices:[1]}],
    searchEntryPoint:{renderedContent:'<style>.x{color:blue}</style><a href="https://google.com/search?q=test">Search</a>'},
  }}],
};
const report = researchFromResponse(groundedResponse);
assert.equal(report.status,'grounded');
assert.equal(report.sources.length,1);
assert.match(report.summary,/\[1\]\(<https:\/\/example.com\/credits>\)/);
assert.ok(!report.summary.includes('Untrusted passage'));
assert.ok(!report.summary.includes('official release')); // Uncited prose never enters the writer.
assert.equal(researchFromResponse({...groundedResponse,text:'NO_RELIABLE_MATCH\nConflicting versions.'}).status,'unverified');
assert.equal(researchFromResponse({text:'MATCH_SUPPORTED',candidates:[{finishReason:'STOP'}]}).status,'unverified');
assert.equal(researchFromResponse({...groundedResponse,candidates:[{finishReason:'MAX_TOKENS'}]}).status,'unavailable');
const noQueries = structuredClone(groundedResponse);
noQueries.candidates[0].groundingMetadata.webSearchQueries=[];
assert.equal(researchFromResponse(noQueries).status,'unverified');
assert.ok(!researchInstruction(unavailableResearch()).includes('example.com'));

const stored = attachResearch('Timeline Sections\n\nGlobal Musical Matrix',report);
assert.equal(splitResearch(stored).annotation,'Timeline Sections\n\nGlobal Musical Matrix');
assert.deepEqual(splitResearch(stored).research,report);
assert.equal((attachResearch(stored,report).match(/ACES_RESEARCH_V1/g)||[]).length,1);
assert.ok(!stored.includes('<style>'));
assert.match(researchAsMarkdown(report),/Official credits/);
assert.equal(splitResearch('legacy annotation').annotation,'legacy annotation');
assert.equal(splitResearch('text\n\n<!-- ACES_RESEARCH_V1 broken -->').annotation,'text');

let calls:any[]=[];
const request = {model:'gemini-3.5-flash',contents:[{parts:[{text:stored},{inlineData:{data:'private-audio',mimeType:'audio/wav'}}]}],config:{systemInstruction:'Write labels'}};
const found = await researchSong(request, {overview:'Piano'}, Date.now()+60000, async r => {calls.push(r);return groundedResponse;});
assert.equal(found.status,'grounded');
assert.deepEqual(calls[0].config.tools,[{googleSearch:{}}]);
assert.equal(calls[0].config.responseMimeType,undefined); // Search stays separate from structured listening.
assert.ok(!JSON.stringify(calls[0].contents).includes('private-audio'));
assert.ok(!JSON.stringify(calls[0].contents).includes('ACES_RESEARCH_V1'));
calls=[];
await researchSong(request,{},Date.now()+60000,async r=>{calls.push(r);if(calls.length===1)throw Error('model unavailable');return groundedResponse;});
assert.deepEqual(calls.map(r=>r.model),['gemini-3.5-flash','gemini-2.5-flash']);
calls=[];
assert.equal((await researchSong(request,{},Date.now()-1,async r=>{calls.push(r);return groundedResponse;})).status,'unavailable');
assert.equal(calls.length,0);

calls=[];
const final = await generateMusicAnnotation(request,20,async(r:any,o:any)=>{
  calls.push({r,o});
  return {text:calls.length===1 ? JSON.stringify({overview:'Piano',sections:[{start:0,end:20,observations:'Piano repeats two clipped notes.'}],songClues:'one two three four five six seven eight nine ten eleven'}) : '- **Start Time:** 00:00\nFinal annotation'};
},async()=>report);
assert.equal(splitResearch(final.text).research?.status,'grounded');
assert.ok(calls[1].r.config.systemInstruction.includes('example.com/credits'));
assert.ok(calls[1].r.config.systemInstruction.includes('ONLY the Global Musical Matrix'));
assert.ok(!calls[1].r.contents[0].parts.some((p:any)=>p.inlineData));
assert.ok(!calls[1].r.config.systemInstruction.includes('ten eleven'));
for (const prompt of [SYSTEM_PROMPT, KNOWLEDGE_BASE]) {
  assert.ok(prompt.includes(MELODY_INSTRUCTION));
  assert.ok(!prompt.includes('Standard Melody Phrases'));
  assert.ok(!prompt.includes('Select exactly ONE of the standard melody phrases'));
}
console.log('Passed Google Search tool wiring, citation provenance, uncertain matches, fallback/deadline, draft persistence, evidence separation and melody prompt regression checks.');

assert.ok(MELODY_INSTRUCTION.includes('3–7 word phrase naming the audible instrument or voice'));
assert.ok(!MELODY_INSTRUCTION.includes('8 to 20'));
