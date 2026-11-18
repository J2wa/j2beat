import assert from 'node:assert/strict';
import {parseAnnotation, serializeAnnotation} from '../src/utils/annotationForm.ts';
import {attachResearch, splitResearch, type ResearchReport} from '../shared/research.ts';

const source = `Timeline Sections
- **Start Time:** 0:00
- **Section Type:** Intro
- **Narrative Description:** Piano plays.
- **Instruments:** Piano,
- **Vibe Tags:** Calm
- **Melody:** Piano clipped notes

- **Start Time:** 01:00
- **Section Type:** Outro
- **Narrative Description:** Piano fades.

Global Musical Matrix
21. Lyrical Evocation Tags: Reflection
22. Lyrical Evocation: Reflective phrases.

**Song title:** Early Rising
Song by: The Trio

### Performing Artists
Piano: A. Reyes
Voice: D. Reyes

---

Lyrics & Song Structure
A verse followed by a refrain.
The outro fades.`;

const research: ResearchReport = {status:'unavailable', message:'Unavailable', summary:'', sources:[], queries:[]};
const parsed = parseAnnotation(attachResearch(source, research, true));
assert.deepEqual(parsed.sections.map(section => section.startTime), ['0:00', '01:00']);
assert.equal(parsed.sections[0].melody, 'Piano clipped notes');
assert.equal(parsed.globalMetadata.lyrics, 'Reflective phrases.');
const metadata = {
  songTitle: 'Early Rising',
  songBy: 'The Trio',
  performingArtists: 'Piano: A. Reyes\nVoice: D. Reyes',
  lyricsAndStructure: 'A verse followed by a refrain.\nThe outro fades.',
};
for (const [key, value] of Object.entries(metadata)) assert.equal(parsed.globalMetadata[key as keyof typeof metadata], value);

// A revision in the form can be switched to raw and saved back to the form.
parsed.sections[0].description = 'Piano plays a soft opening phrase.';
const serialized = serializeAnnotation(parsed.sections, parsed.globalMetadata, research, true);
const restored = parseAnnotation(serialized);
assert.deepEqual(restored, parsed);
assert.equal(splitResearch(serialized).audioQaIncomplete, true);
assert.deepEqual(splitResearch(serialized).research, {...research,searchEntryPoint:undefined});
assert.equal(parseAnnotation('Global Musical Matrix\n22. Lyrical Evocation: No words.\nLyrics & Song Structure: Instrumental').globalMetadata.lyrics, 'No words.');
console.log('Passed editable timeline and trailing metadata round-trip with research.');
