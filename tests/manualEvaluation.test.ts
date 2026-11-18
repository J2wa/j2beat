import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ManualMode } from '../src/components/ManualMode.tsx';
import { parseAnnotation, serializeAnnotation } from '../src/utils/annotationForm.ts';
import { buildManualInput, emptySong, manualRow, missingInstruments, prepareManualDraft, type ManualSheet } from '../src/utils/manualEvaluation.ts';

const sheet: ManualSheet = {
  rows: [{...manualRow('0:00'), type: 'intro', instruments: 'Guitar', vibe: 'Warm', parts: 'Guitar, picks slowly\nTambourine, on the backbeat'}],
  notes: {'Genre, Era & Scene': 'Acoustic pop'},
  tags: {genreEraScene: 'Acoustic pop'},
  song: {...emptySong, title: 'Morning', artist: 'Sangkay', version: 'Live', instrumental: true},
};
assert.deepEqual(missingInstruments(sheet.rows[0]), ['Tambourine']);
assert.match(buildManualInput(sheet, 55), /Instrumental: yes\n/);
assert.match(buildManualInput(sheet, 55), /genre, era and scene facts: Acoustic pop/);
assert.match(buildManualInput(sheet, 55), /vocal expression facts: N\/A/);

const generated = serializeAnnotation([
  {startTime: '00:00', type: 'verse', description: 'The guitar keeps a gentle pulse.', instruments: 'Strings', vibe: 'Loud', melody: '', isUnsure: false},
], {genreEraScene: 'The acoustic setup suggests pop.', genreEraSceneTags: 'Folk', mix: 'Unsupported mix detail', vocal: 'Unsupported singing', songBy: 'Wrong artist'});
const notesOnly = parseAnnotation(prepareManualDraft(generated, sheet, false));
assert.equal(notesOnly.sections[0].startTime, '0:00');
assert.equal(notesOnly.sections[0].type, 'intro');
assert.equal(notesOnly.sections[0].instruments, 'Guitar');
assert.equal(notesOnly.sections[0].vibe, 'Warm');
assert.equal(notesOnly.globalMetadata.songTitle, 'Morning — Live');
assert.equal(notesOnly.globalMetadata.songBy, 'Sangkay');
assert.equal(notesOnly.globalMetadata.genreEraSceneTags, 'Acoustic pop');
assert.match(notesOnly.globalMetadata.mix!, /^\[NEEDS INPUT:/);
assert.equal(notesOnly.globalMetadata.vocal, 'N/A');
assert.equal(notesOnly.globalMetadata.lyrics, 'N/A');
const assisted = parseAnnotation(prepareManualDraft(generated, sheet, true));
assert.equal(assisted.globalMetadata.mix, 'Unsupported mix detail');
assert.throws(() => prepareManualDraft(generated.replace('00:00', '0:03'), sheet, false), /did not match your section times/);

const html = renderToStaticMarkup(createElement(ManualMode, {
  active: true, marksRequest: {id: 0, times: []}, playerMarks: [],
  file: new File([], 'morning.mp3', {type: 'audio/mpeg'}), duration: 55, currentTime: 0,
  renderPlayer: (starts, canMark) => {
    assert.deepEqual(starts, [0]);
    assert.equal(canMark, true);
    return createElement('div', null, 'Guide player');
  },
  onSeek() {}, onPlaySection() {}, onComplete() {}, onBusy() {},
}));
assert.match(html, /Manual evaluation steps/);
assert.match(html, /Step 1 of 4/);
assert.match(html, /Mark a section here/);
assert.match(html, /aria-current="step"/);
assert.doesNotMatch(html, /Which instruments can you hear\?/);
console.log('Passed manual guide rendering, instrument gaps, and notes-only write-up validation.');
