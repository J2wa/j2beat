import {DEFAULT_MODEL, type ModelId} from '../../shared/models';
import {applyMusicEdits, musicProseFields} from '../../shared/musicHumanizer';

export type WordingRequest = {text:string; model?:ModelId; fieldId?:string; instruction?:string; signal?:AbortSignal};
export async function requestMusicWording({text,model=DEFAULT_MODEL,fieldId,instruction,signal}: WordingRequest): Promise<string> {
  const response = await fetch('/api/humanize', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,model,fieldId,instruction}),signal:signal ?? AbortSignal.timeout(125000)});
  const body = await response.json().catch(()=>({}));
  if (!response.ok || typeof body.text !== 'string' || !body.text.trim()) throw new Error(typeof body.error==='string' ? body.error : 'Wording revision failed. Your original is unchanged.');
  // Verify the same field boundaries and immutable bytes in the browser, too.
  const before=musicProseFields(text), after=musicProseFields(body.text);
  if (before.length!==after.length) throw new Error('Wording revision changed the field structure.');
  const edits=after.flatMap((field,i)=>field.text===before[i].text ? [] : [{id:before[i].id,text:field.text}]);
  if (fieldId && edits.some(edit=>edit.id!==fieldId)) throw new Error('Wording revision changed another description.');
  if (applyMusicEdits(text,edits)!==body.text) throw new Error('Wording revision changed locked content.');
  return body.text;
}
export async function automaticallyHumanize(text:string, model:ModelId=DEFAULT_MODEL, revise=requestMusicWording): Promise<{text:string;notice:string}> {
  try {
    const polished=await revise({text,model});
    return {text:polished,notice:polished===text ? 'Automatic wording review completed. No changes needed.' : 'Wording humanized automatically. Review musical details against the audio.'};
  } catch {
    return {text,notice:'Your annotation is ready. Automatic humanization was unavailable or failed validation; the original wording has been kept. You can retry below or revise individual descriptions.'};
  }
}
