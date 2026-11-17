export function timestampSeconds(value:string):number {
 if(!/^\d+:\d{2}$/.test(value)) return NaN;
 const [m,s]=value.split(':').map(Number); return s<60?m*60+s:NaN;
}
export function displayTimestamp(time:number):string {const n=Math.floor(time);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export function mergeSplitMarks<T extends {start:string}>(rows:T[],marks:number[],duration:number,create:(time:string)=>T):T[]{
 const valid=[...new Set([0,...marks.filter(Number.isFinite).map(Math.floor)])].filter(t=>t>=0&&duration>0&&t<Math.floor(duration));
 const existing=new Set(rows.map(r=>timestampSeconds(r.start)));
 return [...rows,...valid.filter(t=>!existing.has(t)).map(t=>create(displayTimestamp(t)))].sort((a,b)=>{const x=timestampSeconds(a.start),y=timestampSeconds(b.start);return (Number.isFinite(x)?x:Infinity)-(Number.isFinite(y)?y:Infinity);});
}
