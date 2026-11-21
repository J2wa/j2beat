// Approved section names and listening cues from the Music Section Annotation Handbook.
type SectionGroup = {label: string; sections: readonly (readonly [type: string, cue: string])[]};
export const SECTION_GROUPS: readonly SectionGroup[] = [
  {label: 'Opening, closing, and connecting', sections: [
    ['intro', 'Opening material that sets up the first principal passage.'],
    ['outro', 'Distinct closing passage that brings the performance to an end.'],
    ['coda', 'Formal closing passage after the main form has run its course.'],
    ['transition', 'Distinct connecting passage that prepares the next section.'],
    ['interlude', 'Self-contained passage with musical material of its own between major sections.'],
    ['pause', 'Structurally meaningful interruption, silence, or held suspension.'],
    ['section', 'Recognizable division whose musical function cannot be classified confidently.'],
    ['idea', 'Distinct motif or gesture less developed than a complete statement or theme.'],
  ]},
  {label: 'Lettered sections and statements', sections: [
    ['a section', 'First principal formal passage. Keep A when that material returns.'],
    ['b section', 'Formal passage with material that contrasts with A.'],
    ['c section', 'Third distinct formal idea, separate from a variation on A or B.'],
    ['d section', 'Fourth independently recognizable formal idea.'],
    ['e section', 'Fifth independently recognizable formal idea.'],
    ['statement', 'Coherent presentation of a recognizable theme or musical idea.'],
    ['first statement', 'First complete presentation of a musical idea.'],
    ['second statement', 'Second presentation of the same established idea, with or without variation.'],
    ['b statement', 'Presentation of contrasting B material. The letter identifies the idea.'],
    ['final statement', 'Final complete presentation of an established idea.'],
  ]},
  {label: 'Themes and development', sections: [
    ['theme', 'Recognizable musical idea important to the composition.'],
    ['main theme', 'Principal recurring thematic material.'],
    ['secondary theme', 'Distinct thematic idea that contrasts with or complements the main theme.'],
    ['development', 'Passage that transforms or explores previously introduced material.'],
    ['recapitulation', 'Formal return of principal themes after substantial development or contrast.'],
    ['bridge', 'Substantial contrasting section that prepares a return or further development.'],
    ['turnaround', 'Short phrase that leads into the next cycle of the form.'],
    ['tag', 'Short appended or repeated phrase that reinforces an established section or ending.'],
  ]},
  {label: 'Verse, chorus, and hook', sections: [
    ['verse', 'Recurring framework that typically advances the lyric with changing words.'],
    ['pre-verse', 'Distinct preparatory passage immediately before a verse.'],
    ['chorus', 'Principal recurring song section with a recognizable musical identity.'],
    ['pre-chorus', 'Distinct passage that prepares the chorus between verse and chorus.'],
    ['post-chorus', 'Distinct passage that extends or answers the chorus.'],
    ['hook', 'Memorable phrase or riff with clearly independent section boundaries.'],
    ['pre-hook', 'Distinct preparatory passage before the hook.'],
    ['post-hook', 'Distinct passage extending or answering the hook.'],
    ['final hook', 'Last recognizable presentation of the established hook.'],
    ['refrain', 'Short recurring phrase, often within a larger verse or chorus.'],
    ['post-refrain', 'Clearly separable passage that extends or answers the refrain.'],
  ]},
  {label: 'Rhythm and groove', sections: [
    ['break', 'Localized interruption or contrast in the established groove.'],
    ['breakdown', 'Substantial reduction or reconfiguration of the arrangement.'],
    ['build-up', 'Progressive rise in tension, energy, or density before a musical arrival.'],
    ['pre-drop', 'Distinct short cue or interruption immediately before the drop.'],
    ['drop', 'Decisive arrival or return of a prominent beat, bass, or groove.'],
    ['post-drop', 'Clearly changed passage that develops or extends the drop.'],
    ['drum break', 'Distinct passage in which percussion is the principal focus.'],
    ['vamp', 'Extended repetition of an accompaniment pattern, often supporting variation above it.'],
  ]},
  {label: 'Instrumental and solo', sections: [
    ['instrumental', 'Instruments carry the passage without lead vocals or spoken lyrics.'],
    ['solo', 'A featured performer takes the principal role, with or without accompaniment.'],
  ]},
];

export const SECTION_TYPES: readonly string[] = SECTION_GROUPS.flatMap(group => group.sections.map(([type]) => type));

export const SECTION_NAMING_RULES = `SECTION LABELS
Choose an approved label by audible musical function. Use the most specific supported label, with "section" as the fallback. Start at 0:00 even if the music enters later. Describe a delayed entrance when audible. Intro and outro are optional functions, not required positions. The first row can be a chorus or other principal section. The last row can be any supported section; describe how the recording actually ends in its narrative.
Give discernible returns their own rows and reuse the same structural label when the musical function returns. Avoid numbered or improvised labels. Write each row as a standalone description, including any audible variation, without referring the reader to an earlier row.
${SECTION_GROUPS.map(({label, sections}) => `${label}\n${sections.map(([type, cue]) => `- ${type}: ${cue}`).join('\n')}`).join('\n')}`;
