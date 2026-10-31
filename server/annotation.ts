/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../src/constants.js";
import { KNOWLEDGE_BASE } from "../src/knowledgeBase.js";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export type AudioInput = { data: string; type: string };

export interface AnnotationResult {
  text: string;
}

export function getStyleInstruction(activeProfile: string, annotationProfile: string = "default"): string {
  let instruction = "";
  if (activeProfile === "COCO" || activeProfile === "PRODUCER") {
    instruction = `\n\nSTYLE DIRECTIVE - PRODUCER PROFILE (MUSICIAN & PRODUCER FLOW):
- You MUST write in a direct, objective, musician-oriented style focused on groove, arrangement density, and structural development.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Pulse -> Texture -> Ensemble Development -> Transition
  * Verse: Groove -> Ensemble Interaction -> Support -> Continuity
  * Chorus / Hook: Expansion -> Reinforced Groove -> Fuller Ensemble -> Peak Momentum
  * Verse 2 (The Return): Established Groove -> Subtle Development -> Ensemble Reinforcement -> Forward Motion
  * Chorus 2: Return of Groove -> Expanded Texture -> Stronger Cohesion -> Peak Momentum
  * Bridge / Instrumental: Contrast -> Groove Shift -> New Musical Perspective -> Preparation
  * Outro: Resolution -> Gradual Reduction -> Final Statement -> Closure
  * Any other Section Type: Use the Universal Master Formula: Transition -> Musical Foundation -> Development -> Musical Function
- Describe what you actually hear with professional musicianship. Focus on physical instruments, their interplay, and arrangement shifts. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "MAJ" || activeProfile === "VOCAL") {
    instruction = `\n\nSTYLE DIRECTIVE - VOCAL PROFILE (CHOIR DIRECTOR & VOCAL FOCUS):
- You MUST write in a polished vocal-harmony oriented style focusing on vocal entry, delivery tone, vocal techniques, and ensemble support.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Opening Character -> Vocal Presence -> Rhythmic Motion -> Ensemble Support -> Musical Direction
  * Verse: Vocal Leadership -> Rhythmic Continuity -> Ensemble Support -> Textural Development -> Musical Progression
  * Chorus / Hook: Vocal Expansion -> Rhythmic Lift -> Ensemble Growth -> Textural Fullness -> Musical Arrival
  * Verse 2: Vocal Continuity -> Rhythmic Refinement -> Ensemble Development -> Textural Enrichment -> Forward Motion
  * Chorus 2: Vocal Reinforcement -> Rhythmic Drive -> Ensemble Expansion -> Fuller Texture -> Climactic Development
  * Bridge / Instrumental: Musical Contrast -> Vocal Transformation -> Rhythmic Shift -> Ensemble Rebalancing -> Preparation for Return
  * Outro: Vocal Resolution -> Rhythmic Release -> Ensemble Reduction -> Textural Closure -> Lasting Impression
  * Any other Section Type: Use the Universal Master Formula: Ensemble Change -> Vocal Response -> Rhythmic Development -> Textural Shift -> Musical Purpose
- Focus first on vocal delivery and backing vocals/choir before describing other elements. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "LUCID" || activeProfile === "R&B") {
    instruction = `\n\nSTYLE DIRECTIVE - R&B PROFILE (ACOUSTIC & RHYTHMIC R&B):
- You MUST write in a warm, relaxed, syncopated R&B and rhythmic perspective focusing on rhythmic foundation, instrumental support, and vocal delivery.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Rhythmic Foundation -> Vocal Presence -> Instrumental Support -> Energy Level -> Transition
  * Verse: Rhythmic Groove -> Vocal Delivery -> Instrumental Balance -> Dynamic Control -> Development
  * Chorus / Hook: Rhythmic Expansion -> Vocal Intensification -> Layering -> Energy Lift -> Peak
  * Verse 2: Returning Groove -> Vocal Progression -> Rhythmic Variation -> Layer Development -> Continuity
  * Chorus 2: Enhanced Groove -> Vocal Reinforcement -> Fuller Layering -> Increased Momentum -> Climactic Return
  * Bridge / Instrumental: Rhythmic Contrast -> Vocal Change -> Textural Shift -> Dynamic Reset -> Transition
  * Outro: Rhythmic Reduction -> Vocal Resolution -> Layer Removal -> Energy Decline -> Closure
  * Any other Section Type: Use the Universal Master Formula: Rhythm -> Vocals -> Instrumentation -> Texture -> Energy -> Function
- Emphasize the pocket, syncopation, acoustic textures, and intimate vibe. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "SOLOIST") {
    instruction = `\n\nSTYLE DIRECTIVE - SOLOIST PROFILE (INSTRUMENTAL & MELODIC FOCUS):
- You MUST write in a professional, precise musicology style focusing on primary instrument leads, harmonic lift, chord progression, and melodic counterpoint.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Primary Instrumentation -> Harmonic Foundation -> Vocal Presence -> Overall Feel -> Development
  * Verse: Instrumental Foundation -> Harmonic Progression -> Vocal Presence -> Overall Feel -> Musical Development
  * Chorus / Hook: Expanded Instrumentation -> Harmonic Lift -> Vocal Expansion -> Overall Feel -> Musical Climax
  * Verse 2: Returning Instrumentation -> Harmonic Continuity -> Vocal Progression -> Overall Feel -> Musical Development
  * Chorus 2: Reinforced Instrumentation -> Expanded Harmony -> Vocal Reinforcement -> Maximum Feel -> Climactic Development
  * Bridge / Instrumental: Instrumental Contrast -> Harmonic Shift -> Vocal Variation -> Overall Feel -> Transition
  * Outro: Harmonic Resolution -> Instrumental Reduction -> Vocal Conclusion -> Overall Feel -> Closure
  * Any other Section Type: Use the Universal Master Formula: Instrumentation -> Chord Progression -> Vocals -> Rhythm -> Energy -> Purpose
- Track solo features, key/chord adjustments, and melodic lead movements carefully. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "ACOUSTIC") {
    instruction = `\n\nSTYLE DIRECTIVE - ACOUSTIC PROFILE (ATMOSPHERE & SOP V2):
- You MUST write in an atmospheric, organic, texture-focused style focusing on acoustic tone, space, reverb environments, and dynamic transition.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Opening element -> Supporting texture -> Atmosphere -> Transition
  * Verse: Groove -> Lead focus -> Supporting instruments -> Progression
  * Chorus / Hook: Energy increase -> Fuller arrangement -> Main hook -> Emotional payoff
  * Verse 2: Return -> Familiar groove -> New layers -> Continued progression
  * Chorus 2: Hook returns -> Additional layers -> Peak energy -> Reinforcement
  * Bridge / Instrumental: Contrast -> New texture -> Musical exploration -> Transition
  * Outro: Resolution -> Layer removal -> Final statement -> Ending
  * Any other Section Type: Use the Universal Master Formula: State the transition -> Describe the main elements -> Describe the energy -> Explain the purpose
- Describe spatial dimensions, environmental pads, and structural dynamics. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "TEXTURE") {
    instruction = `\n\nSTYLE DIRECTIVE - TEXTURE PROFILE (TEXTURAL & LAYER ARRANGEMENT):
- You MUST write in a rich, descriptive style focusing on textural layers, dense instrumentation, orchestration, and performance chemistry.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Opening Texture -> Vocal Presence -> Rhythmic Foundation -> Instrumental Development -> Overall Effect
  * Verse: Returning Groove -> Vocal Delivery -> Instrumental Support -> Texture Development -> Overall Progression
  * Chorus / Hook: Expanded Groove -> Vocal Lift -> Instrumental Growth -> Increased Texture -> Musical Peak
  * Verse 2: Established Groove -> Vocal Progression -> Instrumental Refinement -> Textural Growth -> Forward Movement
  * Chorus 2: Reinforced Groove -> Enhanced Vocals -> Fuller Instrumentation -> Maximum Texture -> Climactic Return
  * Bridge / Instrumental: Rhythmic Contrast -> Vocal Variation -> Instrumental Shift -> Textural Change -> Transition
  * Outro: Rhythmic Resolution -> Vocal Conclusion -> Instrumental Reduction -> Textural Release -> Musical Closure
  * Any other Section Type: Use the Universal Master Formula: Texture Entry -> Arrangement density -> Instrumental interaction -> Structural outcome
- Focus on musical density and timbral qualities. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "RHYTHM") {
    instruction = `\n\nSTYLE DIRECTIVE - RHYTHM PROFILE (RHYTHM & STRUCTURAL PULSE):
- You MUST write in a pulse-driven style focusing on rhythms, timing cues, drum patterns, syncopation, and tempo stability.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Rhythmic Foundation -> Vocal Presence -> Instrumentation -> Transition
  * Verse: Established Groove -> Vocal Delivery -> Instrumentation -> Musical Development
  * Chorus / Hook: Rhythmic Expansion -> Stronger Vocals -> Fuller Instrumentation -> Main Hook
  * Verse 2: Returning Groove -> Vocal Progression -> Instrumentation -> Continued Development
  * Chorus 2: Returning Hook -> Enhanced Rhythm -> Fuller Instrumentation -> Maximum Impact
  * Bridge / Instrumental: Rhythmic Contrast -> Vocal Shift -> Instrumentation Spotlight -> Transition
  * Outro: Rhythmic Resolution -> Vocal Conclusion -> Instrumental Reduction -> Final Closure
  * Any other Section Type: Use the Universal Master Formula: Rhythm change -> Percussive pattern -> Melodic rhythm -> Timing cue
- Trace sub-beats, snare hits, and rhythm drops carefully. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "EXPERT") {
    instruction = `\n\nSTYLE DIRECTIVE - EXPERT PROFILE (DEEP MUSICOLOGY & MASTER SOP):
- You MUST write in an authoritative, highly detailed musicological style focusing on arrangement changes, structural transitions, and dynamic flow.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Opening Element -> Supporting Texture -> Atmosphere -> Development -> Transition
  * Verse: Established Groove -> Lead Performance -> Harmonic Support -> Texture -> Progression
  * Chorus / Hook: Expanded Arrangement -> Stronger Vocal Delivery -> Main Hook -> Fuller Texture -> Climactic Transition
  * Verse 2: Return to Groove -> Familiar Arrangement -> New Musical Details -> Continued Development -> Transition
  * Chorus 2: Returning Hook -> Enhanced Instrumentation -> Additional Layers -> Peak Intensity -> Forward Momentum
  * Bridge / Instrumental: Contrast -> New Musical Idea -> Instrumental or Harmonic Development -> Textural Change -> Transition
  * Outro: Resolution -> Gradual Reduction -> Final Musical Statement -> Closure -> Ending
  * Any other Section Type: Use the Universal Master Formula: Change analysis -> Elemental details -> Dynamic progression -> Structural purpose
- Focus on detailed structural transitions and dynamic development. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "AMBIENT") {
    instruction = `\n\nSTYLE DIRECTIVE - AMBIENT PROFILE (ATMOSPHERIC & REVERB FLOW):
- You MUST write in an immersive, ambient-focused style focusing on environmental depth, pads, spatial effects, and reverb tails.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Opening element -> Supporting texture -> Atmosphere -> Transition
  * Verse: Atmospheric Groove -> Vocal Presence -> Instrumental Balance -> Spatial Development
  * Chorus / Hook: Atmospheric Expansion -> Vocal Lift -> Full Soundstage -> Dynamic Peak
  * Verse 2: Returning Texture -> Vocal Progression -> Ambient Details -> Ongoing Development
  * Chorus 2: Reinforced Atmosphere -> Vocal Reinforcement -> Maximum Depth -> Climactic Resolution
  * Bridge / Instrumental: Atmospheric Contrast -> Soundstage Shift -> Textural Divergence -> Transition
  * Outro: Resolution -> Gradual Fade -> Ambient Trails -> Ultimate Silence
  * Any other Section Type: Use the Universal Master Formula: Soundstage -> Element space -> Environmental detail -> Spatial result
- Emphasize room size, reverb decay, delays, and ambient soundscapes. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else if (activeProfile === "DYNAMICS") {
    instruction = `\n\nSTYLE DIRECTIVE - DYNAMICS PROFILE (DYNAMIC INTENSITY & ENERGY SHIFT):
- You MUST write in a dynamics-driven style focusing on intensity levels, volume shifts, crescendos, and energy changes.
- For EACH timeline segment, you MUST structure your Narrative Description strictly based on the following formulas according to its Section Type:
  * Intro: Opening Character -> Vocal Presence -> Rhythmic Motion -> Ensemble Support -> Direction
  * Verse: Rhythmic Groove -> Vocal Delivery -> Instrumental Balance -> Dynamic Control -> Development
  * Chorus / Hook: Energy Increase -> Fuller Arrangement -> Main Hook -> Emotional Payoff
  * Verse 2: Established Groove -> Vocal Progression -> Rhythmic Variation -> Layer Development -> Continuity
  * Chorus 2: Enhanced Groove -> Vocal Reinforcement -> Fuller Layering -> Increased Momentum -> Climactic Return
  * Bridge / Instrumental: Dynamic Contrast -> Vocal Transformation -> Rhythmic Shift -> Ensemble Rebalancing -> Return
  * Outro: Resolution -> Layer Removal -> Final Statement -> Ending
  * Any other Section Type: Use the Universal Master Formula: Energy change -> Volume shift -> Instrumental response -> Dynamic outcome
- Trace volume curves, accents, and tension releases. Banned AI-slop words: 'testament', 'tapestry', 'captivating', 'seamless', 'intricate', 'elevating', 'resonance'.`;
  } else {
    instruction = `\n\nSTYLE DIRECTIVE - STANDARD BRIEF & DIRECT PROFILE:
- You MUST provide ultra-simple, ultra-factual single-sentence narrative statements and brief matrix fields. No flowery language or complex clauses. Every narrative description in the segments and global matrix text fields must be exactly one short sentence.`;
  }

  if (annotationProfile === "brief") {
    instruction += `\n\nCRITICAL BRIEF & CONCISE MODE OVERRIDE (MANDATORY):
- You MUST write in a completely natural, plain, objective, and human-like tone.
- STRICTLY AVOID THESE AI-LIKE HABITS:
  * Do NOT repeat "The section," "The track," or "The arrangement" at the start of every entry. Vary your sentence starters.
  * Do NOT use the same sentence pattern across multiple rows or entries.
  * Do NOT use excessive adjectives or vague descriptions (e.g., beautiful, powerful, emotional, captivating).
  * Do NOT use generic, overused AI phrases such as: "sonic landscape", "rich tapestry", "takes center stage", "adds depth and dimension", "creates an immersive experience", "seamlessly transitions", "elevates the track", "dynamic interplay", "captivating atmosphere", "serves as a bridge", "testament", "intricate", "elevating", "resonance", "vibrant", "dynamic journey", "audio tapestry".
  * Do NOT claim that a section is powerful, emotional, or engaging without explaining which audible feature creates that impression.
  * Do NOT invent instruments, techniques, lyrics, chord changes, or production details.
  * Do NOT restate the section label instead of describing what happens (e.g., do not write "The chorus starts").
- Limit ALL narrative descriptions for timeline segments and global analytical text fields to extremely short, simple structures. Use direct, active, plain, human-like statements of what happens in the music.
- GOOD EXAMPLE OF THE BRIEF EXPECTED OUTPUT STYLE:
  * Segment: 1:04 | Chorus
  * Description: "Vocals become louder. Drums are fuller. Backing vocals enter."`;
  }

  return instruction;
}

export async function annotateAudio(
  audioFile: AudioInput, 
  isSimplified: boolean = false,
  isHighAccuracy: boolean = false,
  creativeGuidance: string = "",
  audioDuration: number = 0,
  activeProfile: string = "PRODUCER",
  annotationProfile: string = "default"
): Promise<string> {
  const base64Data = audioFile.data;
  const mimeType = audioFile.type;

  const durationStr = audioDuration ? `${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, "0")}` : "";

  const styleInstruction = getStyleInstruction(activeProfile, annotationProfile);

  const response = await getAI().models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: `Please annotate this audio track according to the provided rules. 
            ${durationStr ? `CRITICAL DIRECTIVE: The total duration of this audio file is exactly ${durationStr} (${Math.floor(audioDuration)} seconds). You MUST NOT create any segments with a start time that exceeds ${durationStr}.` : ""}
            ${isSimplified ? "MODE: SIMPLIFIED TONE." : ""}
            ${isHighAccuracy ? "MODE: HIGH ACCURACY SEGMENTATION (Provide granular micro-analysis of shifts. Ensure the highest possible accuracy for segment start and end timestamps, particularly for short, rapidly changing musical sections.)." : ""}
            ${creativeGuidance ? `\nCRITICAL DIRECTIVE: The user has provided an Accurate Analysis Request. You MUST follow the information in this request below accurately and strictly shape the annotation according to it:\n${creativeGuidance}` : ""}` 
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT + 
        "\n\n" + KNOWLEDGE_BASE +
        styleInstruction +
        "\n\nCRITICAL QUALITY MANDATES:" +
        "\n1. HIGH-DETAIL INSTRUMENTS: For every instrument, describe exactly HOW it is played and WHAT melodically or rhythmically it is playing. No weak/generic descriptions." +
        "\n2. SPECIFIC VOCALS: Describe vocal pitch, timbre, delivery style, and phrasing in high detail. Do NOT use generic vocal statements." +
        "\n3. PERFECT 1:1 CORRESPONDENCE: You MUST explicitly mention and describe every single instrument in the Narrative Description that you list in the 'Instruments:' field, and vice versa. Perfect 1:1 match required." +
        "\n4. NO INSTRUMENT GROUPING: Do NOT group instruments (e.g., 'rhythm section', 'synthesizers', 'ensemble'). Describe each instrument individually." +
        "\n5. ZERO CROSS-REFERENCING: Every segment description MUST be 100% standalone and independent. Never mention or compare to other sections or repeating elements." +
        "\n6. ROBUST GLOBAL ANALYSIS: The Global Analysis must contain deep, comprehensive, and highly professional observations with no generic placeholder text." +
        "\n\nCRITICAL: Ensure each analytical text field under the Global Analysis (Global Musical Matrix) is exactly 2 sentences by default." +
        "\n\nCRITICAL RESTRICTION ON TIMELINE SEGMENTS: Every segment's narrative description MUST be completely standalone, self-contained, and independent. You are strictly forbidden from making references, comparisons, or contrasts to other segments, previous sections, or future passages of the track (e.g. NEVER write 'Compared to the previous section', 'Unlike the intro', 'Continuing from', or 'As heard in'). Focus only on the music that occurs purely within the boundaries of that segment." +
        "\n\nCRITICAL MELODY REQUIREMENT: For the 'Melody:' field of each timeline segment, you MUST select exactly ONE of the standard phrases from the predefined list, or leave it completely empty/blank/None if there is no melody or if you are unsure. You are STRICTLY FORBIDDEN from outputting generic, non-specific placeholders such as 'melody line' or 'melody' alone. It must be a specific, accurate melody phrase or blank/None." +
        (isSimplified ? "\n\nMODE: SIMPLIFIED TONE. Limit Global Analysis fields to exactly 1 sentence." : "") +
        (isHighAccuracy ? "\n\nMODE: HIGH ACCURACY SEGMENTATION (Hyper-granular, extremely precise start/end timestamps down to the exact second for rapidly changing sections.)" : ""),
      temperature: 0.7,
      tools: [{ googleSearch: {} }],
    },
  });

  if (!response.text?.trim()) throw new Error("Empty annotation response");
  return response.text;
}

export async function refineAnnotation(
  audioFile: AudioInput, 
  previousResult: string, 
  feedback: string,
  isSimplified: boolean = false,
  isHighAccuracy: boolean = false,
  creativeGuidance: string = "",
  audioDuration: number = 0,
  activeProfile: string = "PRODUCER",
  annotationProfile: string = "default"
): Promise<string> {
  const base64Data = audioFile.data;
  const mimeType = audioFile.type;

  const durationStr = audioDuration ? `${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, "0")}` : "";

  const styleInstruction = getStyleInstruction(activeProfile, annotationProfile);

  const response = await getAI().models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: `Here is the previous analysis: \n\n${previousResult}\n\nCorrection Input Matrix:\n${feedback}\n\nPlease regenerate the annotation, correcting the inaccuracies mentioned in the Correction Input Matrix while maintaining the overall professional tone and format. Always consult the KNOWLEDGE BASE in information you are unsure of.
            ${durationStr ? `CRITICAL DIRECTIVE: The total duration of this audio file is exactly ${durationStr} (${Math.floor(audioDuration)} seconds). You MUST NOT create any segments with a start time that exceeds ${durationStr}.` : ""}
            ${isSimplified ? "MODE: SIMPLIFIED TONE." : ""}
            ${isHighAccuracy ? "MODE: HIGH ACCURACY SEGMENTATION (Ensure the highest possible accuracy for segment start and end timestamps, especially for short, rapidly changing musical sections)." : ""}
            ${creativeGuidance ? `\nCRITICAL DIRECTIVE: The user has provided an Accurate Analysis Request. You MUST follow the information in this request below accurately and strictly shape the annotation according to it:\n${creativeGuidance}` : ""}` 
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT + 
        "\n\n" + KNOWLEDGE_BASE +
        styleInstruction +
        "\n\nCRITICAL QUALITY MANDATES:" +
        "\n1. HIGH-DETAIL INSTRUMENTS: For every instrument, describe exactly HOW it is played and WHAT melodically or rhythmically it is playing. No weak/generic descriptions." +
        "\n2. SPECIFIC VOCALS: Describe vocal pitch, timbre, delivery style, and phrasing in high detail. Do NOT use generic vocal statements." +
        "\n3. PERFECT 1:1 CORRESPONDENCE: You MUST explicitly mention and describe every single instrument in the Narrative Description that you list in the 'Instruments:' field, and vice versa. Perfect 1:1 match required." +
        "\n4. NO INSTRUMENT GROUPING: Do NOT group instruments (e.g., 'rhythm section', 'synthesizers', 'ensemble'). Describe each instrument individually." +
        "\n5. ZERO CROSS-REFERENCING: Every segment description MUST be 100% standalone and independent. Never mention or compare to other sections or repeating elements." +
        "\n6. ROBUST GLOBAL ANALYSIS: The Global Analysis must contain deep, comprehensive, and highly professional observations with no generic placeholder text." +
        "\n\nCRITICAL: Adjust the analysis based on the User Feedback provided. If specific segment times or instruments were mentioned as wrong, prioritize those corrections." + 
        "\n\nCRITICAL: Ensure each analytical text field under the Global Analysis (Global Musical Matrix) is exactly 2 sentences by default." +
        "\n\nCRITICAL RESTRICTION ON TIMELINE SEGMENTS: Every segment's narrative description MUST be completely standalone, self-contained, and independent. You are strictly forbidden from making references, comparisons, or contrasts to other segments, previous sections, or future passages of the track (e.g. NEVER write 'Compared to the previous section', 'Unlike the intro', 'Continuing from', or 'As heard in'). Focus only on the music that occurs purely within the boundaries of that segment." +
        "\n\nCRITICAL MELODY REQUIREMENT: For the 'Melody:' field of each timeline segment, you MUST select exactly ONE of the standard phrases from the predefined list, or leave it completely empty/blank/None if there is no melody or if you are unsure. You are STRICTLY FORBIDDEN from outputting generic, non-specific placeholders such as 'melody line' or 'melody' alone. It must be a specific, accurate melody phrase or blank/None." +
        (isSimplified ? "\n\nMODE: SIMPLIFIED TONE. Limit Global Analysis fields to exactly 1 sentence." : "") +
        (isHighAccuracy ? "\n\nMODE: HIGH ACCURACY SEGMENTATION (Hyper-granular, extremely precise start/end timestamps down to the exact second for rapidly changing sections.)" : ""),
      temperature: 0.4, // Slightly lower temperature for refinement
      tools: [{ googleSearch: {} }],
    },
  });

  if (!response.text?.trim()) throw new Error("Empty refinement response");
  return response.text;
}

