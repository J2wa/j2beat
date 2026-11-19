import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import App from '../src/App.tsx';
import {NATURAL_MUSIC_WRITING,PLAIN_MUSIC_PROSE,segmentWritingHints} from '../shared/naturalMusicWriting.ts';
import {SYSTEM_PROMPT} from '../src/constants.ts';
import {KNOWLEDGE_BASE} from '../src/knowledgeBase.ts';
import {MUSIC_HUMANIZER_RULES} from '../shared/musicHumanizer.ts';
import {MANUAL_MODE_PROMPT} from '../shared/manualMode.ts';

const hints = segmentWritingHints(13,()=>0.1).split('\n').filter(line=>line.startsWith('Segment '));
assert.equal(hints.length,13);
assert.equal(new Set(hints.slice(0,6).map(line=>line.replace(/^Segment \d+: /,''))).size,6);
for (let i=1;i<hints.length;i++) assert.notEqual(hints[i].split(': ')[1],hints[i-1].split(': ')[1]);
assert.notEqual(segmentWritingHints(6,()=>0.1),segmentWritingHints(6,()=>0.9));
assert.match(segmentWritingHints(0),/Choose independently/);
for (const count of [-1,201,1.5,NaN]) assert.throws(()=>segmentWritingHints(count));
assert.ok(SYSTEM_PROMPT.includes(NATURAL_MUSIC_WRITING));
assert.ok(MUSIC_HUMANIZER_RULES.includes(NATURAL_MUSIC_WRITING));
assert.ok(NATURAL_MUSIC_WRITING.includes(PLAIN_MUSIC_PROSE));
assert.ok(MANUAL_MODE_PROMPT.includes(PLAIN_MUSIC_PROSE));
assert.doesNotMatch(KNOWLEDGE_BASE,/Template \d|#### Formulas|THE UNIVERSAL ANNOTATION FLOW/);
assert.match(KNOWLEDGE_BASE,/MELODY DESCRIPTION GUIDELINES/);
assert.match(KNOWLEDGE_BASE,/INSTRUMENT IDENTIFICATION/);

// Render the actual Studio with stale saved template values to verify that both
// entry points disappeared and those preferences are no longer even read.
const accessed:string[]=[];
const memory = new Map([['active_profile','VOCAL'],['annotation_profile','brief']]);
Object.defineProperty(globalThis,'localStorage',{value:{getItem(key:string){accessed.push(key);return memory.get(key) ?? null;},setItem(key:string,value:string){memory.set(key,value);}},configurable:true});
const html = renderToStaticMarkup(createElement(App));
assert.doesNotMatch(html,/profile-select|Choose your analysis profile|>Profile<|Writing style|>Brief</);
assert.ok(!accessed.includes('active_profile') && !accessed.includes('annotation_profile'));
assert.match(html,/Natural writing is automatic/);
assert.match(html,/model-select/);
assert.match(html,/Simple language/);
assert.match(html,/Detailed segmentation/);
console.log('Passed independently shuffled segment cues, shared natural-writing policy, removed runtime sentence banks, and rendered Studio without template controls or stale preference reads.');
