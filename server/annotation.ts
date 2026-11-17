import { INPUT_LANGUAGE_RULES } from '../shared/inputLanguage.js';
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

function annotationInstruction(simplified: boolean, highAccuracy: boolean) {
  const tone = simplified ? "\nUse plain musical terms and clear phrasing while preserving supported detail and sentence variety." : "";
  const timing = highAccuracy ? "\nListen closely around audible structural boundaries and place start times as precisely as the evidence allows. Keep incidental changes within the row." : "";
  return SYSTEM_PROMPT + "\n\n" + KNOWLEDGE_BASE + tone + timing + "\n" + INPUT_LANGUAGE_RULES;
}

export async function annotateAudio(
  audioFile: AudioInput,
  isSimplified: boolean = false,
  isHighAccuracy: boolean = false,
  creativeGuidance: string = "",
  audioDuration: number = 0,
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
      systemInstruction: annotationInstruction(isSimplified, isHighAccuracy),
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
      systemInstruction: annotationInstruction(isSimplified, isHighAccuracy),
    },
  }, audioDuration);

  if (!response.text?.trim()) throw new Error("Empty refinement response");
  return response.text;
}

