export const TEMPO_BUCKETS = ['Very Slow', 'Slow', 'Mid-tempo', 'Upbeat', 'Fast', 'Very Fast'] as const;

export const LYRICS_UNAVAILABLE = 'Lyrics unavailable';
export const isLyricsUnavailable = (value?: string) => /^lyrics unavailable\.?$/i.test(value?.trim() ?? '');
export const LYRICAL_EVOCATION_RULE = `When the lyrics are primarily in English and understandable, summarize the main theme or story in your own words from what you understand. If the lyrics are non-English or you cannot understand enough to summarize them reliably, use exactly "${LYRICS_UNAVAILABLE}" and leave Lyrical Evocation Tags empty. Do not quote lyrics or guess a theme from a title, translation, or search result. For an instrumental, use N/A instead.`;

export const GOLDEN_NARRATIVE_RULES = `GOLDEN ANNOTATION CHECKLIST
Write each section narrative in complete, standalone sentences. Describe what each part does, how it sounds or is played, and the audible interactions or changes. Do not cross-reference other rows with wording such as "same as before", "similar to the previous section", or "repeats the chorus". Describing repetition within the current row is fine.
Match section instrument tags and narrative parts in both directions. Aim for four to six foundational parts when that many are clearly audible; use fewer for sparse sections. Include an audible vocal part in both fields, using a role such as lead vocals, rap vocals, or backing vocals without guessing gender or identity. Preserve brief events in the narrative and describe the actual ending in the last row.
Use concise section-specific mood or energy tags. Leave out genre names and contradictory mood tags.`;

export const GOLDEN_GLOBAL_RULES = `GOLDEN WHOLE-SONG CHECKLIST
Use keyword tags and complete descriptive sentences. Cover each field with the available evidence and mark uncertainty or missing facts without guessing.
- Genre, Era & Scene: give genre or subgenre and justify it from audible features. Include original release era and cultural scene where supported by reliable context. Distinguish the cultural scene from a listening setting and label stylistic resemblance as such.
- Tempo, Rhythm & Groove: use a supported tempo bucket (${TEMPO_BUCKETS.join(' / ')}), describe the subdivision or accents, and explain how the parts create the groove.
- Harmony, Chords & Key: describe harmonic color and chord movement. Give a named key or chord sequence only when established from reliable evidence for this recording. Otherwise describe supported major or minor color or leave the tonal center uncertain.
- Instrumentation and Playing Style: identify what plays and each part's arrangement role in Instrumentation. Explain audible performance techniques in Playing Style.
- Wow Factor: name a specific standout and why. If nothing stands out, say so in a sentence.
- Emotion, Vibe & Setting: address the emotion, the atmosphere and what makes it feel that way, and a plausible listening setting.
- Mix & Production: describe audible foreground and background balance, width and space, notable effects, and stereo movement when present.
- Sonic Fidelity: describe audible clarity, noise, masking, distortion, or other quality traits. Avoid assuming equipment or studio credentials.
- Vocal Expression: describe register, pitch range, timbre, delivery, audible effects, and changes where supported. Never guess gender or identity.
- Lyrical Evocation: ${LYRICAL_EVOCATION_RULE} For an instrumental, write exactly N/A in the Vocal Expression and Lyrical Evocation prose fields and leave their tag lists empty.`;
