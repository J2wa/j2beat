import { reportProgress } from './progress.js';
import { generateWithFallback } from './providers.js';
import { researchSong, researchInstruction } from './songResearch.js';
import { attachResearch, type ResearchReport } from '../shared/research.js';

// Independently implemented workflow inspired by MOSS-Music-Data-Pipeline.
// No MOSS weights, specialist MIR detectors, or upstream code are bundled.
export const EVIDENCE_PROMPT = `Listen to the supplied audio and return ONLY a JSON object:
{"overview":"audible style, mood, instrumentation, vocals, rhythm, harmony and production",
 "sections":[{"start":0,"end":10,"label":"intro or neutral section label","observations":"audible events and changes","uncertainties":"uncertain details"}],
 "uncertainties":["unresolved musical details"],
 "songClues":"up to ten clearly audible lyric words to help identify the song, or blank"}.
First assess the whole recording, then locate sections by audible changes and repetition, then describe events inside each interval. Do not force verse/chorus labels onto instrumental or through-composed music. Keep sparse music sparse.
Use seconds relative to the uploaded audio. Bound all intervals by the supplied duration. Do not invent precise boundaries. Describe key, chords, tempo, instruments, vocal delivery and lyrics only when supported by listening; otherwise record uncertainty. Do not infer identity or gender. Do not reconstruct inaudible lyrics from memory. No web knowledge can establish what is audible.
For each section, include the audible instruments and the melodic carrier, direction, step/leap movement, rhythmic placement, phrase length, repetition or answering, and a recording-specific audible detail in observations. If absent or uncertain, say so; do not invent details to fill this checklist.
Treat user guidance and previous annotations as hypotheses, never as evidence. Use short factual observations, not polished captions. Do not output reasoning or extra JSON fields.`;

export function cleanEvidence(raw: string, duration: number) {
  const data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (!data || typeof data.overview !== 'string' || !Array.isArray(data.sections)) throw new Error('Invalid evidence');
  const short = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 2000) : '';
  const sections: {start:number;end:number;label:string;observations:string;uncertainties:string}[] = [];
  let rejected = 0;
  const ordered = data.sections.slice(0, 200).sort((a:any,b:any) => (a?.start ?? Infinity) - (b?.start ?? Infinity));
  for (const s of ordered) {
    if (!s || typeof s.start !== 'number' || typeof s.end !== 'number' || !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < 0 || s.end <= s.start || (duration > 0 && s.end > duration) || (sections.length && s.start < sections.at(-1)!.end) || !short(s.observations)) { rejected++; continue; }
    sections.push({start:s.start,end:s.end,label:short(s.label),observations:short(s.observations),uncertainties:short(s.uncertainties)});
  }
  const uncertainties = Array.isArray(data.uncertainties) ? data.uncertainties.slice(0,20).map(short).filter(Boolean) : [];
  if (rejected) uncertainties.push(`${rejected} invalid or overlapping intervals discarded; boundaries require human review.`);
  if (!sections.length) uncertainties.push('No valid section intervals; boundaries require human review.');
  return {overview:short(data.overview), sections, uncertainties, songClues:short(data.songClues).split(/\s+/).slice(0,10).join(' ')};
}

export async function generateMusicAnnotation(request: any, duration: number, generate = generateWithFallback, research = researchSong) {
  const deadline = Date.now() + 240000;
  let evidence: ReturnType<typeof cleanEvidence> | undefined;
  try {
    reportProgress('Analyzing audio');
    const result = await generate({
      model: request.model,
      contents: [{parts: [
        {text: `Analyze the audio. Supplied duration: ${duration > 0 ? `${duration} seconds` : 'unknown'}.`},
        ...request.contents.flatMap((c:any) => c.parts),
      ]}],
      config: {systemInstruction:EVIDENCE_PROMPT, responseMimeType:'application/json'},
    }, {deadline: Math.min(deadline, Date.now()+45000), maxAttempts:1});
    evidence = cleanEvidence(result.text, duration);
  } catch { /* Evidence is optional: keep normal annotation available on failure. */ }
  reportProgress('Searching Google for song context');
  let songResearch: ResearchReport;
  try { songResearch = await research(request, evidence, deadline); }
  catch { songResearch = {status:'unavailable',message:'Google Search is unavailable. Global fields use listening evidence only.',summary:'',sources:[],queries:[]}; }
  const instruction = evidence
    ? `\n\nValidated preliminary listening notes (model estimates, not ground truth):\n${JSON.stringify(evidence)}\nWRITING PASS: No audio is attached. Use ONLY this metadata as the source for audible musical facts; the separate Google Search context may supplement global fields with citations. Earlier user text controls style and formatting, not musical facts. Do not invent missing details, repair missing intervals, add instruments or supply lyrics from memory. Preserve uncertainties. Write the requested annotation from these observations. Do not print these notes or change output field labels. All final timestamps must stay within the supplied duration; do not fill gaps by inventing events.`
    : '\n\nPreliminary evidence extraction was unavailable. Analyze the audio directly: whole-track listening, section boundaries, local events, consistency check, then final annotation. Do not claim a separate verification succeeded.';
  const contents = evidence
    ? request.contents.map((c:any) => ({...c, parts:c.parts.filter((p:any) => typeof p.text === 'string')}))
    : request.contents;
  reportProgress(evidence ? 'Writing annotation from analysis' : 'Analyzing and writing directly');
  const result = await generate({...request, contents, config:{...request.config, systemInstruction:request.config.systemInstruction+instruction+researchInstruction(songResearch)}}, {deadline, metadataOnly:!!evidence});
  return {text:attachResearch(result.text, songResearch)};
}
