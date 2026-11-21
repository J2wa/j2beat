import assert from 'node:assert/strict';
import { SECTION_TYPES } from '../shared/annotationSections.ts';
import { MANUAL_MODE_PROMPT } from '../shared/manualMode.ts';
import { SYSTEM_PROMPT } from '../src/constants.ts';

assert.equal(new Set(SECTION_TYPES).size, 47);
for (const prompt of [SYSTEM_PROMPT, MANUAL_MODE_PROMPT]) {
  for (const label of SECTION_TYPES) assert.ok(prompt.includes(`- ${label}: `));
  assert.match(prompt, /Start at 0:00 even if the music enters later/);
  assert.match(prompt, /Intro and outro are optional/);
  assert.match(prompt, /describe how the recording actually ends/);
  assert.match(prompt, /without guessing gender or identity/);
  assert.match(prompt, /one complete sentence describing the memorable melodic phrase/);
  assert.match(prompt, /exactly N\/A.*leave their tag lists empty/);
}
console.log('Passed 47-label vocabulary, and shared Golden Annotation prompt rules.');
