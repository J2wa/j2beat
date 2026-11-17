import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {requestMusicWording,automaticallyHumanize} from '../src/services/humanizerService.ts';
import {musicProseFields,applyMusicEdits} from '../shared/musicHumanizer.ts';
import {humanizeMusic} from '../server/musicHumanizer.ts';
import {DescriptionRevision} from '../src/components/DescriptionRevision.tsx';
import {attachResearch} from '../shared/research.ts';

const source=attachResearch(`Timeline Sections
- **Start Time:** 00:00
- **Section Type:** Verse
- **Narrative Description:** Bass plays a repeating figure with the kick. Guitar may be palm-muted.
- **Instruments:** Bass, Drums, Guitar
- **Vibe Tags:** restrained
- **Melody:** Short repeated falling notes

- **Start Time:** 00:30
- **Section Type:** Chorus
- **Narrative Description:** Guitar strums full chords while the bass continues its repeating figure.
- **Instruments:** Bass, Drums, Guitar
- **Vibe Tags:** fuller
- **Melody:** Steady falling phrase

Global Musical Matrix
1. Genre, Era & Scene Tags: Pop
2. Genre, Era & Scene: The steady backbeat and strummed guitar support the pop label.
3. Tempo, Rhythm & Groove Tags: 90 BPM
4. Tempo, Rhythm & Groove: At about 90 BPM, the bass locks with the kick.`,{status:'grounded',message:'source context',summary:'Original source',sources:[],queries:[]},true);
const fields=musicProseFields(source);
const revised=applyMusicEdits(source,[{id:fields[1].id,text:'Guitar strums full chords over the bass, which continues its repeating figure.'}]);
assert.equal((await automaticallyHumanize(source,'gemini-2.5-flash',async request=>{assert.equal(request.text,source);assert.equal(request.model,'gemini-2.5-flash');return revised;})).text,revised);
assert.match((await automaticallyHumanize(source,undefined,async()=>source)).notice,/No changes needed/);
for (const error of [new Error('offline'),new Error('invalid edits')]) {
 const kept=await automaticallyHumanize(source,undefined,async()=>{throw error;});
 assert.equal(kept.text,source);assert.match(kept.notice,/original wording has been kept/);
}
const originalFetch=globalThis.fetch;
try {
 let sent:any;
 globalThis.fetch=(async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({text:revised});}) as typeof fetch;
 assert.equal(await requestMusicWording({text:source,fieldId:fields[1].id,model:'gemini-2.5-flash',instruction:'Improve flow'}),revised);
 assert.equal(sent.fieldId,fields[1].id);assert.equal(sent.instruction,'Improve flow');assert.equal(sent.model,'gemini-2.5-flash');assert.ok(!('audio' in sent));
 const wrongField=applyMusicEdits(source,[{id:fields[0].id,text:fields[0].text.replace('plays a repeating figure','repeats a figure')}]);
 for(const bad of [wrongField,revised.replace('00:30','00:31'),revised.replace('ACEs','Other').replace('source context','changed source'),revised.replace('90 BPM','100 BPM')]) {
  globalThis.fetch=(async()=>Response.json({text:bad})) as typeof fetch;
  await assert.rejects(requestMusicWording({text:source,fieldId:fields[1].id}));
 }
 for(const response of [Response.json({error:'Unavailable'},{status:503}),Response.json({text:''}),new Response('not json')]) {
  globalThis.fetch=(async()=>response) as typeof fetch;
  await assert.rejects(requestMusicWording({text:source}));
 }
}finally{globalThis.fetch=originalFetch;}
assert.equal(await humanizeMusic(source,'gemini-2.5-flash',async request=>{
 const input=JSON.parse(request.contents[0].parts[0].text);
 assert.equal(input.fields.length,1);assert.equal(input.fields[0].id,fields[1].id);assert.equal(input.revisionRequest,'Improve flow');
 assert.ok(!request.contents[0].parts[0].text.includes('source context'));
 return {text:JSON.stringify({edits:[{id:fields[1].id,text:musicProseFields(revised)[1].text}]})};
},{fieldId:fields[1].id,instruction:'Improve flow'}),revised);
await assert.rejects(humanizeMusic(source,undefined,async()=>({text:JSON.stringify({edits:[{id:fields[0].id,text:fields[0].text}]})}),{fieldId:fields[1].id}));
await assert.rejects(humanizeMusic(source,undefined,async()=>{throw Error('Should not generate');},{fieldId:'f999'}));
const props={source,fieldId:fields[1].id,label:'Segment 2 at 00:30',model:'gemini-2.5-flash' as const,disabled:false,onBusy:()=>{},onApply:()=>{}};
const html=renderToStaticMarkup(createElement(DescriptionRevision,props));
assert.match(html,/Revise Segment 2 at 00:30 description/);assert.doesNotMatch(html,/<button[^>]*disabled/);
assert.match(renderToStaticMarkup(createElement(DescriptionRevision,{...props,source:'Narrative Description: None',fieldId:'f0'})),/<button[^>]*disabled/);
assert.match(renderToStaticMarkup(createElement(DescriptionRevision,{...props,disabled:true})),/<button[^>]*disabled/);
console.log('Passed automatic wording success/no-op/fallback, client field and locked-byte checks, server-selected-field isolation, guidance forwarding and rendered revision controls.');
