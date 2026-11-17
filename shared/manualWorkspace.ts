import {timestampSeconds} from './manualSegments.js';
export const GLOBAL_FIELDS=[
 ['Genre, Era & Scene','What style do you hear? Support it with arrangement or performance details.'],
 ['Tempo, Rhythm & Groove','Describe the pulse, bass and drums. Any BPM is approximate.'],
 ['Harmony, Chords & Key','Describe how the chords feel and change. Avoid guessing a key.'],
 ['Instrumentation','Arrangement roles only. How parts are played goes in Playing Style.'],
 ['Playing Style','Describe only techniques you can point to in the recording.'],
 ['Wow Factor','What catches your ear? A solo, pause, unusual sound, or big chorus?'],
 ['Emotion, Vibe & Setting','How does it feel, and which listening setting fits?'],
 ['Mix & Production','Describe balance, space and effects. Do not guess recording equipment.'],
 ['Sonic Fidelity','Clear, warm, muffled, noisy, or distorted? Describe audible quality.'],
 ['Vocal Expression','Describe register, phrasing, delivery and harmonies when audible.'],
 ['Lyrical Evocation','Use clearly audible themes only. Do not reconstruct unclear lyrics.']
] as const;
export type Confidence='Confirmed'|'Probable'|'Unsure';
export type Instrument={name:string;confidence:Confidence};
export type ManualRow={start:string;type:string;instruments:string;parts:string;vocals:string;changes:string;vibe:string;melody:string;confidence?:Record<string,Confidence>};
export const newManualRow=(start=''):ManualRow=>({start,type:'',instruments:'',parts:'',vocals:'',changes:'',vibe:'',melody:''});
export function instrumentList(row:ManualRow):Instrument[]{return row.instruments.split(',').map(s=>s.trim()).filter(Boolean).map(name=>({name,confidence:row.confidence?.[name]||'Confirmed'}));}
export function exportedInstruments(row:ManualRow,trailing:boolean){const names=instrumentList(row).filter(i=>i.confidence!=='Unsure').map(i=>i.name);return names.join(', ')+(names.length&&trailing?',':'');}
export function segmentChecks(rows:ManualRow[],index:number,duration:number):string[]{
 const r=rows[index],start=timestampSeconds(r.start),end=index<rows.length-1?timestampSeconds(rows[index+1].start):duration;
 const issues:string[]=[];
 if(!Number.isFinite(start)||start<0||!(duration>0)||start>=duration)issues.push('Start time must be M:SS inside the loaded track.');
 if(index===0&&start!==0)issues.push('The first segment must start at 0:00.');
 if(index>0&&start<=timestampSeconds(rows[index-1].start))issues.push('Start times must be in increasing order.');
 if(end<=start)issues.push('This segment must end after its start.');
 if(end-start>60)issues.push('Segment exceeds 60 seconds. Add a boundary.');
 else if(end-start>50)issues.push('Segment exceeds 50 seconds. Check for an internal split.');
 if(!r.type.trim())issues.push('Choose a section type.');
 if(index===0&&r.type.toLowerCase()!=='intro')issues.push('First section should be intro.');
 if(index===rows.length-1&&r.type.toLowerCase()!=='outro')issues.push('Last section should be outro.');
 if(!exportedInstruments(r,false))issues.push('No exportable instruments listed.');
 if(!r.parts.trim())issues.push('Add parts and playing observations.');
 const words=r.melody.trim().split(/\s+/).filter(Boolean).length;
 if(words&&(words<3||words>7))issues.push('Melody should be 3 to 7 words, or blank.');
 return issues;
}
export function annotationSections(text:string):string[]{return text.split(/(?=^- \*\*Start Time:\*\*)/m).slice(1).map(s=>s.split(/^Global Musical Matrix/m)[0].trim());}
export function annotationField(text:string,label:string):string{
 const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return text.match(new RegExp('^(?:- \\*\\*'+escaped+':\\*\\*|(?:\\d+\\. )?'+escaped+':)[ \t]*([^\\n]*)','m'))?.[1]?.trim()||'';
}
export const needsInput=(text:string)=>[...text.matchAll(/\[NEEDS INPUT:\s*([^\]]+)\]/g)].map(m=>m[1]);

export function lockManualDraft(draft:string,rows:ManualRow[],tags:Record<string,string>,notes:Record<string,string>,options:{fillAudio:boolean;trailing:boolean;instrumental:boolean;title:string;artist:string;performers:string;lyrics:string}):string {
   // Lock the human's structural and tag fields; AI contributes prose and, in audio-fill mode, missing fields.
 let cursor=0;draft=draft.replace(/^- \*\*Start Time:\*\*[\s\S]*?(?=^- \*\*Start Time:\*\*|^Global Musical Matrix|$(?![\s\S]))/gm,block=>{
    const r=rows[cursor++];if(!r)return block;
    const fixed:Record<string,string>={'Start Time':r.start,'Section Type':r.type,'Instruments':exportedInstruments(r,options.trailing),'Vibe Tags':r.vibe,'Melody':r.melody};
    for(const [label,value] of Object.entries(fixed))if(value||!options.fillAudio||label==='Instruments'&&instrumentList(r).length>0){
     const line=new RegExp('^(- \\*\\*'+label+':\\*\\*)[^\\n]*','m');
     block=line.test(block)?block.replace(line,(_,head)=>head+' '+value):block.trimEnd()+'\n- **'+label+':** '+value+'\n\n';
    }
    if(!options.fillAudio){
     if(!exportedInstruments(r,false))block=block.replace(/^(- \*\*Instruments:\*\*)[^\n]*/m,'$1 [NEEDS INPUT: Instruments list is empty]');
     if(![r.parts,r.vocals,r.changes].some(v=>v.trim()))block=block.replace(/^(- \*\*Narrative Description:\*\*)[^\n]*/m,'$1 [NEEDS INPUT: No performance observations for this segment]');
    }
    return block;
   });
   for(const [label] of GLOBAL_FIELDS)if(tags[label]?.trim())draft=draft.replace(new RegExp('^(\\d+\\. '+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' Tags:)[^\\n]*','m'),(_,head)=>head+' '+tags[label].trim());
   if(!options.fillAudio)for(const [label] of GLOBAL_FIELDS){
    const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const na=options.instrumental&&['Vocal Expression','Lyrical Evocation'].includes(label);
    if(!notes[label]?.trim()||na)draft=draft.replace(new RegExp('^(\\d+\\. '+escaped+':)[^\\n]*','m'),(_,head)=>head+' '+(na?'N/A':'[NEEDS INPUT: No facts given for '+label+']'));
   }
   for(const [label,value] of [['Song title',options.title],['Song by',options.artist],['Performing Artists',options.performers],['Lyrics & Song Structure',options.lyrics]])if(value.trim()){
    const line=new RegExp('^'+label+':[^\\n]*','m');
    draft=line.test(draft)?draft.replace(line,()=>label+': '+value.trim()):draft+'\n\n'+label+': '+value.trim();
   }
 return draft;
}
