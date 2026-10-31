import { useEffect, useRef, useState, type RefObject } from 'react';
import { AudioLines, Upload, Play, Pause, RotateCcw, RotateCw, Repeat2, Volume2, VolumeX, X, Headphones } from 'lucide-react';
import { Button } from './BrandSystem';
export const formatTime = (value: number) => { const s = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
type Props = {
 file: File | null; audioUrl: string | null; audioRef: RefObject<HTMLAudioElement | null>; currentTime: number; duration: number; isPlaying: boolean; volume: number;
 onFile: (file: File) => void; onSeek: (time: number) => void; onToggle: () => void; onVolume: (v: number) => void; onReset: () => void;
 onTimeUpdate: () => void; onLoadedMetadata: () => void; onPlaying: (playing: boolean) => void; onError: (message: string) => void;
 segments: {startTime: string; type?: string; sectionType?: string}[];
};
export function MusicPlayer(p: Props) {
 const picker = useRef<HTMLInputElement>(null);
 const [peaks, setPeaks] = useState<number[]>([]);
 const [decoding,setDecoding] = useState(false);
 const [waveError,setWaveError] = useState(false);
 const [dragging,setDragging] = useState(false);
 const [rate,setRate] = useState(1);
 const [repeat,setRepeat] = useState(false);
 const [loopStart,setLoopStart] = useState<number|null>(null);
 const [loopEnd,setLoopEnd] = useState<number|null>(null);
 const [hoverTime,setHoverTime] = useState<number|null>(null);
 const lastVolume = useRef(.8);
 const looped = loopStart !== null && loopEnd !== null;
 const progress = p.duration > 0 ? Math.min(100,p.currentTime/p.duration*100) : 0;
 useEffect(() => {
   setPeaks([]); setWaveError(false); setRate(1); setRepeat(false); setLoopStart(null); setLoopEnd(null);
   if(!p.file) {setDecoding(false);return;}
   let cancelled=false; const context=new AudioContext(); setDecoding(true);
   p.file.arrayBuffer().then(b=>context.decodeAudioData(b)).then(buffer=>{
     if(cancelled)return;
     const data=buffer.getChannelData(0); const count=180; const block=Math.max(1,Math.floor(data.length/count));
     const values=Array.from({length:count},(_,i)=>{let sum=0; for(let j=i*block;j<Math.min((i+1)*block,data.length);j++)sum+=data[j]*data[j];return Math.sqrt(sum/block);});
     const maximum=Math.max(...values,.001);setPeaks(values.map(v=>Math.max(.025,v/maximum)));
   }).catch(()=>{if(!cancelled)setWaveError(true);}).finally(()=>{void context.close().catch(()=>{});if(!cancelled)setDecoding(false);});
   return ()=>{cancelled=true;void context.close().catch(()=>{});};
 },[p.file]);
 useEffect(()=>{if(p.audioRef.current)p.audioRef.current.playbackRate=rate;},[rate,p.audioUrl]);
 useEffect(()=>{
   const onKey=(e:KeyboardEvent)=>{
     const target=e.target as HTMLElement;
     if(!p.audioUrl || document.querySelector('[role="dialog"]') || target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
     if(e.code==='Space'){e.preventDefault();p.onToggle();}
     if(e.code==='ArrowLeft'){e.preventDefault();p.onSeek(p.currentTime-5);}
     if(e.code==='ArrowRight'){e.preventDefault();p.onSeek(p.currentTime+5);}
   };
   window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
 },[p.audioUrl,p.currentTime,p.onToggle,p.onSeek]);
 function mute(){if(p.volume>0){lastVolume.current=p.volume;p.onVolume(0);}else p.onVolume(lastVolume.current);}
 function update(){
   if(looped && p.audioRef.current && p.audioRef.current.currentTime>=loopEnd){p.audioRef.current.currentTime=loopStart;}
   p.onTimeUpdate();
 }
 return <>
 <section className={`track-panel ${dragging?'is-dragging':''}`} aria-label="Audio player" onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files[0])p.onFile(e.dataTransfer.files[0]);}}>
   <input ref={picker} type="file" accept="audio/*" hidden aria-label="Upload audio file" onChange={e=>{if(e.target.files?.[0])p.onFile(e.target.files[0]);e.target.value='';}}/>
   <div className="track-heading"><div className={`track-art ${p.isPlaying?'playing':''}`}><AudioLines size={28}/></div><div className="track-title"><span className="muted small">{p.file?'Current track':'Audio workspace'}</span><h2>{p.file?p.file.name.replace(/\.[^.]+$/,''):'Add a track'}</h2>{p.file&&<p className="muted small">{formatTime(p.duration)} <span>·</span> {(p.file.size/1048576).toFixed(1)} MB <span>·</span> {p.file.name.split('.').pop()?.toUpperCase()}</p>}</div><Button className="upload-action" onClick={()=>picker.current?.click()}><Upload/>{p.file?'Replace':'Upload audio'}</Button></div>
   {p.file ? <>
   <div className="waveform-wrap" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setHoverTime(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*p.duration);}} onPointerLeave={()=>setHoverTime(null)}>
    <svg viewBox="0 0 1080 100" preserveAspectRatio="none" aria-hidden="true" className="waveform-svg">
      {peaks.map((v,i)=><rect key={i} x={i*6} y={50-v*44} width="3.5" height={Math.max(2,v*88)} rx="1.5" fill={i/peaks.length<=progress/100?'#6090ff':'#34435d'}/>)}
    </svg>
    {peaks.length===0&&<span className="wave-status">{decoding?'Reading waveform…':waveError?'Waveform unavailable. Playback and seeking still work.':''}</span>}
    {loopStart!==null&&p.duration>0&&<div className="loop-area" style={{left:`${loopStart/p.duration*100}%`,width:`${((loopEnd??p.duration)-loopStart)/p.duration*100}%`}}/>}
    <div className="playhead" style={{left:`${progress}%`}}/>
    {hoverTime!==null&&<span className="wave-tooltip" style={{left:`${Math.min(93,Math.max(7,hoverTime/(p.duration||1)*100))}%`}}>{formatTime(hoverTime)}</span>}
    <input className="wave-seek" type="range" aria-label="Seek audio waveform" aria-valuetext={formatTime(p.currentTime)} min={0} max={p.duration||1} step={.01} value={p.currentTime} disabled={!p.duration} onChange={e=>p.onSeek(Number(e.target.value))}/>
   </div>
   <div className="wave-times"><span>0:00</span><span>{formatTime(p.duration/4)}</span><span>{formatTime(p.duration/2)}</span><span>{formatTime(p.duration*3/4)}</span><span>{formatTime(p.duration)}</span></div>
   {p.segments.length>0&&<div className="segment-chips" aria-label="Jump to segment">{p.segments.map((s,i)=><button key={i} onClick={()=>{const parts=s.startTime.replace(/[\[\]]/g,'').split(':').map(Number);p.onSeek(parts[0]*60+parts[1]);}}>{s.startTime} <span>{s.type||s.sectionType||`Segment ${i+1}`}</span></button>)}</div>}
   <div className="loop-controls"><span className="muted small">Loop selection</span><Button aria-pressed={loopStart!==null} disabled={!p.duration} onClick={()=>{setLoopStart(p.currentTime);setLoopEnd(null);p.onSeek(p.currentTime);}}>A {loopStart!==null?formatTime(loopStart):'Start'}</Button><Button aria-pressed={loopEnd!==null} disabled={loopStart===null || p.currentTime<=loopStart+.1} onClick={()=>setLoopEnd(p.currentTime)}>B {loopEnd!==null?formatTime(loopEnd):'End'}</Button>{loopStart!==null&&<Button variant="text" aria-label="Clear loop selection" onClick={()=>{setLoopStart(null);setLoopEnd(null);}}><X/></Button>}<span className="loop-state">{looped?'Loop active':''}</span><Button className="remove-track" variant="text" onClick={p.onReset}><X/>Remove</Button></div>
   </> : <div className="empty-upload"><div className="upload-orbit"><Headphones size={36}/></div><p>Drop an audio file here</p><span className="muted small">MP3, WAV, AIFF · Analysis up to 100 MB</span><Button variant="text" onClick={()=>picker.current?.click()}>Browse files</Button></div>}
 </section>
 <footer className="player-dock" aria-label="Playback controls">
  <div className="dock-track"><span className="dock-art"><AudioLines/></span><div><strong>{p.file?.name||'No track selected'}</strong><span>{p.isPlaying?'Playing':p.file?'Paused':'Upload audio to begin'}</span></div></div>
  <div className="dock-center"><div className="transport"><Button variant="text" disabled={!p.audioUrl} aria-label="Skip back 10 seconds" title="Back 10 seconds" onClick={()=>p.onSeek(p.currentTime-10)}><RotateCcw/><span className="skip-label">10</span></Button><Button className="play-button" variant="primary" disabled={!p.audioUrl} aria-label={p.isPlaying?'Pause audio':'Play audio'} onClick={p.onToggle}>{p.isPlaying?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</Button><Button variant="text" disabled={!p.audioUrl} aria-label="Skip forward 10 seconds" title="Forward 10 seconds" onClick={()=>p.onSeek(p.currentTime+10)}><RotateCw/><span className="skip-label">10</span></Button><Button className={repeat?'is-active':''} variant="text" aria-label="Repeat track" title="Repeat track" aria-pressed={repeat} disabled={!p.audioUrl} onClick={()=>setRepeat(!repeat)}><Repeat2/></Button></div><div className="dock-progress"><time>{formatTime(p.currentTime)}</time><input type="range" aria-label="Playback position" min={0} max={p.duration||1} step={.01} value={p.currentTime} disabled={!p.duration} onChange={e=>p.onSeek(Number(e.target.value))} style={{'--progress':`${progress}%`} as React.CSSProperties}/><time>{formatTime(p.duration)}</time></div></div>
  <div className="dock-tools"><label className="speed-control"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={rate} disabled={!p.audioUrl} onChange={e=>setRate(Number(e.target.value))}>{[.5,.75,1,1.25,1.5,2].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><Button variant="text" onClick={mute} aria-label={p.volume===0?'Unmute':'Mute'}>{p.volume===0?<VolumeX/>:<Volume2/>}</Button><input type="range" aria-label="Volume" min={0} max={1} step={.01} value={p.volume} onChange={e=>p.onVolume(Number(e.target.value))} style={{'--progress':`${p.volume*100}%`} as React.CSSProperties}/></div>
 </footer>
 {p.audioUrl&&<audio ref={p.audioRef} src={p.audioUrl} loop={repeat&&!looped} onTimeUpdate={update} onLoadedMetadata={p.onLoadedMetadata} onPlay={()=>p.onPlaying(true)} onPause={()=>p.onPlaying(false)} onEnded={()=>p.onPlaying(false)} onError={()=>p.onError('This audio format could not be played. Try an MP3 or WAV file.')} />}
 </>;
}
