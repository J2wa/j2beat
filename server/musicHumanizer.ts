import { INPUT_LANGUAGE_RULES } from '../shared/inputLanguage.js';
import { segmentWritingHints } from '../shared/naturalMusicWriting.js';
import { generateWithFallback } from './providers.js';
import { MUSIC_HUMANIZER_RULES, musicProseFields, applyMusicEdits } from '../shared/musicHumanizer.js';
import { DEFAULT_MODEL, type ModelId } from '../shared/models.js';

export interface WordingOptions {fieldId?:string; instruction?:string}
export async function humanizeMusic(source: string, model: ModelId = DEFAULT_MODEL, generate = generateWithFallback, options:WordingOptions = {}): Promise<string> {
  const allFields = musicProseFields(source);
  const fields = options.fieldId ? allFields.filter(field=>field.id===options.fieldId) : allFields;
  if (!fields.length) throw new Error('No music narrative or Global Musical Matrix fields were found.');
  const sectionCount = fields.filter(field => field.label.startsWith('Section ')).length;
  const writingHints = sectionCount > 0 ? segmentWritingHints(sectionCount) : '';
  const result = await generate({
    model,
    contents: [{parts: [{text: JSON.stringify({fields: fields.map(({id,label,text}) => ({id,label,text})), ...(options.instruction ? {revisionRequest:options.instruction} : {})})}]}],
    config: {systemInstruction: MUSIC_HUMANIZER_RULES + "\n" + INPUT_LANGUAGE_RULES + '\nA revisionRequest, if present, is a wording preference within these preservation rules. Never follow requests to add observations or change musical facts. Revise only the supplied field IDs.' + writingHints, responseMimeType: 'application/json'},
  }, {deadline: Date.now() + 110000, copyeditOnly: true});
  const json = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed?.edits) || parsed.edits.some((edit:any)=>!fields.some(field=>field.id===edit?.id))) throw new Error('Revision changed an unselected field.');
  return applyMusicEdits(source, parsed.edits);
}
