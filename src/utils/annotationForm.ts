import { attachResearch, splitResearch, type ResearchReport } from "../../shared/research";

export interface AnnotationSection {
  startTime: string;
  type: string;
  description: string;
  instruments: string;
  vibe: string;
  melody: string;
  isUnsure: boolean;
}

export interface GlobalMetadata {
  genreEraSceneTags?: string;
  genreEraScene?: string;
  tempoRhythmGrooveTags?: string;
  tempoRhythmGroove?: string;
  harmonyChordsKeyTags?: string;
  harmonyChordsKey?: string;
  instrumentationTags?: string;
  instrumentation?: string;
  playingStyleTags?: string;
  playingStyle?: string;
  wowFactorTags?: string;
  wowFactor?: string;
  emotionVibeSettingTags?: string;
  emotionVibeSetting?: string;
  mixTags?: string;
  mix?: string;
  fidelityTags?: string;
  fidelity?: string;
  vocalTags?: string;
  vocal?: string;
  lyricsTags?: string;
  lyrics?: string;
  songTitle?: string;
  songBy?: string;
  performingArtists?: string;
  lyricsAndStructure?: string;
}

const globalFields = [
  ["genreEraSceneTags", "Genre, Era & Scene Tags"],
  ["genreEraScene", "Genre, Era & Scene"],
  ["tempoRhythmGrooveTags", "Tempo, Rhythm & Groove Tags"],
  ["tempoRhythmGroove", "Tempo, Rhythm & Groove"],
  ["harmonyChordsKeyTags", "Harmony, Chords & Key Tags"],
  ["harmonyChordsKey", "Harmony, Chords & Key"],
  ["instrumentationTags", "Instrumentation Tags"],
  ["instrumentation", "Instrumentation"],
  ["playingStyleTags", "Playing Style Tags"],
  ["playingStyle", "Playing Style"],
  ["wowFactorTags", "Wow Factor Tags"],
  ["wowFactor", "Wow Factor"],
  ["emotionVibeSettingTags", "Emotion, Vibe & Setting Tags"],
  ["emotionVibeSetting", "Emotion, Vibe & Setting"],
  ["mixTags", "Mix & Production Tags"],
  ["mix", "Mix & Production"],
  ["fidelityTags", "Sonic Fidelity Tags"],
  ["fidelity", "Sonic Fidelity"],
  ["vocalTags", "Vocal Expression Tags"],
  ["vocal", "Vocal Expression"],
  ["lyricsTags", "Lyrical Evocation Tags"],
  ["lyrics", "Lyrical Evocation"],
  ["songTitle", "Song title"],
  ["songBy", "Song by"],
  ["performingArtists", "Performing Artists"],
  ["lyricsAndStructure", "Lyrics & Song Structure"],
] as const;

const globalLabels = globalFields.map(([, label]) => label);
const sectionFields = ["Section Type", "Narrative Description", "Instruments", "Vibe Tags", "Melody", "Tempo", "Key", "Description", "Vibe"];

function readFields(text: string, labels: readonly string[], allowHeadings: readonly string[] = []) {
  const fields = new Map<string, string>();
  let label: string | undefined;
  let lines: string[] = [];
  const save = () => {
    if (label && !fields.has(label)) fields.set(label, lines.join("\n").replace(/(?:\n|^)---[ \t]*\s*$/, "").trim());
  };
  for (const line of text.split(/\r?\n/)) {
    const header = line.trimStart().replace(/^(?:[-*]\s+|\d+\.\s*|#{1,6}\s+)/, "");
    const match = /^(?:\*\*)?([^:*]+?)(?:\*\*)?:(?:\*\*)?[ \t]*(.*)$/.exec(header);
    const next = labels.find(candidate =>
      match?.[1].trim().toLowerCase() === candidate.toLowerCase()
      || (allowHeadings.includes(candidate) && header.trim().replace(/^\*\*|\*\*$/g, "").toLowerCase() === candidate.toLowerCase())
    );
    if (next) {
      save();
      label = next;
      lines = [match?.[2] ?? ""];
    } else if (label) {
      lines.push(line);
    }
  }
  save();
  return fields;
}

export function isSectionUnsure(instruments: string, description: string) {
  return instruments.includes("?") || /likely|possibly|maybe|unsure|uncertain/i.test(instruments + " " + description);
}

export function parseAnnotation(source: string) {
  const { annotation } = splitResearch(source);
  const boundary = /^\s*(?:#{1,6}[ \t]+)?(?:\*\*)?(?:Global Musical Matrix|Global Analysis|1\.[ \t]*Genre, Era & Scene Tags)/im;
  const globalStart = annotation.search(boundary);
  const timeline = globalStart < 0 ? annotation : annotation.slice(0, globalStart);
  const blocks = timeline.split(/^[ \t]*(?:-[ \t]*)?(?:\*\*)?Start Time(?::(?:\*\*)?|\*\*:)?[ \t]*/im).slice(1);
  const sections: AnnotationSection[] = blocks.map(block => {
    const fields = readFields(block, sectionFields);
    const instruments = fields.get("Instruments") ?? "";
    const description = fields.get("Narrative Description") || fields.get("Description") || "";
    const melody = fields.get("Melody") ?? "";
    return {
      startTime: /^[ \t]*\[?(\d+:\d{2})\]?/.exec(block)?.[1] ?? "0:00",
      type: fields.get("Section Type") || "Unknown",
      description,
      instruments,
      vibe: fields.get("Vibe Tags") || fields.get("Vibe") || "",
      melody: /^(?:none|n\/a|absent|not applicable|no melody|no prominent melody|no melody specified|none specified)\.?$/i.test(melody) ? "" : melody,
      isUnsure: isSectionUnsure(instruments, description),
    };
  });
  const fields = readFields(globalStart < 0 ? annotation : annotation.slice(globalStart), globalLabels, ["Performing Artists", "Lyrics & Song Structure"]);
  const globalMetadata: GlobalMetadata = Object.fromEntries(globalFields.map(([key, label]) => [key, fields.get(label) ?? ""]));
  return { sections, globalMetadata };
}

export function serializeAnnotation(sections: AnnotationSection[], metadata: GlobalMetadata, research?: ResearchReport, audioQaIncomplete = false) {
  const timeline = sections.map(section => [
    `- **Start Time:** ${section.startTime || "0:00"}`,
    `- **Section Type:** ${section.type}`,
    `- **Narrative Description:** ${section.description}`,
    `- **Instruments:** ${section.instruments}`,
    `- **Vibe Tags:** ${section.vibe}`,
    `- **Melody:** ${section.melody}`,
  ].join("\n")).join("\n\n");
  const global = globalFields.map(([key, label], index) =>
    `${index < 22 ? `${index + 1}. ` : "\n"}${label}: ${metadata[key] ?? ""}`
  ).join("\n");
  return attachResearch(`Timeline Sections\n\n${timeline}\n\nGlobal Musical Matrix\n${global}`.trim(), research, audioQaIncomplete);
}
