import { useState } from 'react';
import { MANUAL_INPUT_SHEET } from '../../shared/manualMode';
import { DEFAULT_MODEL, MODEL_OPTIONS } from '../../shared/models';
export function ManualMode(){
 const [sheet,setSheet]=useState(()=>{try{return localStorage.getItem('aces_manual_sheet')||MANUAL_INPUT_SHEET;}catch{return MANUAL_INPUT_SHEET;}});
 const [output,setOutput]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [model,setModel]=useState<string>(DEFAULT_MODEL);
 const flags=output.match(/\[NEEDS INPUT:[^\]]*\]/g)||[];
 async function write(){setBusy(true);setError('');try{const response=await fetch('/api/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sheet,model}),signal:AbortSignal.timeout(125000)}); const data=await response.json();if(!response.ok||!data.text?.trim())throw Error(data.error||'Writing failed.');setOutput(data.text);}catch(e){setError(e instanceof Error?e.message:'Writing failed.');}finally{setBusy(false);}}
 return <section className="hardware-card p-6 space-y-4">
 <h2>Manual annotation</h2><p>You supply the facts. AI writes from your notes only. No audio upload, listening pass, or song research. Edit the sheet and regenerate to make corrections.</p>
 <label className="block">Writing model <select value={model} disabled={busy} onChange={e=>setModel(e.target.value)}>{MODEL_OPTIONS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
 <label className="block" htmlFor="manual-sheet">Annotator input sheet</label>
 <textarea id="manual-sheet" className="w-full bg-black/20 p-4 font-mono" rows={24} value={sheet} disabled={busy} onChange={e=>{setSheet(e.target.value);try{localStorage.setItem('aces_manual_sheet',e.target.value);}catch{}}}/>
 <button className="aces-button aces-button--primary" disabled={busy||!sheet.trim()} onClick={write}>{busy?'Writing from your notes…':'Write annotation'}</button>
 {error&&<p role="alert">{error}</p>}
 {output&&<><p role="status">{flags.length} needs-input flags. Check every fact against your sheet before copying. This is an AI draft.</p>
 <pre className="whitespace-pre-wrap">{output.split(/(\[NEEDS INPUT:[^\]]*\])/g).map((part,i)=>part.startsWith('[NEEDS INPUT:')?<mark key={i}>{part}</mark>:part)}</pre>
 <button className="aces-button" onClick={async()=>{try{await navigator.clipboard.writeText(output);}catch{setError('Copy failed. Select and copy the text manually.');}}}>Copy draft{flags.length?' with flags':''}</button></>}
 </section>;
}
