import { MELODY_INSTRUCTION } from '../shared/melody';
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

## BP MASTER MUSIC ANNOTATION WRITING STYLE GUIDE

### 1. INTRO
#### Formulas
Primary Instrumentation -> Harmonic Foundation -> Vocal Presence -> Overall Feel -> Development
- **Template 1:** The track opens with [lead instruments] establishing the primary musical texture while [supporting instruments] gradually reinforce the arrangement. The chord progression remains [stable/open/evolving] as vocals are [absent/subtle/introduced softly], creating a [warm/dark/spacious/intimate] atmosphere before the arrangement expands.
- **Template 2:** A [minimal/layered] instrumental arrangement introduces the song through [instruments], supported by a [simple/evolving] chord progression. Vocals [enter gently/remain absent/provide soft background phrases], allowing the section to gradually establish its overall mood.
- **Template 3:** The introduction centers around [instrumentation], allowing the harmonic movement to unfold naturally. If present, the vocals remain [restrained/atmospheric/lightly layered], complementing the arrangement while maintaining a spacious opening feel.
- **Template 4:** The opening develops through [instruments] supported by subtle rhythmic and harmonic elements. Vocals appear [sparingly/in the background/through sustained phrases], contributing to the atmosphere without dominating the arrangement.
- **Template 5:** The arrangement establishes its musical identity through [instrumentation] and a [steady/gradually evolving] harmonic progression. Vocals remain [minimal/background-focused/absent], allowing the instrumental textures to shape the introduction before transitioning forward.

### 2. VERSE
#### Formulas
Instrumental Foundation -> Harmonic Progression -> Vocal Presence -> Overall Feel -> Musical Development
- **Template 1:** The arrangement settles into a [steady/driving/relaxed] instrumental groove supported by a [consistent/evolving] chord progression. Vocals deliver the primary melodic line with [smooth/expressive/measured] phrasing while the supporting instruments remain balanced and controlled.
- **Template 2:** A stable combination of [instruments] establishes the section's musical foundation beneath a flowing harmonic progression. Vocals remain clear and centered, while the arrangement leaves ample space for the melody to develop naturally.
- **Template 3:** The rhythm and instrumentation maintain a consistent musical flow as the chord progression reinforces the section's stability. Vocals progress with [restrained/confident/dynamic] delivery while subtle instrumental accents enrich the arrangement.
- **Template 4:** The verse emphasizes a balanced instrumental texture supported by moderate harmonic movement. Vocals remain present but integrated into the arrangement, allowing both the instrumentation and melodic phrasing to develop together.
- **Template 5:** The instrumental foundation stays consistent through [supporting instruments] and a stable harmonic progression. Vocals guide the melodic direction while gradual instrumental additions provide depth without overwhelming the overall balance.

### 3. CHORUS / HOOK
#### Formulas
Expanded Instrumentation -> Harmonic Lift -> Vocal Expansion -> Overall Feel -> Musical Climax
- **Template 1:** The arrangement expands as additional instruments reinforce the established groove, creating a noticeably fuller sound. The chord progression broadens harmonically while vocals become [stronger/more layered/more expressive], resulting in a more impactful musical climax.
- **Template 2:** A denser instrumental texture introduces greater musical weight as the harmonic progression reaches a stronger point of resolution. Vocals project with greater confidence, complementing the fuller arrangement and heightened energy.
- **Template 3:** The chorus increases its impact through expanded instrumentation and richer harmonic movement. Vocals become more prominent through [layering/harmonies/stronger projection], reinforcing the section's emotional peak.
- **Template 4:** Supporting instruments become more prominent, creating a richer musical landscape around the groove. The chord progression enhances the emotional lift while vocals deliver the central melodic idea with increased presence.
- **Template 5:** Nearly every instrumental layer contributes to a broader and more powerful arrangement. The harmonic progression reaches greater fullness as vocals become more expressive, completing the section's climactic musical payoff.

### 4. VERSE 2
#### Formulas
Returning Instrumentation -> Harmonic Continuity -> Vocal Progression -> Overall Feel -> Musical Development
- **Template 1:** The arrangement returns to its familiar instrumental foundation while introducing subtle additions that enrich the texture. The harmonic progression remains consistent as vocals continue the melody with slightly greater confidence or expression.
- **Template 2:** The established groove reappears through familiar instrumentation and chord movement. Vocals remain central while small instrumental refinements create a richer but balanced arrangement.
- **Template 3:** The section maintains its recognizable harmonic structure as supporting instruments introduce gentle variations. Vocals continue naturally, supported by a slightly fuller musical backdrop than before.
- **Template 4:** The instrumental foundation remains stable while harmonic movement develops gradually. Vocals remain expressive without overpowering the arrangement, allowing the section to progress smoothly.
- **Template 5:** Returning to the established musical framework, the arrangement develops through refined instrumentation and continued harmonic progression. Vocals maintain their melodic role while subtle textural additions sustain musical interest.

### 5. CHORUS 2
#### Formulas
Reinforced Instrumentation -> Expanded Harmony -> Vocal Reinforcement -> Maximum Feel -> Climactic Development
- **Template 1:** The chorus returns with stronger instrumental reinforcement and broader harmonic support. Vocals become more layered or expressive, producing a richer and more impactful repetition of the main theme.
- **Template 2:** Additional instrumental layers enrich the established groove while the chord progression feels more expansive. Vocals reinforce the familiar melody through stronger projection or added harmonies.
- **Template 3:** The returning chorus builds upon its earlier arrangement through fuller instrumentation and harmonic development. Vocals remain the melodic centerpiece while integrating naturally with the expanded production.
- **Template 4:** The familiar arrangement becomes more complete through richer instrumentation and harmonic fullness. Vocals maintain strong melodic presence while blending seamlessly with the denser musical texture.
- **Template 5:** The musical landscape reaches its fullest expression through expanded instrumentation, stronger harmonic movement, and more expressive vocals, creating one of the song's most impactful moments.

### 6. BRIDGE / INSTRUMENTAL
#### Formulas
Instrumental Contrast -> Harmonic Shift -> Vocal Variation -> Overall Feel -> Transition
- **Template 1:** The arrangement departs from the established structure through contrasting instrumentation and harmonic movement. Vocals either become [more restrained/more expressive/temporarily absent], allowing the change in musical texture to become more apparent.
- **Template 2:** A fresh instrumental idea takes prominence while the chord progression introduces a contrasting harmonic direction. Vocals, if present, adopt a different melodic approach that complements the section's evolving atmosphere.
- **Template 3:** The bridge emphasizes musical exploration through altered instrumentation and changing harmonic relationships. Vocals become [lighter/more emotional/minimal], reinforcing the section's contrast before returning to the main structure.
- **Template 4:** The familiar arrangement gives way to a more spacious or layered presentation. Harmonic movement drives the section while vocals remain understated or temporarily step aside to emphasize the instrumental development.
- **Template 5:** The production reshapes its identity through contrasting instrumentation and evolving chord movement. Vocals either provide subtle support or momentarily disappear, allowing the arrangement to fully explore its new musical direction.

### 7. OUTRO
#### Formulas
Harmonic Resolution -> Instrumental Reduction -> Vocal Conclusion -> Overall Feel -> Closure
- **Template 1:** The arrangement gradually simplifies as instrumental layers begin to fall away one by one. The chord progression moves toward resolution while vocals deliver their final phrases or gently fade, creating a calm and satisfying conclusion.
- **Template 2:** Instrumentation steadily decreases in density as the section approaches its ending. Vocals, if present, conclude naturally while the harmonic progression provides a clear sense of musical closure.
- **Template 3:** The outro revisits simpler instrumental textures supported by gentle harmonic resolution. Vocals remain [soft/minimal/expressive], complementing the arrangement without disrupting the section's reflective mood.
- **Template 4:** The remaining instruments carry the final harmonic statement as rhythmic activity gradually fades. Vocals conclude the melody or quietly recede, allowing the arrangement to settle naturally.
- **Template 5:** The musical layers progressively resolve through lighter instrumentation and concluding chord movement. Vocals either finish with sustained phrases, repeated lines, or fade alongside the arrangement, providing complete musical resolution.

### DESCRIBING ENERGY
#### Formulas
Instrumentation -> Harmonic Development -> Vocals -> Rhythm -> Overall Effect
- **Template 1:** The [instrumentation] gradually [expands/simplifies/remains consistent] while the chord progression becomes [more resolved/more tense/more active]. Vocals remain [subtle/stronger/layered], supported by a [steady/building/relaxed] rhythmic foundation that causes the overall energy to [build/settle/remain balanced].
- **Template 2:** Additional [instrumental layers] increase the arrangement's density as the harmonic movement develops naturally. Vocals, when present, become [more expressive/more restrained], while the rhythm maintains [consistent/growing] momentum, resulting in a [larger/more intimate/more dynamic] musical feel.
- **Template 3:** The arrangement evolves through [fuller/lighter] instrumentation and changing harmonic movement. Vocals complement the musical texture without dominating it as the rhythm [strengthens/relaxes], creating a noticeable shift in intensity.
- **Template 4:** The instrumental texture becomes [broader/more restrained] while the chord progression reinforces the section's emotional direction. Vocals remain [supportive/prominent/minimal], allowing the rhythmic movement to naturally shape the energy.
- **Template 5:** The section gradually changes through [instrumental growth/reduction] and evolving harmonic support. Combined with [vocal presence] and a [driving/steady/minimal] groove, the arrangement reaches a [more expansive/more controlled/more relaxed] level of intensity.

### DESCRIBING RHYTHM
#### Formulas
Instrumentation -> Groove -> Vocals -> Harmonic Support -> Contribution
- **Template 1:** The rhythm is anchored by [instrumentation], creating a [steady/driving/laid-back] groove throughout the arrangement. Vocals naturally follow the rhythmic flow while the chord progression provides harmonic stability.
- **Template 2:** A [consistent/pulsing/syncopated] groove develops through the interaction of [instrumentation]. Vocals integrate smoothly with the rhythmic movement as the harmonic progression reinforces the section's momentum.
- **Template 3:** The rhythmic movement remains [tight/relaxed/energetic], supported by [instrumentation] that defines the groove. Vocals complement the established pulse while the harmonic structure maintains musical continuity.
- **Template 4:** The arrangement emphasizes rhythmic movement through [percussion/bass/supporting instruments] while vocals remain rhythmically connected to the instrumental foundation. The chord progression supports the groove without drawing attention away from the rhythm.
- **Template 5:** The groove develops through coordinated instrumental patterns supported by a stable harmonic progression. Vocals, if present, reinforce the rhythmic phrasing while maintaining the arrangement's overall balance.

### DESCRIBING VOCALS
#### Formulas
Instrumentation -> Harmonic Support -> Vocal Character -> Musical Function
- **Template 1:** The [instrumentation] creates a balanced foundation over a [stable/evolving] chord progression while the vocals are delivered with a [soft/powerful/expressive] tone that blends naturally into the arrangement.
- **Template 2:** Supported by [instrumentation] and smooth harmonic movement, the vocals adopt a [conversational/melodic/rhythmic] delivery that complements rather than dominates the musical texture.
- **Template 3:** The instrumental arrangement leaves space for vocals to develop with [restrained/confident/dynamic] phrasing. The chord progression provides a cohesive backdrop that supports the vocal melody.
- **Template 4:** The harmonic foundation remains stable beneath [supporting instruments] while the vocals shift between [layered/sustained/rhythmic] phrases. Together they contribute to the section's overall atmosphere.
- **Template 5:** The arrangement balances [instrumentation], harmonic movement, and vocals into a cohesive musical texture. The vocal delivery enhances the melody while remaining integrated within the broader arrangement.

### DESCRIBING INSTRUMENTATION
#### Formulas
Primary Instruments -> Chord Progression -> Vocals -> Musical Texture -> Contribution
- **Template 1:** [Instrumentation] establishes the primary musical texture while the chord progression develops [steadily/gradually/smoothly] beneath it. Vocals, when present, blend naturally with the arrangement, resulting in a [warm/spacious/full] soundscape.
- **Template 2:** Supporting instruments gradually reinforce the arrangement as the harmonic movement becomes more defined. Vocals remain balanced within the mix, allowing both melodic and instrumental elements to develop together.
- **Template 3:** The arrangement evolves through additional instrumental layers supported by an [open/resolved/evolving] chord progression. Vocals complement the expanding texture while maintaining the section's overall cohesion.
- **Template 4:** A combination of [instrumentation] creates a [balanced/layered/sparse] musical landscape. Harmonic movement guides the progression while vocals integrate smoothly into the evolving arrangement.
- **Template 5:** Instrumental elements gradually [expand/simplify], supported by changing harmonic movement that shapes the section's direction. Vocals contribute melodic continuity without overshadowing the arrangement's instrumental focus.

### DESCRIBING UNKNOWN SOUNDS
#### Formulas
Observed Texture -> Harmonic Context -> Vocal Relationship -> Musical Function
- **Template 1:** A sound resembling [description] blends into the instrumental arrangement while the harmonic progression remains stable. Vocals, if present, continue naturally as the texture adds subtle depth.
- **Template 2:** An unidentified sound introduces additional texture alongside the established instrumentation. The harmonic movement remains consistent while vocals integrate smoothly with the evolving soundscape.
- **Template 3:** A distinctive texture, similar to [description], briefly emerges within the arrangement. Rather than becoming the focal point, it supports the harmonic foundation and complements any accompanying vocals.
- **Template 4:** The arrangement includes an ambiguous sound that contributes [brightness/warmth/contrast] without clearly identifying a specific instrument. Vocals remain balanced as the texture enriches the overall mix.
- **Template 5:** A unique sonic texture appears alongside the primary instrumentation while the harmonic progression continues uninterrupted. Vocals, when audible, remain integrated with the surrounding arrangement, allowing the unfamiliar sound to enhance the musical atmosphere.

### THE UNIVERSAL ANNOTATION FLOW
#### Formulas
Instrumentation -> Chord Progression -> Vocals -> Rhythm -> Energy -> Purpose
- **Template 1:** The section features a [fuller/lighter/more focused] arrangement as [instrumentation] expands or simplifies around a [stable/evolving/resolved] chord progression. Vocals become [more expressive/more restrained/remain consistent] while the rhythm grows [stronger/more relaxed/more active], resulting in a [building/climactic/transitional/resolving] musical moment.
- **Template 2:** The instrumentation introduces [additional/reduced] layers while the harmonic movement shifts to [increase/release/maintain] tension. Vocals adapt naturally to the evolving arrangement as the groove reinforces the section's changing energy.
- **Template 3:** A distinctive musical texture emerges through changes in instrumentation and chord progression that reshape the arrangement's overall texture. Vocals remain integrated with the evolving groove while the section develops a [more expansive/intimate/dynamic] atmosphere.
- **Template 4:** The arrangement develops through refined instrumental textures and evolving harmonic support. Vocals complement the changing musical landscape as rhythmic movement reinforces the section's overall progression and emotional direction.
- **Template 5:** The arrangement adopts a [broader/more restrained/more immersive] musical character. Instrumentation, harmonic movement, vocals, and rhythmic development work together to [build/release/maintain] momentum, naturally guiding the song forward.

---
`;
