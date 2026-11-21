import { TEMPO_BUCKETS } from './goldenAnnotation.js';

export const GLOBAL_SUGGESTION_FIELDS = {
  genreEraScene: 'A plausible broad genre and the audible features that support it. Era and cultural scene require reliable context unavailable in this listening-only pass.',
  tempoRhythmGroove: `Describe pace, pulse, accents, and how the parts create the groove. Put the supported tempo bucket in tags: ${TEMPO_BUCKETS.join(' / ')}. Mark any BPM as approximate.`,
  harmonyChordsKey: 'Tonal color, chord movement, stability, or tension and release. Exact keys or progressions require reliable confirmation.',
  instrumentation: 'Recognizable sound sources and their roles across the arrangement.',
  playingStyle: 'Audible techniques and articulation, tied to the instruments or voices that use them.',
  wowFactor: 'A specific standout musical moment and what makes it stand out.',
  emotionVibeSetting: 'Perceived mood, the audible parts or playing choices that create it, and how it changes across the song. Include a fitting listening setting when supported.',
  mix: 'Relative levels, placement, space, and audible effects. Avoid guessing equipment or studio methods.',
  fidelity: 'Audible clarity, noise, distortion, or masking.',
  vocal: 'Audible register, pitch range, timbre, and phrasing. Omit when absent. Never infer gender or identity.',
  lyrics: 'Themes supported by clearly audible words. Paraphrase, do not quote. Omit when absent or unclear.',
} as const;

export type GlobalSuggestionField = keyof typeof GLOBAL_SUGGESTION_FIELDS;
export type GlobalSuggestion = {notes: string; tags: string[]};
export type GlobalSuggestions = Partial<Record<GlobalSuggestionField, GlobalSuggestion>>;

export function parseGlobalSuggestions(text: string): GlobalSuggestions {
  const data = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  const raw: unknown = data?.suggestions;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid whole-song suggestions');

  const suggestions: GlobalSuggestions = {};
  for (const field of Object.keys(GLOBAL_SUGGESTION_FIELDS) as GlobalSuggestionField[]) {
    if (!Object.hasOwn(raw, field)) continue;
    const candidate = (raw as Record<string, Partial<GlobalSuggestion> | null>)[field];
    if (!candidate || typeof candidate.notes !== 'string' || !Array.isArray(candidate.tags)) continue;
    const notes = candidate.notes.replace(/\s+/g, ' ').trim();
    if (!notes || notes.length > 1200) continue;
    const tags = new Map<string, string>();
    for (const item of candidate.tags.slice(0, 8)) {
      if (typeof item !== 'string') continue;
      const tag = item.trim();
      if (tag && tag.length <= 60 && !/[,\r\n]/.test(tag) && !tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
    }
    suggestions[field] = {notes, tags: [...tags.values()]};
  }
  if (Object.keys(raw).length && !Object.keys(suggestions).length) throw Error('No readable whole-song suggestions');
  return suggestions;
}
