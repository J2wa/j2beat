import {useEffect, useId, useRef, useState} from 'react';
import {Button} from './BrandSystem';
import {musicProseFields} from '../../shared/musicHumanizer';
import {requestMusicWording} from '../services/humanizerService';
import type {ModelId} from '../../shared/models';

type Props={source:string;fieldId?:string;label:string;model:ModelId;disabled:boolean;onBusy:(busy:boolean)=>void;onApply:(source:string)=>void};
export function DescriptionRevision({source,fieldId,label,model,disabled,onBusy,onApply}:Props) {
  const [open,setOpen]=useState(false), [busy,setBusy]=useState(false);
  const [instruction,setInstruction]=useState(''), [message,setMessage]=useState('');
  const [preview,setPreview]=useState<{base:string;draft:string;before:string;after:string}|null>(null);
  const [undo,setUndo]=useState<{base:string;applied:string}|null>(null);
  const controls=useId();
  const abort=useRef<AbortController|null>(null);
  const latest=useRef(source); latest.current=source;
  const field=musicProseFields(source).find(field=>field.id===fieldId);
  useEffect(()=>{setPreview(null);setMessage('');},[source,fieldId]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  const revise=async()=>{
    if(disabled || busy || !field) return;
    const base=source, id=field.id;
    const controller=new AbortController();abort.current=controller;
    const timer=setTimeout(()=>controller.abort(),125000);
    setBusy(true);onBusy(true);setPreview(null);setMessage('');
    try {
      const draft=await requestMusicWording({text:base,fieldId:id,instruction:instruction.trim(),model,signal:controller.signal});
      if(latest.current!==base){setMessage('This description changed. Generate a new revision.');return;}
      const after=musicProseFields(draft).find(field=>field.id===id)?.text;
      if(!after)throw new Error('The revised description was missing. Your original is unchanged.');
      if(draft===base)setMessage('No wording changes suggested.');
      else setPreview({base,draft,before:field.text,after});
    }catch(error){setMessage(error instanceof Error && error.name!=='AbortError' ? error.message : 'Revision canceled or timed out. Your original is unchanged.');}
    finally{clearTimeout(timer);abort.current=null;setBusy(false);onBusy(false);}
  };
  return <div className="description-revision" onClick={event=>event.stopPropagation()}>
    <Button aria-expanded={open} aria-controls={controls} aria-label={`Revise ${label} description`} disabled={disabled || busy || !field} onClick={()=>setOpen(!open)}>Revise description</Button>
    {open && <section id={controls} className="description-revision-panel" aria-label={`${label} wording revision`}>
      <label htmlFor={`${controls}-instructions`}>Revision instructions (optional)</label>
      <textarea id={`${controls}-instructions`} value={instruction} maxLength={2000} disabled={disabled || busy} onChange={event=>setInstruction(event.target.value)} placeholder="For example: make the phrasing more direct while keeping every musical detail." />
      <p className="field-hint">Rewrites this description only. Use audio correction for new musical observations.</p>
      <div className="humanizer-actions"><Button disabled={disabled || busy || !field} onClick={revise}>{busy?'Revising…':'Generate revision'}</Button>
        {busy ? <Button onClick={()=>abort.current?.abort()}>Cancel revision</Button> : <Button onClick={()=>{setOpen(false);setPreview(null);}}>Close</Button>}
      </div>
      {message && <p role="status">{message}</p>}
      {preview?.base===source && <div>
        <div className="humanizer-comparison"><div><h4>Original</h4><p>{preview.before}</p></div><div><h4>Suggested</h4><p>{preview.after}</p></div></div>
        <div className="humanizer-actions"><Button variant="primary" disabled={disabled || busy} onClick={()=>{
          if(preview.base!==source)return;
          setUndo({base:preview.base,applied:preview.draft});onApply(preview.draft);setPreview(null);
        }}>Apply revision</Button><Button onClick={()=>setPreview(null)}>Discard revision</Button></div>
      </div>}
    </section>}
    {undo?.applied===source && <Button disabled={disabled || busy} onClick={()=>{onApply(undo.base);setUndo(null);}}>Undo description revision</Button>}
  </div>;
}
