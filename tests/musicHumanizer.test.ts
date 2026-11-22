import assert from 'node:assert/strict';
import {musicProseFields,applyMusicEdits,MUSIC_HUMANIZER_RULES} from '../shared/musicHumanizer.ts';
import {humanizeMusic} from '../server/musicHumanizer.ts';
import {attachResearch} from '../shared/research.ts';
import handler from '../api/humanize.ts';
import {sessionCookie} from '../server/auth.ts';

const annotation = `Timeline Sections

- **Start Time:** 00:00
- **Section Type:** Verse
- **Narrative Description:** The bass beautifully intertwines with the kick in a repeating syncopated figure. The guitar may be palm-muted.
The lead vocal ends each line with a short held note.
- **Instruments:** Bass, Drums, Guitar, Voice
- **Vibe Tags:** restrained
- **Melody:** Short repeated falling notes

Global Musical Matrix
1. Genre, Era & Scene Tags: Pop
2. Genre, Era & Scene: The steady backbeat and repeated guitar figure support the pop label.
3. Tempo, Rhythm & Groove Tags: 90 BPM
4. Tempo, Rhythm & Groove: At about 90 BPM, the bass locks in with the kick. See [1](https://example.test/song).

Song title: Original title
Song by: Original artist

---
Performing Artists: Original performer`;
const source = attachResearch(annotation,{status:'grounded',message:'source context',summary:'Original source',sources:[{id:1,title:'Song',url:'https://example.test/song'}],queries:['song'],searchEntryPoint:'<div>Keep</div>'},true);
const fields = musicProseFields(source);
assert.deepEqual(fields.map(f=>f.label),['Section 1: Narrative Description','Genre, Era & Scene','Tempo, Rhythm & Groove']);
assert.ok(fields[0].text.includes('held note.'));
assert.ok(!fields[2].text.includes('Song title'));
const trailingLyrics = '22. Lyrical Evocation: Reflective phrases.\nLyrics & Song Structure: Verse and refrain.';
assert.equal(musicProseFields(trailingLyrics)[0].text, 'Reflective phrases.');
assert.equal(applyMusicEdits(trailingLyrics, [{ id: 'f0', text: 'The words sound reflective.' }]),
  trailingLyrics.replace('Reflective phrases.', 'The words sound reflective.'));
assert.equal(musicProseFields('22. Lyrical Evocation: Lyrics unavailable').length,0);
assert.throws(() => applyMusicEdits(trailingLyrics, [{id:'f0', text:'Lyrics unavailable'}]));
assert.throws(() => applyMusicEdits(trailingLyrics, [{id:'f0', text:'Reflective phrases.\nLyrics & Song Structure: Different verse.'}]));
const replacement = fields[0].text.replace('beautifully intertwines with','plays alongside');
const edited = applyMusicEdits(source,[{id:'f0',text:replacement}]);
assert.equal(edited,source.replace(fields[0].text,replacement));
assert.equal(applyMusicEdits(source,[]),source);
assert.throws(()=>applyMusicEdits(source,[{id:'melody',text:'new'}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f0',text:replacement},{id:'f0',text:replacement}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f0',text:replacement.replace(' may be',' is')}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f2',text:fields[2].text.replace('90','100')}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f2',text:fields[2].text.replace('example.test','other.test')}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f0',text:replacement+'\n- **Start Time:** 05:00'}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f0',text:'Bass plays.'}]));
assert.throws(()=>applyMusicEdits(source,[{id:'f0',text:null}]));
assert.equal(musicProseFields('Unknown imported format').length,0);
assert.equal(musicProseFields('- **Narrative Description:** None').length,0);
// CRLF, empty inline value and multiline prose retain exact surrounding bytes.
const windows = '- **Narrative Description:**\r\n  Piano repeats a short figure.\r\n\r\n- **Instruments:** Piano\r\n';
assert.equal(applyMusicEdits(windows,[{id:'f0',text:'Piano plays a short repeating figure.'}]),windows.replace('Piano repeats a short figure.','Piano plays a short repeating figure.'));
const repeated = annotation.replace('\nGlobal Musical Matrix', '\n- **Start Time:** 00:30\n- **Section Type:** Chorus\n- **Description:** The bass repeats the figure while backing vocals enter.\n- **Melody:** Rising phrase\n\nGlobal Musical Matrix');
assert.equal(musicProseFields(repeated)[1].label,'Section 2: Description');
let calls = 0;
assert.equal(await humanizeMusic(source,'gemini-2.5-flash',async(request,options)=>{
  calls++;
  assert.equal(options.copyeditOnly,true);
  assert.ok(request.config.systemInstruction.startsWith(MUSIC_HUMANIZER_RULES));
  assert.ok(request.config.systemInstruction.includes('Segment 1:'));
  assert.ok(request.contents[0].parts.every(p=>p.text && !p.inlineData));
  assert.ok(!request.contents[0].parts[0].text.includes('source context'));
  return {text:JSON.stringify({edits:[{id:'f0',text:replacement}]})};
}),edited);
assert.equal(calls,1);
await assert.rejects(humanizeMusic(source,undefined,async()=>({text:'not json'})));
await assert.rejects(humanizeMusic(source,undefined,async()=>{throw new Error('offline');}));
assert.equal(source.includes('beautifully intertwines'),true);

// Exercise authentication and input validation without contacting providers.
process.env.USER_PASSWORD='test-humanizer-password';
const invoke = async (req:any) => {
  const res:any={statusCode:200,headers:{},setHeader(k:string,v:string){this.headers[k]=v;},status(n:number){this.statusCode=n;return this;},json(body:any){this.body=body;return this;}};
  await handler(req,res);return res;
};
assert.equal((await invoke({method:'POST',headers:{},body:{text:source}})).statusCode,401);
const headers={cookie:sessionCookie('Tester').split(';')[0],host:'localhost'};
assert.equal((await invoke({method:'POST',headers:{...headers,origin:'https://other.test'},body:{text:source}})).statusCode,403);
assert.equal((await invoke({method:'GET',headers})).statusCode,405);
for (const body of [{text:''},{text:'x'.repeat(120001)},{text:source,model:'invalid'}]) assert.equal((await invoke({method:'POST',headers,body})).statusCode,400);
console.log('Passed music prose extraction, locked bytes, research retention, unsafe edit rejection, text-only generation, failure preservation, authentication and request validation.');
for (const body of [{text:source,fieldId:'f999'},{text:source,fieldId:1},{text:source,instruction:'x'.repeat(2001)},{text:source,instruction:[]}]) assert.equal((await invoke({method:'POST',headers,body})).statusCode,400);
console.log('Passed field-selection and revision-instruction request validation.');
