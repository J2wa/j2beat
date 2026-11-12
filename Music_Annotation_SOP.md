# Music Annotation Standard Operating Procedure (SOP)

## 1. Manual Annotation Workflow

This workflow dictates the step-by-step process for performing a chronological, deep-listening annotation of a musical track.

### Step-by-Step Process
1. **Initial Setup:** Begin listening from exactly `0:00`. Your goal is to describe the track chronologically, as if explaining its progression to someone on the phone in real-time.
2. **First & Last Segments:** The very first segment must **always** be labeled as `intro` (if applicable), and the final segment must **always** be labeled as `outro`.
3. **Detecting Boundaries:** Create a new segment *only* when the music changes significantly. Listen for the following cues to mark a boundary:
   - A dominant instrument layer enters or exits.
   - The drum pattern changes its fundamental groove or drops out.
   - The chord progression/tonal center shifts.
   - Vocal delivery changes dramatically (e.g., from singing to rap, or from lead to harmony).
   - Energy sharply spikes (a wall of sound) or drops (a breakdown).
4. **Applying Timestamps:** When a boundary is detected, mark the **Start Time** in `[MM:SS]` format. Be granular to the precise second based on the actual audio.
5. **Length Constraints:** 
   - A single segment **MUST NOT** exceed 60 seconds.
   - If a musical section naturally lasts longer than 50 seconds, you must split it into multiple segments by locating a subtle shift in the audio.
6. **Populate Metadata:** For each segment, fill out the following properties consistently:
   - **Section Type:** Select the strictly appropriate label (e.g., verse, chorus).
   - **Narrative Description:** Limit to exactly 1 or 2 sentences depending on configuration. Describe the transition and musical focus (DO NOT analyze lyrics). Do not refer to previous or other sections; make the description standalone for each segment.
   - **Instruments:** Provide a pure comma-separated list of active dominant instruments (e.g., *Drum kit, Synth bass, Acoustic guitar,*).
   - **Vibe Tags:** Provide a comma-separated list of mood and energy descriptors.
   - **Melody:** [A short 3–7 word phrase naming the tagged instrument or voice and its audible gesture, e.g. electric guitar syncopated stabs. Avoid full sentences and repeating the narrative. Leave blank without melodic evidence.]

---

## 2. Segment Descriptions Database

Cross-reference this database to assign the most accurate structural section type.

| Segment Type | Strict Definition | Key Auditory Indicators & Structural Markers |
| :--- | :--- | :--- |
| **Intro** | The opening section establishing mood, tempo, and key. | Usually instrumental before main vocals begin. Sets the tonal center. |
| **Verse** | Narrative sections providing detail to the song's story. | Consistent melody but changing lyrics upon repetition. Lower energy than the chorus. |
| **Pre-Chorus** | Transitional passage connecting verse to chorus. | Rhythmic build-up, rising chord progressions, introducing tension. Usually short (2-4 bars). |
| **Chorus** | The emotional and musical climax, containing the main hook. | Highest energy of the cycle, fully layered instrumentation. Lyrics and melody usually repeat exactly. |
| **Post-Chorus** | A secondary hook following the main chorus. | Often instrumental or relies on a chanted vocal hook. Keeps energy high before dropping to the next verse. |
| **Bridge** | Offers musical and lyrical contrast, usually after the second chorus. | Introduces a completely new chord progression, melody, or rhythm not heard previously in the track. |
| **Breakdown** | A sparse section where energy drops significantly. | Sudden removal of heavy percussion or thick instrumentation. Leaves mostly vocals and a single pad/bass. |
| **Build-up** | High-tension section escalating toward a drop. | Fast snare rolls, rising synthesizer pitches (risers), increasing volume, and narrowed EQ filters. |
| **Drop** | The peak dynamic impact, common in electronic genres. | Sudden re-entry of heavy sub-bass and a driving drum groove. |
| **Outro** | The final section bringing the piece to a close. | Fading volume, stripping away of layers, or a final chord resolution. |
| **Solo / Instrumental** | A featured passage lacking lead vocals. | A single instrument (e.g., electric guitar, sax) improvises or plays a primary composed melody. |
| **Interlude** | Standalone section pausing the main narrative flow. | Different texture from verses/choruses; often atmospheric or spoken-word. |
| **Transition** | Very brief passage connecting two main sections. | Usually 1 to 2 bars max. Consists of a drum fill or a single sweeping riser effect. |
| **Vamp** | A repeated one- or two-chord loop with no harmonic movement. | Stagnant harmony utilized for a groove feel. Often used at the end of jazz or soul tracks. |

---

## 3. Vibe & Mood Tags Taxonomy

Use these standardized categories to identify and apply vibe tags consistently.

| Category | Definition & Application | Examples |
| :--- | :--- | :--- |
| **Energy Level** | Describes the physical momentum and drive of the rhythm. | *Driving, Energetic, Laid-back, Frantic, Sluggish, Hypnotic, Bouncing, Aggressive* |
| **Emotional Tone (Positive)** | Applies to major-key, resolved, open, and uplifting harmonies. | *Happy, Triumphant, Nostalgic, Hopeful, Romantic, Euphoric, Warm, Lighthearted* |
| **Emotional Tone (Negative/Dark)** | Applies to minor-key, unresolved, dissonant, or tense harmonies. | *Dark, Anxious, Melancholy, Ominous, Aggressive, Brooding, Somber, Tense* |
| **Atmosphere & Texture** | Describes the "Sound Stage" and processing effects (reverb, delay). | *Spacious, Dry, Cinematic, Ethereal, Gritty, Lo-fi, Washed-out, Intimate, Dreamy* |
| **Setting / Context** | Suggests where this track would optimally be played or heard. | *Club, Late-night drive, Stadium, Coffee shop, Workout, Chill study, Worship* |

---

## 4. Segment Description Sentence Templates & Examples

The narrative descriptions MUST be constructed by selecting and following one of the formulas/templates from the **BP MASTER MUSIC ANNOTATION WRITING STYLE GUIDE** based on the section type or analytical focus. Replace the brackets with actual musical observations.

### 1. INTRO
**Formula:** Primary Instrumentation -> Harmonic Foundation -> Vocal Presence -> Overall Feel -> Development
- **Template 1:** The track opens with `[lead instruments]` establishing the primary musical texture while `[supporting instruments]` gradually reinforce the arrangement. The chord progression remains `[stable/open/evolving]` as vocals are `[absent/subtle/introduced softly]`, creating a `[warm/dark/spacious/intimate]` atmosphere before the arrangement expands.
- **Template 2:** A `[minimal/layered]` instrumental arrangement introduces the song through `[instruments]`, supported by a `[simple/evolving]` chord progression. Vocals `[enter gently/remain absent/provide soft background phrases]`, allowing the section to gradually establish its overall mood.
- **Template 3:** The introduction centers around `[instrumentation]`, allowing the harmonic movement to unfold naturally. If present, the vocals remain `[restrained/atmospheric/lightly layered]`, complementing the arrangement while maintaining a spacious opening feel.
- **Template 4:** The opening develops through `[instruments]` supported by subtle rhythmic and harmonic elements. Vocals appear `[sparingly/in the background/through sustained phrases]`, contributing to the atmosphere without dominating the arrangement.
- **Template 5:** The arrangement establishes its musical identity through `[instrumentation]` and a `[steady/gradually evolving]` harmonic progression. Vocals remain `[minimal/background-focused/absent]`, allowing the instrumental textures to shape the introduction before transitioning forward.

### 2. VERSE
**Formula:** Instrumental Foundation -> Harmonic Progression -> Vocal Presence -> Overall Feel -> Musical Development
- **Template 1:** The arrangement settles into a `[steady/driving/relaxed]` instrumental groove supported by a `[consistent/evolving]` chord progression. Vocals deliver the primary melodic line with `[smooth/expressive/measured]` phrasing while the supporting instruments remain balanced and controlled.
- **Template 2:** A stable combination of `[instruments]` establishes the section's musical foundation beneath a flowing harmonic progression. Vocals remain clear and centered, while the arrangement leaves ample space for the melody to develop naturally.
- **Template 3:** The rhythm and instrumentation maintain a consistent musical flow as the chord progression reinforces the section's stability. Vocals progress with `[restrained/confident/dynamic]` delivery while subtle instrumental accents enrich the arrangement.
- **Template 4:** The verse emphasizes a balanced instrumental texture supported by moderate harmonic movement. Vocals remain present but integrated into the arrangement, allowing both the instrumentation and melodic phrasing to develop together.
- **Template 5:** The instrumental foundation stays consistent through `[supporting instruments]` and a stable harmonic progression. Vocals guide the melodic direction while gradual instrumental additions provide depth without overwhelming the overall balance.

### 3. CHORUS / HOOK
**Formula:** Expanded Instrumentation -> Harmonic Lift -> Vocal Expansion -> Overall Feel -> Musical Climax
- **Template 1:** The arrangement expands as additional instruments reinforce the established groove, creating a noticeably fuller sound. The chord progression broadens harmonically while vocals become `[stronger/more layered/more expressive]`, resulting in a more impactful musical climax.
- **Template 2:** A denser instrumental texture introduces greater musical weight as the harmonic progression reaches a stronger point of resolution. Vocals project with greater confidence, complementing the fuller arrangement and heightened energy.
- **Template 3:** The chorus increases its impact through expanded instrumentation and richer harmonic movement. Vocals become more prominent through `[layering/harmonies/stronger projection]`, reinforcing the section's emotional peak.
- **Template 4:** Supporting instruments become more prominent, creating a richer musical landscape around the groove. The chord progression enhances the emotional lift while vocals deliver the central melodic idea with increased presence.
- **Template 5:** Nearly every instrumental layer contributes to a broader and more powerful arrangement. The harmonic progression reaches greater fullness as vocals become more expressive, completing the section's climactic musical payoff.

### 4. VERSE 2
**Formula:** Returning Instrumentation -> Harmonic Continuity -> Vocal Progression -> Overall Feel -> Musical Development
- **Template 1:** The arrangement returns to its familiar instrumental foundation while introducing subtle additions that enrich the texture. The harmonic progression remains consistent as vocals continue the melody with slightly greater confidence or expression.
- **Template 2:** The established groove reappears through familiar instrumentation and chord movement. Vocals remain central while small instrumental refinements create a richer but balanced arrangement.
- **Template 3:** The section maintains its recognizable harmonic structure as supporting instruments introduce gentle variations. Vocals continue naturally, supported by a slightly fuller musical backdrop than before.
- **Template 4:** The instrumental foundation remains stable while harmonic movement develops gradually. Vocals remain expressive without overpowering the arrangement, allowing the section to progress smoothly.
- **Template 5:** Returning to the established musical framework, the arrangement develops through refined instrumentation and continued harmonic progression. Vocals maintain their melodic role while subtle textural additions sustain musical interest.

### 5. CHORUS 2
**Formula:** Reinforced Instrumentation -> Expanded Harmony -> Vocal Reinforcement -> Maximum Feel -> Climactic Development
- **Template 1:** The chorus returns with stronger instrumental reinforcement and broader harmonic support. Vocals become more layered or expressive, producing a richer and more impactful repetition of the main theme.
- **Template 2:** Additional instrumental layers enrich the established groove while the chord progression feels more expansive. Vocals reinforce the familiar melody through stronger projection or added harmonies.
- **Template 3:** The returning chorus builds upon its earlier arrangement through fuller instrumentation and harmonic development. Vocals remain the melodic centerpiece while integrating naturally with the expanded production.
- **Template 4:** The familiar arrangement becomes more complete through richer instrumentation and harmonic fullness. Vocals maintain strong melodic presence while blending seamlessly with the denser musical texture.
- **Template 5:** The musical landscape reaches its fullest expression through expanded instrumentation, stronger harmonic movement, and more expressive vocals, creating one of the song's most impactful moments.

### 6. BRIDGE / INSTRUMENTAL
**Formula:** Instrumental Contrast -> Harmonic Shift -> Vocal Variation -> Overall Feel -> Transition
- **Template 1:** The arrangement departs from the established structure through contrasting instrumentation and harmonic movement. Vocals either become `[more restrained/more expressive/temporarily absent]`, allowing the change in musical texture to become more apparent.
- **Template 2:** A fresh instrumental idea takes prominence while the chord progression introduces a contrasting harmonic direction. Vocals, if present, adopt a different melodic approach that complements the section's evolving atmosphere.
- **Template 3:** The bridge emphasizes musical exploration through altered instrumentation and changing harmonic relationships. Vocals become `[lighter/more emotional/minimal]`, reinforcing the section's contrast before returning to the main structure.
- **Template 4:** The familiar arrangement gives way to a more spacious or layered presentation. Harmonic movement drives the section while vocals remain understated or temporarily step aside to emphasize the instrumental development.
- **Template 5:** The production reshapes its identity through contrasting instrumentation and evolving chord movement. Vocals either provide subtle support or momentarily disappear, allowing the arrangement to fully explore its new musical direction.

### 7. OUTRO
**Formula:** Harmonic Resolution -> Instrumental Reduction -> Vocal Conclusion -> Overall Feel -> Closure
- **Template 1:** The arrangement gradually simplifies as instrumental layers begin to fall away one by one. The chord progression moves toward resolution while vocals deliver their final phrases or gently fade, creating a calm and satisfying conclusion.
- **Template 2:** Instrumentation steadily decreases in density as the section approaches its ending. Vocals, if present, conclude naturally while the harmonic progression provides a clear sense of musical closure.
- **Template 3:** The outro revisits simpler instrumental textures supported by gentle harmonic resolution. Vocals remain `[soft/minimal/expressive]`, complementing the arrangement without disrupting the section's reflective mood.
- **Template 4:** The remaining instruments carry the final harmonic statement as rhythmic activity gradually fades. Vocals conclude the melody or quietly recede, allowing the arrangement to settle naturally.
- **Template 5:** The musical layers progressively resolve through lighter instrumentation and concluding chord movement. Vocals either finish with sustained phrases, repeated lines, or fade alongside the arrangement, providing complete musical resolution.

### ASPECT-SPECIFIC ANALYTICAL TEMPLATES

#### DESCRIBING ENERGY
**Formula:** Instrumentation -> Harmonic Development -> Vocals -> Rhythm -> Overall Effect
- **Template 1:** The `[instrumentation]` gradually `[expands/simplifies/remains consistent]` while the chord progression becomes `[more resolved/more tense/more active]`. Vocals remain `[subtle/stronger/layered]`, supported by a `[steady/building/relaxed]` rhythmic foundation that causes the overall energy to `[build/settle/remain balanced]`.
- **Template 2:** Additional `[instrumental layers]` increase the arrangement's density as the harmonic movement develops naturally. Vocals, when present, become `[more expressive/more restrained]`, while the rhythm maintains `[consistent/growing]` momentum, resulting in a `[larger/more intimate/more dynamic]` musical feel.

#### DESCRIBING RHYTHM
**Formula:** Instrumentation -> Groove -> Vocals -> Harmonic Support -> Contribution
- **Template 1:** The rhythm is anchored by `[instrumentation]`, creating a `[steady/driving/laid-back]` groove throughout the arrangement. Vocals naturally follow the rhythmic flow while the chord progression provides harmonic stability.
- **Template 2:** A `[consistent/pulsing/syncopated]` groove develops through the interaction of `[instrumentation]`. Vocals integrate smoothly with the rhythmic movement as the harmonic progression reinforces the section's momentum.

#### DESCRIBING VOCALS
**Formula:** Instrumentation -> Harmonic Support -> Vocal Character -> Musical Function
- **Template 1:** The `[instrumentation]` creates a balanced foundation over a `[stable/evolving]` chord progression while the vocals are delivered with a `[soft/powerful/expressive]` tone that blends naturally into the arrangement.
- **Template 2:** Supported by `[instrumentation]` and smooth harmonic movement, the vocals adopt a `[conversational/melodic/rhythmic]` delivery that complements rather than dominates the musical texture.

#### DESCRIBING INSTRUMENTATION
**Formula:** Primary Instruments -> Chord Progression -> Vocals -> Musical Texture -> Contribution
- **Template 1:** `[Instrumentation]` establishes the primary musical texture while the chord progression develops `[steadily/gradually/smoothly]` beneath it. Vocals, when present, blend naturally with the arrangement, resulting in a `[warm/spacious/full]` soundscape.
- **Template 2:** Supporting instruments gradually reinforce the arrangement as the harmonic movement becomes more defined. Vocals remain balanced within the mix, allowing both melodic and instrumental elements to develop together.

#### DESCRIBING UNKNOWN SOUNDS
**Formula:** Observed Texture -> Harmonic Context -> Vocal Relationship -> Musical Function
- **Template 1:** A sound resembling `[description]` blends into the instrumental arrangement while the harmonic progression remains stable. Vocals, if present, continue naturally as the texture adds subtle depth.
- **Template 2:** An unidentified sound introduces additional texture alongside the established instrumentation. The harmonic movement remains consistent while vocals integrate smoothly with the evolving soundscape.

#### THE UNIVERSAL ANNOTATION FLOW
**Formula:** Instrumentation -> Chord Progression -> Vocals -> Rhythm -> Energy -> Purpose
- **Template 1:** The section transitions into a `[fuller/lighter/more focused]` arrangement as `[instrumentation]` expands or simplifies around a `[stable/evolving/resolved]` chord progression. Vocals become `[more expressive/more restrained/remain consistent]` while the rhythm grows `[stronger/more relaxed/more active]`, resulting in a `[building/climactic/transitional/resolving]` musical moment.
- **Template 2:** Compared to the previous section, the instrumentation introduces `[additional/reduced]` layers while the harmonic movement shifts to `[increase/release/maintain]` tension. Vocals adapt naturally to the evolving arrangement as the groove reinforces the section's changing energy.

### Melody Field Analysis

**Melody:** [A short 3–7 word phrase naming the tagged instrument or voice and its audible gesture, e.g. electric guitar syncopated stabs. Avoid full sentences and repeating the narrative. Leave blank without melodic evidence.]

Melody wording must be composed from the audible evidence for each segment. If the evidence is insufficient, leave the field blank. No preset phrase list applies.

### Google Search context

Use the research panel to inspect song context and its sources. Lyrical themes, release context and other supported global information may draw on search results with citations. Check the song and recording version. Search cannot establish which instruments, melody, production effects or timing are audible in the uploaded segment. An uncertain match or unavailable search must stay explicit.
