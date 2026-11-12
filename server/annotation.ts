import { splitResearch } from '../shared/research.js';
import { DEFAULT_MODEL, type ModelId } from '../shared/models.js';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateMusicAnnotation } from "./musicPipeline.js";
import { SYSTEM_PROMPT } from "../src/constants.js";
import { KNOWLEDGE_BASE } from "../src/knowledgeBase.js";


export type AudioInput = { data: string; type: string };

export interface AnnotationResult {
  text: string;
}

const profileFocus: Record<string, string> = {
  PRODUCER: "Groove, arrangement density, interaction between parts, and structural development.",
  VOCAL: "Vocal entries, phrasing, tone, harmonies, and the instruments supporting them.",
  "R&B": "Pocket, syncopation, instrumental support, and vocal delivery.",
  SOLOIST: "Lead parts, melodic movement, harmonic shifts, and counterpoint.",
  ACOUSTIC: "Acoustic tone, articulation, space, and changes in dynamics.",
  TEXTURE: "Layering, arrangement density, timbre, and interaction between parts.",
  RHYTHM: "Pulse, subdivisions, accents, syncopation, and tempo stability.",
  EXPERT: "Precise musical detail, structural boundaries, and development within each section.",
  AMBIENT: "Spatial placement, pads, sustained textures, and audible effects.",
  DYNAMICS: "Intensity, volume, accents, entrances, and dropouts.",
};

const profileAliases: Record<string, string> = { COCO: "PRODUCER", MAJ: "VOCAL", LUCID: "R&B" };

export function getStyleInstruction(activeProfile: string, annotationProfile = "default"): string {
  const focus = profileFocus[profileAliases[activeProfile] ?? activeProfile];
  const emphasis = focus ? ` Use this emphasis where audible: ${focus}` : "";
  const brief = annotationProfile === "brief" ? " Prefer short, plain sentences while covering every tagged part." : "";
  return `\n\nSTYLE: Write directly and objectively.${emphasis}${brief}`;
}

function annotationInstruction(activeProfile: string, annotationProfile: string, simplified: boolean, highAccuracy: boolean) {
  const tone = simplified ? "\nUse plain musical terms and short sentences while preserving supported detail." : "";
  const timing = highAccuracy ? "\nListen closely around audible structural boundaries and place start times as precisely as the evidence allows. Keep incidental changes within the row." : "";
  return SYSTEM_PROMPT + "\n\n" + KNOWLEDGE_BASE + getStyleInstruction(activeProfile, annotationProfile) + tone + timing;
}

export async function annotateAudio(
  audioFile: AudioInput,
  isSimplified: boolean = false,
  isHighAccuracy: boolean = false,
  creativeGuidance: string = "",
  audioDuration: number = 0,
  activeProfile: string = "PRODUCER",
  annotationProfile: string = "default",
  model: ModelId = DEFAULT_MODEL,
  songHint: string = ""
): Promise<string> {
  const base64Data = audioFile.data;
  const mimeType = audioFile.type;

  const durationStr = audioDuration ? `${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, "0")}` : "";

  const response = await generateMusicAnnotation({
    model,
    contents: [
      {
        parts: [
          { text: `Please annotate this audio track according to the provided rules.
            Song filename clue for search (unverified): ${JSON.stringify(songHint)}
            ${durationStr ? `CRITICAL DIRECTIVE: The total duration of this audio file is exactly ${durationStr} (${Math.floor(audioDuration)} seconds). You MUST NOT create any segments with a start time that exceeds ${durationStr}.` : ""}
            ${isSimplified ? "MODE: SIMPLIFIED TONE." : ""}
            ${isHighAccuracy ? "MODE: HIGH ACCURACY SEGMENTATION (Check the timing of audible structural transitions carefully.)." : ""}
            ${creativeGuidance ? `\nUser guidance (verify proposed timestamps and musical claims against the audio):\n${creativeGuidance}` : ""}`
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
      systemInstruction: annotationInstruction(activeProfile, annotationProfile, isSimplified, isHighAccuracy),
    },
  }, audioDuration);

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
  annotationProfile: string = "default",
  model: ModelId = DEFAULT_MODEL,
  songHint: string = ""
): Promise<string> {
  const base64Data = audioFile.data;
  const mimeType = audioFile.type;

  const durationStr = audioDuration ? `${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, "0")}` : "";

  const response = await generateMusicAnnotation({
    model,
    contents: [
      {
        parts: [
          { text: `Song filename clue for search (unverified): ${JSON.stringify(songHint)}\nAnalysis guidance (unverified): ${creativeGuidance}\nCorrection Input Matrix:\n${feedback}\n\nHere is the previous analysis: \n\n${splitResearch(previousResult).annotation}\n\nRevise the annotation using the correction input as a guide. Check factual corrections against the audio and preserve the existing output format.
            ${durationStr ? `CRITICAL DIRECTIVE: The total duration of this audio file is exactly ${durationStr} (${Math.floor(audioDuration)} seconds). You MUST NOT create any segments with a start time that exceeds ${durationStr}.` : ""}
            ${isSimplified ? "MODE: SIMPLIFIED TONE." : ""}
            ${isHighAccuracy ? "MODE: HIGH ACCURACY SEGMENTATION (Check the timing of audible structural transitions carefully)." : ""}
            ${creativeGuidance ? `\nUser guidance (verify proposed timestamps and musical claims against the audio):\n${creativeGuidance}` : ""}`
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
      systemInstruction: annotationInstruction(activeProfile, annotationProfile, isSimplified, isHighAccuracy),
    },
  }, audioDuration);

  if (!response.text?.trim()) throw new Error("Empty refinement response");
  return response.text;
}

