export type MusicSuggestion={start:number;label:string;reason:string;instruments:{name:string;reason:string}[]};
export function parseMusicSuggestions(text:string,duration:number,starts?:number[]):MusicSuggestion[]{
 const data=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
 if((starts && data.sections?.length!==starts.length)||!Array.isArray(data.sections)||!data.sections.length||data.sections.length>200)throw Error('Invalid suggestions');
 const seen=new Set<number>();
 return data.sections.map((s:any)=>{
  if(typeof s.start!=='number'||!Number.isInteger(s.start)||s.start<0||s.start>=Math.floor(duration)||seen.has(s.start)||(starts&&!starts.includes(s.start))||!Array.isArray(s.instruments)||s.instruments.length>30)throw Error('Invalid suggestion timing');
  seen.add(s.start);
  const short=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid suggestion text');return v.trim();};
  return {start:s.start,label:short(s.label,80),reason:short(s.reason,800),instruments:s.instruments.map((i:any)=>{const name=short(i.name,80);if(!name||/[\n,]/.test(name))throw Error('Invalid instrument');return {name,reason:short(i.reason,600)};})};
 }).sort((a:MusicSuggestion,b:MusicSuggestion)=>a.start-b.start);
}
export function addConfirmedInstrument(existing:string,name:string):string {
 const names=existing.split(',').map(s=>s.trim()).filter(Boolean);
 if(!names.some(s=>s.toLowerCase()===name.trim().toLowerCase()))names.push(name.trim());
 return names.join(', ');
}
