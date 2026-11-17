import { segmentWritingHints } from '../shared/naturalMusicWriting.js';
import { generateWithFallback } from './providers.js';
import { MUSIC_HUMANIZER_RULES, musicProseFields, applyMusicEdits } from '../shared/musicHumanizer.js';
import { DEFAULT_MODEL, type ModelId } from '../shared/models.js';

export async function humanizeMusic(source: string, model: ModelId = DEFAULT_MODEL, generate = generateWithFallback): Promise<string> {
  const fields = musicProseFields(source);
  if (!fields.length) throw new Error('No music narrative or Global Musical Matrix fields were found.');
  const result = await generate({
    model,
    contents: [{parts: [{text: JSON.stringify({fields: fields.map(({id,label,text}) => ({id,label,text}))})}]}],
    config: {systemInstruction: MUSIC_HUMANIZER_RULES + segmentWritingHints(fields.filter(f => f.label.startsWith('Section ')).length), responseMimeType: 'application/json'},
  }, {deadline: Date.now() + 110000, copyeditOnly: true});
  const json = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(json);
  return applyMusicEdits(source, parsed.edits);
}
