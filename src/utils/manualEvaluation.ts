import { displayTimestamp, timestampSeconds } from '../../shared/manualSegments';
import { splitResearch } from '../../shared/research';
import { isSectionUnsure, parseAnnotation, serializeAnnotation, type GlobalMetadata } from './annotationForm';

export const COMMON_INSTRUMENTS = ['Acoustic guitar', 'Electric guitar', 'Bass', 'Synth bass', 'Piano', 'Electric piano', 'Synthesizer', 'Drum kit', 'Kick', 'Snare', 'Shaker', 'Tambourine', 'Lead vocals', 'Backing vocals'];
export const MOODS = ['Warm', 'Calm', 'Bright', 'Tense', 'Reflective', 'Energetic'];

export const QUESTIONS = [
  { key: 'genreEraScene', tagKey: 'genreEraSceneTags', group: 0, label: 'Genre, Era & Scene', prompt: 'What style of music is it?', hint: 'Name the style and what you hear that supports it. Add the original release era and cultural scene when known.' },
  { key: 'tempoRhythmGroove', tagKey: 'tempoRhythmGrooveTags', group: 0, label: 'Tempo, Rhythm & Groove', prompt: 'How fast is it, and what is the rhythm like?', hint: 'Choose a tempo bucket and describe the pulse, accents, and groove.' },
  { key: 'harmonyChordsKey', tagKey: 'harmonyChordsKeyTags', group: 0, label: 'Harmony, Chords & Key', prompt: 'How do the chords feel?', hint: 'Describe how the chords move or feel. Name the key or progression only when verified.' },
  { key: 'instrumentation', tagKey: 'instrumentationTags', group: 0, label: 'Instrumentation', prompt: 'Which instruments carry the song?', hint: 'Who leads, and who supports?' },
  { key: 'playingStyle', tagKey: 'playingStyleTags', group: 0, label: 'Playing Style', prompt: 'How are the main parts played?', hint: 'Soft fingerpicking, with steady shaker hits.' },
  { key: 'vocal', tagKey: 'vocalTags', group: 1, label: 'Vocal Expression', prompt: 'What does the singing sound like?', hint: 'A close, quiet lead with harmony in the chorus.' },
  { key: 'lyrics', tagKey: 'lyricsTags', group: 1, label: 'Lyrical Evocation', prompt: 'What are the lyrics about, in general?', hint: 'Themes only, such as looking back or leaving home.' },
  { key: 'wowFactor', tagKey: 'wowFactorTags', group: 2, label: 'Wow Factor', prompt: 'What stands out most?', hint: 'One moment a listener might remember.' },
  { key: 'emotionVibeSetting', tagKey: 'emotionVibeSettingTags', group: 2, label: 'Emotion, Vibe & Setting', prompt: 'How does it feel, and where would you listen to it?', hint: 'Reflective, suited to a quiet evening.' },
  { key: 'mix', tagKey: 'mixTags', group: 2, label: 'Mix & Production', prompt: 'How does the mix sound?', hint: 'The vocal is up front, with a wide shaker sound.' },
  { key: 'fidelity', tagKey: 'fidelityTags', group: 2, label: 'Sonic Fidelity', prompt: 'How is the recording quality?', hint: 'Clear, muffled, noisy, or distorted. Describe what you hear.' },
] as const;
export const QUESTION_GROUPS = ['The music', 'Voice and words', 'Feel and sound'];

export type ManualRow = { start: string; type: string; instruments: string; parts: string; vocals: string; changes: string; vibe: string; melody: string };
export const manualRow = (start = ''): ManualRow => ({start, type: '', instruments: '', parts: '', vocals: '', changes: '', vibe: '', melody: ''});
export const emptySong = {title: '', artist: '', version: '', performers: '', instrumental: false};
export type ManualSheet = {
  rows: ManualRow[];
  notes: Record<string, string>;
  tags: Record<string, string>;
  song: typeof emptySong;
};
export const itemList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
const keyFor = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();
export const GAP_MARKER = /\[NEEDS INPUT:\s*([^\]]+)\]/gi;
export const missing = (message: string) => `[NEEDS INPUT: ${message}]`;

export function missingInstruments(row: ManualRow) {
  const confirmed = new Set(itemList(row.instruments).map(keyFor));
  return [...new Set(row.parts.split('\n').flatMap(line => {
    // The editor asks for “instrument, what it does” on each line.
    const head = line.match(/^\s*(?:[-•]\s*)?([^,:]+?)[,:]/)?.[1]?.trim();
    const instrument = head && COMMON_INSTRUMENTS.find(name => keyFor(name) === keyFor(head));
    return instrument && !confirmed.has(keyFor(instrument)) ? [instrument] : [];
  }))];
}

export function sectionEnd(rows: readonly ManualRow[], index: number, duration: number) {
  return index + 1 < rows.length ? timestampSeconds(rows[index + 1].start) : Math.floor(duration);
}

export function buildManualInput(sheet: ManualSheet, duration: number) {
  const { rows, notes, tags, song } = sheet;
  const segments = rows.map(row => [
    `[${row.start}] ${row.type}`, `Instruments: ${row.instruments}`, `Parts and playing: ${row.parts}`,
    `Vocals: ${row.vocals}`, `Changes: ${row.changes}`, `Vibe: ${row.vibe}`, `Melody: ${row.melody}`,
  ].join('\n'));
  const global = QUESTIONS.map(question => {
    const instrumental = song.instrumental && question.group === 1;
    const label = question.label.toLowerCase().replace(' & ', ' and ');
    const factsLabel = ({harmonyChordsKey: 'Harmony', emotionVibeSetting: 'Emotion and setting', lyrics: 'Lyrical themes'} as Record<string, string>)[question.key] ?? label;
    return [
      `${label} tags: ${instrumental ? '' : tags[question.key] || ''}`,
      `${factsLabel}${question.key === 'lyrics' ? '' : ' facts'}: ${instrumental ? 'N/A' : notes[question.label] || ''}`,
    ].join('\n');
  });
  return [
    'MANUAL ANNOTATION INPUT', '', 'HEADER', `Track duration: ${displayTimestamp(duration)}`,
    'Sentences per narrative: 1 to 2', 'Trailing commas: no', `Instrumental: ${song.instrumental ? 'yes' : 'no'}`, '',
    'SONG', `Title: ${song.title}`, `Artist: ${song.artist}`, `Version: ${song.version}`,
    `Performing artists: ${song.performers}`, 'Lyrics and song structure:', '',
    'SEGMENTS', segments.join('\n\n'), '', 'GLOBAL', global.join('\n'),
  ].join('\n');
}

export function prepareManualDraft(text: string, sheet: ManualSheet, useAudio: boolean) {
  const parsed = parseAnnotation(text);
  if (!parsed.sections.length) throw Error('The write-up did not include any sections. Please try again.');
  const byStart = new Map(parsed.sections.map(section => [timestampSeconds(section.startTime), section]));
  if (!useAudio && (parsed.sections.length !== sheet.rows.length || sheet.rows.some(row => !byStart.has(timestampSeconds(row.start))))) {
    throw Error('The write-up did not match your section times. Your notes are saved. Please try again.');
  }
  const sections = useAudio ? parsed.sections : sheet.rows.map(row => {
    const generated = byStart.get(timestampSeconds(row.start))!;
    const description = [row.parts, row.vocals, row.changes].some(value => value.trim())
      ? generated.description || missing('No write-up was returned for this section')
      : missing('Add notes about what you heard in this section');
    return {
      startTime: row.start, type: row.type, instruments: row.instruments, vibe: row.vibe, melody: row.melody,
      description, isUnsure: isSectionUnsure(row.instruments, description),
    };
  });
  const title = [sheet.song.title || (useAudio ? parsed.globalMetadata.songTitle : ''), sheet.song.version].filter(Boolean).join(' — ');
  const globalMetadata: GlobalMetadata = {
    ...parsed.globalMetadata, songTitle: title,
    songBy: sheet.song.artist || (useAudio ? parsed.globalMetadata.songBy : ''),
    performingArtists: sheet.song.performers || (useAudio ? parsed.globalMetadata.performingArtists : ''),
    lyricsAndStructure: useAudio ? parsed.globalMetadata.lyricsAndStructure : sheet.rows.map(row => row.type.trim()).filter(Boolean).join(' → '),
  };
  for (const question of QUESTIONS) {
    const instrumental = sheet.song.instrumental && question.group === 1;
    if (instrumental) {
      globalMetadata[question.key] = 'N/A';
      globalMetadata[question.tagKey] = '';
    } else {
      if (!useAudio || sheet.tags[question.key]?.trim()) globalMetadata[question.tagKey] = sheet.tags[question.key] ?? '';
      if ((!useAudio && !sheet.notes[question.label]?.trim()) || !globalMetadata[question.key]?.trim()) {
        globalMetadata[question.key] = missing(question.prompt);
      }
    }
  }
  const { research, audioQaIncomplete } = splitResearch(text);
  return serializeAnnotation(sections, globalMetadata, research, audioQaIncomplete);
}
