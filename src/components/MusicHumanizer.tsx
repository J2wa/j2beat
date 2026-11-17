import {useEffect, useRef, useState} from 'react';
import {Button} from './BrandSystem';
import {musicProseFields} from '../../shared/musicHumanizer';
import type {ModelId} from '../../shared/models';

type Props = {text: string; model: ModelId; disabled: boolean; onBusy: (busy:boolean)=>void; onApply: (text:string)=>void};
export function MusicHumanizer({text,model,disabled,onBusy,onApply}: Props) {
  const [busy,setBusy] = useState(false);
  const [preview,setPreview] = useState<{base:string;draft:string}|null>(null);
  const [undo,setUndo] = useState<{original:string;applied:string}|null>(null);
  const [message,setMessage] = useState('');
  const controller = useRef<AbortController|null>(null);
  const latest = useRef(text); latest.current = text;
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {setPreview(null); setMessage('');}, [text]);
  const run = async () => {
    if (disabled || busy) return;
    const base = text;
    setBusy(true); onBusy(true); setPreview(null); setMessage('');
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 125000);
    try {
      const response = await fetch('/api/humanize', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:base,model}),signal:abort.signal});
      const body = await response.json().catch(()=>({}));
      if (!response.ok || typeof body.text !== 'string' || !body.text.trim()) throw new Error(typeof body.error === 'string' ? body.error : 'Humanizing failed. Your original is unchanged.');
      if (latest.current !== base) {setMessage('The annotation changed. Run the humanizer again.'); return;}
      if (body.text === base) setMessage('No wording changes suggested.');
      else setPreview({base,draft:body.text});
    } catch (error) {setMessage(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Humanizing stopped or timed out. Your original is unchanged.');}
    finally {clearTimeout(timer);controller.current=null;setBusy(false);onBusy(false);}
  };
  const originals = preview ? musicProseFields(preview.base) : [];
  const changes = preview && preview.base === text ? musicProseFields(preview.draft).map((field,i)=>({label:field.label,before:originals[i]?.text,after:field.text})).filter(f=>f.before!==f.after) : [];
  return <section className="music-humanizer" aria-label="Music wording humanizer">
    <div className="section-heading"><div><h3>Humanize wording</h3><p className="field-hint">Polish section narratives and Global Analysis while keeping their musical detail. Timestamps, tags and melody fields stay locked.</p></div>
      <Button disabled={disabled || busy} onClick={run}>{busy ? 'Humanizing…' : 'Preview wording edits'}</Button>
    </div>
    <p className="field-hint">Uses the selected AI model; provider charges may apply. No audio upload is needed. Review edits for meaning before applying.</p>
    {busy && <Button onClick={()=>controller.current?.abort()}>Cancel</Button>}
    {message && <p role="status">{message}</p>}
    {changes.length > 0 && <div className="humanizer-preview">
      <p role="status">{changes.length} field{changes.length===1?'':'s'} edited. Review the original and suggested wording.</p>
      {changes.map((field,i)=><details key={i} open={changes.length===1}><summary>{field.label}</summary><div className="humanizer-comparison"><div><h4>Original</h4><p>{field.before}</p></div><div><h4>Suggested</h4><p>{field.after}</p></div></div></details>)}
      <div className="humanizer-actions"><Button variant="primary" disabled={disabled || busy} onClick={()=>{
        if (!preview || preview.base!==text) return;
        setUndo({original:preview.base,applied:preview.draft});onApply(preview.draft);setPreview(null);
      }}>Apply wording edits</Button><Button onClick={()=>setPreview(null)}>Discard</Button></div>
    </div>}
    {undo?.applied === text && <Button disabled={disabled || busy} onClick={()=>{onApply(undo.original);setUndo(null);}}>Undo wording edits</Button>}
  </section>;
}
