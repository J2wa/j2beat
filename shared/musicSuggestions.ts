export type MusicSuggestion={start:number;label:string;reason:string;instruments:{name:string;reason:string}[]};
function suggestionSeconds(value:unknown):number {
 if(typeof value==='number')return value;
 if(typeof value!=='string'||!value.trim())return NaN;
 const text=value.trim();
 if(/^\d+(?:\.\d+)?$/.test(text))return Number(text);
 if(/^\d+:\d{2}(?:\.\d+)?$/.test(text)){
  const [m,s]=text.split(':').map(Number);return s<60?m*60+s:NaN;
 }
 return NaN;
}
export function parseMusicSuggestions(text:string,duration:number,starts?:number[]):MusicSuggestion[]{
 const data=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
 const sections=Array.isArray(data)?data:data?.sections;
 if(!Array.isArray(sections)||!sections.length||sections.length>200||!Number.isFinite(duration)||duration<=1)throw Error('Invalid suggestions');
 const seen=new Set<number>();
 const result:MusicSuggestion[]=[];
 const short=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
 for(const s of sections){
  if(!s||typeof s!=='object')continue;
  const raw=suggestionSeconds(s.start);
  // Whole-second controls: normalise fractional/model-formatted timestamps,
  // then discard end markers and invalid candidates rather than losing all rows.
  if(!Number.isFinite(raw)||raw<0||raw>=Math.floor(duration))continue;
  let start=Math.round(raw);
  if(starts){const match=starts.find(t=>Math.abs(t-raw)<=0.51);if(match===undefined)continue;start=match;}
  if(start>=Math.floor(duration)||seen.has(start))continue;
  seen.add(start);
  const instruments:MusicSuggestion['instruments']=[];
  const names=new Set<string>();
  for(const item of (Array.isArray(s.instruments)?s.instruments:[]).slice(0,30)){
   const name=short(typeof item==='string'?item:item?.name,80);
   if(!name||/[\n,]/.test(name)||names.has(name.toLowerCase()))continue;
   names.add(name.toLowerCase());instruments.push({name,reason:short(item?.reason,600)||'AI candidate. Listen to confirm this sound.'});
  }
  result.push({start,label:short(s.label,80),reason:short(s.reason,800)||'AI candidate. Check this boundary against the audio.',instruments});
 }
 if(!result.length)throw Error('No usable section suggestions');
 // An instruments-only request must match the annotator's complete timeline.
 if(starts&&result.length!==starts.length)throw Error('Incomplete instrument suggestions');
 return result.sort((a,b)=>a.start-b.start);
}
export function addConfirmedInstrument(existing:string,name:string):string {
 const names=existing.split(',').map(s=>s.trim()).filter(Boolean);
 if(!names.some(s=>s.toLowerCase()===name.trim().toLowerCase()))names.push(name.trim());
 return names.join(', ');
}
