import assert from 'node:assert/strict';
import {parseMusicSuggestions,addConfirmedInstrument} from '../shared/musicSuggestions.js';
import {suggestGlobalMusic,suggestMusic} from '../server/musicSuggestions.js';
import {DEFAULT_MODEL} from '../shared/models.js';
import {parseGlobalSuggestions} from '../shared/globalSuggestions.js';
const candidate={start:0,label:'intro',reason:'Guitar entrance',instruments:[{name:'Guitar',reason:'Sounds like picked strings; uncertain'}]};
const json=JSON.stringify({sections:[candidate]});
assert.equal(parseMusicSuggestions(json,120,[0])[0].instruments[0].name,'Guitar');
for(const start of [-1,120])assert.throws(()=>parseMusicSuggestions(JSON.stringify({sections:[{...candidate,start}]}),120));
assert.throws(()=>parseMusicSuggestions(json,120,[0,60]));
assert.equal(parseMusicSuggestions(JSON.stringify({sections:[candidate,candidate]}),120).length,1);
assert.equal(parseMusicSuggestions(JSON.stringify({sections:[{...candidate,start:0.5},{...candidate,start:120}]}),120)[0].start,1);
assert.equal(parseMusicSuggestions(JSON.stringify({sections:[{start:'0:12',instruments:['Bass']}]}),120)[0].instruments[0].name,'Bass');
assert.equal(parseMusicSuggestions(JSON.stringify({sections:[{...candidate,start:'0'}]}),120,[0])[0].start,0);
assert.throws(()=>parseMusicSuggestions('{"sections":[]}',120));
assert.equal(addConfirmedInstrument('Bass, guitar','Guitar'),'Bass, guitar');
assert.equal(addConfirmedInstrument('Bass','Guitar'),'Bass, Guitar');
let called=0;
await suggestMusic({data:'YWJj',type:'audio/wav'},120,DEFAULT_MODEL,[0],(async(req:any,options:any)=>{called++;assert.ok(req.contents[0].parts.some((p:any)=>p.inlineData));assert.ok(req.contents[0].parts[0].text.includes('[0]'));assert.equal(req.config.responseMimeType,'application/json');assert.equal(options.copyeditOnly,true);return {text:json};}) as any);
assert.equal(called,1);
console.log('Passed audio suggestion request, timing validation, missing/duplicate section rejection and explicit instrument deduplication.');

let retries=0;
await suggestMusic({data:'YWJj',type:'audio/wav'},120,DEFAULT_MODEL,undefined,(async()=>({text:++retries===1?'not JSON':json})) as any);
assert.equal(retries,2);
await assert.rejects(()=>suggestMusic({data:'YWJj',type:'audio/wav'},120,DEFAULT_MODEL,undefined,(async()=>({text:'{}'})) as any),/could not be read/);
console.log('Passed decimal and formatted timestamp normalization, terminal marker filtering, optional fields, and bounded format retry.');

const wholeSong = JSON.stringify({suggestions: {
  playingStyle: {notes: 'The guitar picks separate notes.', tags: ['Picking', 'picking', 'wrong, tag']},
  instrumentation: {notes: '  Bass supports the picked line. ', tags: []},
  songTitle: {notes: 'Unverified title', tags: ['Unverified']},
}});
const cleanedWholeSong = {
  playingStyle: {notes: 'The guitar picks separate notes.', tags: ['Picking']},
  instrumentation: {notes: 'Bass supports the picked line.', tags: []},
};
assert.deepEqual(parseGlobalSuggestions(wholeSong), cleanedWholeSong);
assert.deepEqual(parseGlobalSuggestions('{"suggestions":{}}'), {});
assert.throws(() => parseGlobalSuggestions('{"suggestions":[]}'));
assert.throws(() => parseGlobalSuggestions('{"suggestions":{"mix":{"notes":"","tags":[]}}}'));
const requests: {request: any; options: any}[] = [];
const wholeSongResult = await suggestGlobalMusic({data:'YWJj',type:'audio/wav'},120.7,DEFAULT_MODEL,async (request, options) => {
  requests.push({request, options});
  return {text: requests.length === 1 ? 'unreadable' : wholeSong};
});
assert.deepEqual(parseGlobalSuggestions(wholeSongResult), cleanedWholeSong);
assert.equal(requests.length, 2);
assert.equal(requests[0].options.audioFiles, requests[1].options.audioFiles);
assert.equal(requests[0].request.contents[0].parts[1].inlineData, requests[1].request.contents[0].parts[1].inlineData);
assert.match(requests[0].request.contents[0].parts[0].text, /120 seconds/);
assert.match(requests[0].request.config.systemInstruction, /Avoid exact keys/);
assert.match(requests[0].request.config.systemInstruction, /Never infer gender or identity/);
console.log('Passed whole-song suggestion validation, unsupported field handling, and shared audio across format retries.');
