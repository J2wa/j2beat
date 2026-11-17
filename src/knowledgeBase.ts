import { MELODY_INSTRUCTION } from '../shared/melody.js';
export const KNOWLEDGE_BASE = `
# KNOWLEDGE BASE

Use this knowledge base strictly as a database to check your work. Cross-reference the instruments and segments you detect with the definitions below to ensure high accuracy. Do not copy-paste from this section directly into the output.

## Segments & Structural Sections
- **Intro**: The opening section of the song, establishing mood, tempo, and key, often instrumental before the vocals/main melody begins.
- **Verse**: Sections that tell the story or provide details, typically with changing lyrics but a consistent melody.
- **Pre-Chorus**: A transitional section that builds tension and connects the verse to the chorus.
- **Chorus**: The emotional and musical climax, containing the main theme/hook, typically repeated with the same lyrics and melody.
- **Post-Chorus**: A secondary hook or instrumental tag that follows the chorus, keeping the energy high before returning to a verse.
- **Bridge**: A section providing musical and lyrical contrast, typically occurring after the second chorus, introducing a new chord progression or melody.
- **Outro**: The final section that brings the song to a close, often fading out or resolving the main theme.
- **Breakdown**: A sparse section where many instruments drop out, creating a sudden drop in energy.
- **Build-up**: A section (often in electronic music) characterized by risers, fast snares, and increasing tension leading to a drop.
- **Drop**: In electronic music, the climax of the track where the bass and main beat enter heavily.
- **Instrumental / Solo**: A section dedicated to an instrumental performance without lead vocals.
- **Vamp**: A short, simple chord progression repeated multiple times, often at the end of a song or during a solo.

## Instruments & Sonic Profiles
- **808 bass / 808 kick**: Deep sub-bass frequencies characteristic of modern Hip-Hop, Trap, and R&B. Heavy low-end impact.
- **Acoustic guitar**: Bright, natural plucked or strummed string sound. Used heavily in Folk, Country, and Pop.
- **Electric guitar (Clean)**: Smooth, amplified guitar, often used in Indie, Funk, and R&B.
- **Electric guitar (Distorted)**: Gritty, aggressive guitar sound, prominent in Rock and Metal.
- **Piano / Grand Piano**: Wide frequency range, acoustic keyboard sound. Can be percussive or soft/legato.
- **Electric Piano (Rhodes, Wurlitzer)**: Warm, bell-like or slightly gritty keyboard sound, often used in Jazz, Soul, and R&B.
- **Synthesizer / Synth Pad**: Sustained electronic chords creating atmosphere and filling the background.
- **Synth Lead**: Prominent, monophonic or polyphonic electronic melody line.
- **Acoustic drum kit**: Organic drum sound (Kick, Snare, Hi-hats, Toms, Cymbals).
- **Drum machine / Programmed drums**: Electronic, highly quantized percussive sounds (e.g., Roland TR-808/909).
- **Hi-hats (Closed/Open)**: High-frequency metallic sounds maintaining the rhythmic pulse.
- **String section (Violin, Viola, Cello, Double Bass)**: Bowed or plucked acoustic instruments providing rich, harmonic sustain or sharp, dramatic staccato hits.
- **Brass section (Trumpet, Trombone, Saxophone)**: Bright, powerful wind instruments, often used for stabs, solos, or anthemic melodies.

## Global Analysis Terminology
- **Harmony / Chords**: Focus on whether the progression is minor (dark, sad), major (bright, happy), or modal.
- **Rhythm & Groove**: Check for swing (uneven eighth notes), straight (even division), syncopation (accents off the beat), and four-on-the-floor (kick drum on every quarter note).
- **Mix & Production**: Check for reverb (sense of deep space), delay (echoes), distortion (grit), and panning (left/right placement).

---

ANNOTATOR KNOWLEDGE BASE
Internal reference only. Use this knowledge to improve accuracy and consistency. Do not output this section.

--- SECTION BOUNDARY DETECTION ---

Use the following musical cues to decide when a new segment truly begins. Only mark a boundary when one or more of these changes occur simultaneously or within 1-2 bars of each other:

- A new or removed instrument layer enters or exits and sustains for the rest of the section.
- The drum pattern changes its fundamental groove or switches from sparse to full, or drops out entirely.
- The chord progression or tonal center shifts to a new pattern that does not repeat back immediately.
- Vocal content changes from melodic singing to rap delivery, from lead to harmonies only, or from presence to absence.
- Energy level shifts sharply: a sudden strip-down to one or two elements, or a sudden wall-of-sound arrival.
- A riser, impact FX, or cymbal swell is audibly used as a transition device — this almost always signals an incoming boundary.
- The lyrical content or rhyme scheme changes from verse to hook or hook to verse.
- The song goes silent or near-silent for one or more beats.

Do NOT mark a new section for:
- A single-bar fill or drum roll that returns to the same groove.
- A one-time ad-lib or background vocal ornament.
- A brief bass slide or guitar bend between phrases.
- A momentary dynamic swell that resolves back to the same texture.

--- TEMPO ESTIMATION TRICKS ---

If tempo is unclear, count the kick drum hits or snare hits over 10 seconds and multiply by 6 to estimate BPM. For tracks without a clear kick:
- Tap along mentally to the pulse felt in the bassline or rhythm guitar.
- In electronic music, four-on-the-floor kick patterns make BPM counting straightforward.
- Swing grooves and triplet-based feels can make the perceived tempo feel slower than the actual BPM. Account for this before labeling the tempo.

Tempo label guidelines by BPM:
- Very slow: under 60 BPM
- Slow: 60-79 BPM
- Moderate: 80-109 BPM
- Upbeat: 110-139 BPM
- Fast: 140-169 BPM
- Very fast: 170+ BPM
- Varying: use only if BPM measurably changes mid-track, not just feels rushed or relaxed in one section.

--- KEY DETECTION TRICKS ---

To identify the key:
- Hum or identify the note the melody most naturally resolves to, especially at phrase endings. That resolution note is almost always the tonic.
- The bass note at the start and end of each phrase typically outlines the root.
- If the song sounds tense, unresolved, or dark, suspect a minor key. If it sounds settled and bright, suspect major.
- Common major key chord progressions: I-V-vi-IV, I-IV-V, I-vi-IV-V.
- Common minor key chord progressions: i-VII-VI-VII, i-VI-III-VII, i-iv-V, i-VII-VI-V.
- When uncertain between two relative keys (e.g. C Major vs A Minor), listen for where the bass and melody land at the end of a full phrase. The landing note is the tonic.
- Do not force a key if truly ambiguous. Write the most likely option followed by: or relative key.

--- INSTRUMENT IDENTIFICATION TRICKS ---

Keyboard family:
- Piano: full decay with natural resonance, no vibrato unless performed with touch.
- Rhodes: warm, slightly bell-like with a gentle tremolo tail on sustained notes. Common in soul, R&B, and jazz.
- Organ (Hammond): continuous tone with no natural decay, swell controlled by drawbars. Associated with gospel, blues, and classic rock. Often has rotary speaker effect producing a wobble.
- Synth keys: any keyboard sound with clearly digital or synthetic character, sharp attack or unusual timbre not matching acoustic or electric piano.

Bass family:
- 808 bass: sub-frequency sustained sine-wave tone, often pitch-bent, felt more than heard on small speakers. Common in trap, hip-hop, and R&B.
- Bass guitar: defined transient attack with string character. Can be heard plucked, slapped, or fingered.
- Synth bass: bass range with clearly electronic or modulated character. Lacks the string transient of bass guitar.

Drum family:
- Live drums: slightly inconsistent timing, natural room ambience, layered tonal character from cymbals and toms.
- Programmed drum kit: highly consistent timing unless humanized, cleaner transients, often dryer sound unless reverb is added.
- Trap drum kit: 808 kick, rapid hi-hat rolls, sharp snare, typically programmed. Distinct from hip-hop drums by the hi-hat patterns.
- 808 drums: refers specifically to the Roland TR-808 drum machine sound. Characterized by a round booming kick, snappy snare, and open metallic hi-hat.

String family:
- Strings: usually sustained, bowed sound with natural vibrato. Can be live or orchestral in character.
- String section: multiple string voices playing in harmony, giving a fuller orchestral pad sound.
- Orchestral strings: cinematic, layered, wide stereo spread, often with significant reverb.

Guitar family:
- Acoustic guitar: natural resonance, percussive attack from strumming, no amplifier character.
- Clean electric guitar: amplified but without distortion. Bright, articulate, single-note lines possible.
- Distorted electric guitar: clipped, sustained, harmonic-rich tone. Used in rock and metal.
- Muted guitar: palm-muted or muted strings producing a chunky, percussive, rhythmic effect.
- Lo-fi guitar: degraded or filtered guitar with tape hiss, low bitrate character, or intentional frequency roll-off.

Synthesis and electronic:
- Synth pad: sustained, evolving, atmospheric texture. Background or harmonic fill role.
- Synth lead: single melody voice with electronic character. Front-of-mix presence.
- Arp synth: rapidly repeating melodic pattern generated by an arpeggiator. Regular rhythmic pulse with a pitch sequence.
- Pluck synth: short sharp attack with quick decay, imitating a plucked string digitally. Common in pop and electronic music.
- Vocal chops: short chopped vocal samples repositioned rhythmically, often pitched to match the track.

Vocal processing identification:
- Autotune: pitch is corrected with a slight mechanical quality or unnatural smoothness between notes. Can be subtle or overt.
- Hard Autotune: robotic, stepwise pitch movement with no natural glide between notes. Associated with modern trap and hip-hop.
- Vocoder: voice is harmonized and filtered through a synthesizer, producing a robotic or synthesized vocal quality.
- Dry vocals: no audible reverb or delay. Voice sounds close and immediate.
- Reverb on vocals: tail of sound continues after each word or phrase ends. Creates a sense of space.
- Delay on vocals: discrete echo repetitions following the main vocal, often rhythmically in time with the track.
- Doubling: two near-identical vocal takes layered, creating a thickened, slightly wider sound.

--- HARMONY AND CHORD RECOGNITION TRICKS ---

When identifying chords without formal training:
- Listen to the bass note as the likely root of the chord.
- If the overall sound is stable and resolved, treat it as a tonic chord.
- If it sounds tense or expectant, it is likely a dominant function chord wanting to resolve.
- If it sounds slightly sad or unresolved but not tense, it is likely a subdominant or minor chord.
- Write chord progressions using Roman numerals when the exact pitches are uncertain. Example: I-V-vi-IV rather than C-G-Am-F if the key is ambiguous.
- When a song holds one chord for a long time with no movement, label it as a vamp in both the Harmony field and Section Type.
- Modal tracks often have a flat VII chord prominently used. Note this as it distinguishes Mixolydian or Dorian character from pure major or minor.

Common genre-chord fingerprints:
- Pop: I-V-vi-IV or I-IV-V
- R&B/Soul: ii-V-I with added 7ths, 9ths. Lush extended chords.
- Hip-hop: minor vamp or minor i-VII-VI loop. Often static or two-chord.
- Blues: I7-IV7-V7 twelve-bar pattern.
- Jazz: ii-V-I with chromatic movement and substitutions.
- EDM/House: typically diatonic, four-chord loops, often staying in major or natural minor.
- Trap: almost always minor, often stays on i or i-VII.

--- PRODUCTION ANALYSIS TRICKS ---

Reverb detection:
- If the sound seems to exist in a space and has a trailing decay after each note or hit, reverb is present.
- Short reverb: tight, controlled, keeps the mix clean. Common in pop and R&B.
- Long reverb: expansive, dreamy, washes of sound. Common in shoegaze, ambient, and ballads.
- No reverb (dry): sounds close, immediate, in-your-face. Common in lo-fi hip-hop and intimate folk recordings.

Sidechain detection:
- If the bass or pad appears to briefly duck or pump in volume every time the kick drum hits, sidechain compression is in use. Common in house, EDM, and some pop productions.

Saturation and warmth vs cold digital:
- Warm/Vintage: slight harmonic distortion on transients, slight frequency roll-off in the high end, tape hiss possible. Feels organic.
- Cold/Digital: precise transients, extended high-frequency content, clinical separation between elements.

Stereo width:
- Mono: all elements feel centered in the image.
- Wide: elements are panned distinctly left and right, creating a sense of space.
- Instruments like hi-hats, rhythm guitars, and pads are commonly panned wide. Lead vocals and kick/bass are usually centered.

Clipping detection:
- If loud transients sound harsh, crackly, or distorted in a way that does not seem intentional, the track may be clipping. Note this in Sonic Fidelity as a flaw.

--- GROOVE AND RHYTHM IDENTIFICATION TRICKS ---

Straight vs swung:
- Straight: all subdivisions fall exactly on the grid. Feels mechanical or rigid.
- Swung: the second of every two subdivisions is delayed, creating a rolling, triplet-based feel. Common in jazz, blues, and some R&B.

Syncopation:
- When accents or notes fall between the main beats rather than on them, the rhythm is syncopated. This is common in funk, R&B, and reggae.

Four-on-the-floor:
- Kick drum hits every beat in a 4/4 bar. Common in house, techno, and disco.

Boom-bap:
- Kick on beat 1 and 3, snare on beat 2 and 4. Classic hip-hop groove.

Half-time feel:
- The snare lands on beat 3 only instead of beats 2 and 4, making the track feel half the speed of its actual BPM. Common in trap and some modern R&B.

--- MELODY DESCRIPTION GUIDELINES ---

${MELODY_INSTRUCTION}

--- SECTION TYPE SELECTION GUIDE ---

Use this as a decision aid when the correct section label is not immediately obvious:

- intro: opening material before any verse or hook appears. May be purely instrumental or ambient.
- verse: narrative or story-carrying section. Lyrics change each time it returns.
- pre-chorus: brief transitional section building tension before the chorus. Usually 2-4 bars.
- chorus: the main emotional and melodic peak. Lyrics typically repeat each time.
- post-chorus: a brief release or cool-down section immediately after the chorus. Often instrumental or hook-echo.
- bridge: a contrasting section that appears once, usually before the final chorus. Different melody and sometimes different harmony.
- hook: a short, catchy repeating phrase. Can be vocal or instrumental. Used when the primary identifier of the song is not a full chorus.
- outro: closing material after the final chorus or hook. May fade, strip down, or resolve.
- breakdown: energy strip-down within an otherwise energetic track. Instrumentation thins significantly.
- build-up: progressive addition of layers leading toward a drop or chorus. Rising tension.
- drop: the moment of peak impact after a build-up. Common in EDM and electronic tracks.
- vamp: a repeated one- or two-chord loop with no harmonic movement. Often used at the end of jazz or soul tracks.
- interlude: a standalone section that pauses the main song narrative. Not a verse, chorus, or bridge.
- transition: a very short passage, often only 1-2 bars, connecting two main sections.
- instrumental: a section with no vocals at all. Instrument-led melody or groove.
- solo: a featured improvised or composed instrumental passage, typically a single instrument.
- tag: a short repeated phrase at the end of a song, often the last line of the chorus sung multiple times.
- coda: formal musical ending material that is distinct from the outro. More common in classical-influenced writing.

When a section contains significant new melodic material but fits no standard label precisely, use: section, idea, or statement.

---

## Writing guidance
Use the musical definitions above as reference. Narrative wording comes from each segment's actual evidence.
There are no canned sentences, required narrative order, or sentence quotas.
`;
