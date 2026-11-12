import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AudioLines, Upload, Play, Pause, RotateCcw, RotateCw, Repeat2, Volume2, VolumeX, X, Link2 } from 'lucide-react';
import { Button } from './BrandSystem';
export const formatTime = (value: number) => { const s = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
type Props = {
 busy?: boolean;
 linkImport?: ReactNode;
 importStatus?: ReactNode;
 file: File | null; audioUrl: string | null; audioRef: RefObject<HTMLAudioElement | null>; currentTime: number; duration: number; isPlaying: boolean; volume: number;
 onFile: (file: File) => void; onSeek: (time: number) => void; onToggle: () => void; onVolume: (v: number) => void; onReset: () => void;
 onTimeUpdate: () => void; onLoadedMetadata: () => void; onPlaying: (playing: boolean) => void; onError: (message: string) => void;
 markers: number[]; onMark: (time: number) => void; onRemoveMarker: (time: number) => void; onClearMarkers: () => void; onUseMarkers: () => void;
 segments: {startTime: string; type?: string; sectionType?: string}[];
};
export function MusicPlayer(p: Props) {
 const picker = useRef<HTMLInputElement>(null);
 const linkPanel = useRef<HTMLDivElement>(null);
 const [showLinkImport, setShowLinkImport] = useState(false);
 useEffect(() => {
   if (showLinkImport) linkPanel.current?.querySelector('input')?.focus();
 }, [showLinkImport]);
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
   setShowLinkImport(false);
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
     if(!p.audioUrl || document.querySelector('[role="dialog"], dialog[open]') || target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
     if(e.code==='KeyM' && !e.repeat){e.preventDefault();p.onMark(p.audioRef.current?.currentTime ?? p.currentTime);}
     if(e.code==='Space'){e.preventDefault();p.onToggle();}
     if(e.code==='ArrowLeft'){e.preventDefault();p.onSeek(p.currentTime-5);}
     if(e.code==='ArrowRight'){e.preventDefault();p.onSeek(p.currentTime+5);}
   };
   window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
 },[p.audioUrl,p.currentTime,p.onToggle,p.onSeek,p.onMark]);
 function mute(){if(p.volume>0){lastVolume.current=p.volume;p.onVolume(0);}else p.onVolume(lastVolume.current);}
 function update(){
   if(looped && p.audioRef.current && p.audioRef.current.currentTime>=loopEnd){p.audioRef.current.currentTime=loopStart;}
   p.onTimeUpdate();
 }
 return <>
 <section className={`track-panel ${dragging?'is-dragging':''}`} aria-label="Audio player" onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);if(!p.busy && e.dataTransfer.files[0])p.onFile(e.dataTransfer.files[0]);}}>
   <input ref={picker} type="file" accept="audio/*" hidden aria-label="Upload audio file" onChange={e=>{if(!p.busy && e.target.files?.[0])p.onFile(e.target.files[0]);e.target.value='';}}/>
   <div className="track-heading"><div className={`track-art ${p.isPlaying?'playing':''}`}><AudioLines size={28}/></div><div className="track-title"><span className="muted small">{p.file?'Current track':'Audio workspace'}</span><h2>{p.file?p.file.name.replace(/\.[^.]+$/,''):'Add a track'}</h2>{p.file&&<p className="muted small">{formatTime(p.duration)} <span>·</span> {(p.file.size/1048576).toFixed(1)} MB <span>·</span> {p.file.name.split('.').pop()?.toUpperCase()}</p>}</div>{p.file && <div className="track-replace-actions">
     <Button disabled={p.busy} onClick={() => picker.current?.click()}><Upload /> Replace audio</Button>
     {p.linkImport && <Button aria-expanded={showLinkImport} aria-controls="track-link-panel" disabled={p.busy} onClick={() => setShowLinkImport(open => !open)}><Link2 /> Import from Spotify</Button>}
   </div>}</div>
   {p.file ? <>
   <div className="waveform-wrap" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setHoverTime(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*p.duration);}} onPointerLeave={()=>setHoverTime(null)}>
    <svg viewBox="0 0 1080 100" preserveAspectRatio="none" aria-hidden="true" className="waveform-svg">
      {peaks.map((v,i)=><rect key={i} x={i*6} y={50-v*44} width="3.5" height={Math.max(2,v*88)} rx="1.5" fill={i/peaks.length<=progress/100?'#6090ff':'#34435d'}/>)}
    </svg>
    {peaks.length===0&&<span className="wave-status">{decoding?'Reading waveform…':waveError?'Waveform unavailable. Playback and seeking still work.':''}</span>}
    {loopStart!==null&&p.duration>0&&<div className="loop-area" style={{left:`${loopStart/p.duration*100}%`,width:`${((loopEnd??p.duration)-loopStart)/p.duration*100}%`}}/>}
    {p.duration>0&&p.markers.map((time,i)=><div key={time} className="split-marker" style={{left:`${time/p.duration*100}%`}} aria-hidden="true"><span>{i+1}</span></div>)}
    <div className="playhead" style={{left:`${progress}%`}}/>
    {hoverTime!==null&&<span className="wave-tooltip" style={{left:`${Math.min(93,Math.max(7,hoverTime/(p.duration||1)*100))}%`}}>{formatTime(hoverTime)}</span>}
    <input className="wave-seek" type="range" aria-label="Seek audio waveform" aria-valuetext={formatTime(p.currentTime)} min={0} max={p.duration||1} step={.01} value={p.currentTime} disabled={!p.duration} onChange={e=>p.onSeek(Number(e.target.value))}/>
   </div>
   <div className="wave-times"><span>0:00</span><span>{formatTime(p.duration/4)}</span><span>{formatTime(p.duration/2)}</span><span>{formatTime(p.duration*3/4)}</span><span>{formatTime(p.duration)}</span></div>
   <div className="marker-controls" aria-label="Segment split markers">
    <div className="marker-actions"><Button disabled={!p.duration} onClick={()=>p.onMark(p.audioRef.current?.currentTime ?? p.currentTime)}>Mark split · {formatTime(p.currentTime)}</Button><Button disabled={!p.markers.length || p.busy} onClick={p.onUseMarkers}>Use in specific timestamps</Button><Button variant="text" disabled={!p.markers.length} onClick={p.onClearMarkers}>Clear markers</Button></div>
    <p className="muted small">Seek on the waveform, then mark a split, or press M while listening. Times use whole seconds. 0:00 is included when adding to the form.</p>
    <div className="marker-list" aria-label="Marked split times">{p.markers.map(time=><span className="marker-chip" key={time}><Button variant="text" onClick={()=>p.onSeek(time)} aria-label={`Seek to split ${formatTime(time)}`}>{formatTime(time)}</Button><Button variant="text" onClick={()=>p.onRemoveMarker(time)} aria-label={`Remove split ${formatTime(time)}`}><X size={14}/></Button></span>)}</div>
    <span role="status" className="sr-only">{p.markers.length} split markers</span>
   </div>
   {p.segments.length>0&&<div className="segment-chips" aria-label="Jump to segment">{p.segments.map((s,i)=><button key={i} onClick={()=>{const parts=s.startTime.replace(/[\[\]]/g,'').split(':').map(Number);p.onSeek(parts[0]*60+parts[1]);}}>{s.startTime} <span>{s.type||s.sectionType||`Segment ${i+1}`}</span></button>)}</div>}
   <div className="loop-controls"><span className="muted small">Loop selection</span><Button aria-pressed={loopStart!==null} disabled={!p.duration} onClick={()=>{setLoopStart(p.currentTime);setLoopEnd(null);p.onSeek(p.currentTime);}}>A {loopStart!==null?formatTime(loopStart):'Start'}</Button><Button aria-pressed={loopEnd!==null} disabled={loopStart===null || p.currentTime<=loopStart+.1} onClick={()=>setLoopEnd(p.currentTime)}>B {loopEnd!==null?formatTime(loopEnd):'End'}</Button>{loopStart!==null&&<Button variant="text" aria-label="Clear loop selection" onClick={()=>{setLoopStart(null);setLoopEnd(null);}}><X/></Button>}<span className="loop-state">{looped?'Loop active':''}</span><Button className="remove-track" disabled={p.busy} variant="text" onClick={p.onReset}><X/>Remove</Button></div>
   </> : <div className="track-source-options" role="group" aria-label="Ways to add a track">
     <Button className="track-source-option" disabled={p.busy} onClick={() => picker.current?.click()}>
       <span className="track-source-icon"><Upload aria-hidden="true" /></span>
       <strong>Upload audio</strong>
       <span className="track-source-detail">Browse or drop an MP3, WAV, or AIFF file</span>
     </Button>
     {p.linkImport && <Button className="track-source-option" aria-expanded={showLinkImport} aria-controls="track-link-panel" disabled={p.busy} onClick={() => setShowLinkImport(open => !open)}>
       <span className="track-source-icon"><Link2 aria-hidden="true" /></span>
       <strong>Import from Spotify</strong>
       <span className="track-source-detail">Paste a Spotify track link</span>
     </Button>}
   </div>}
   {p.linkImport && <div ref={linkPanel} id="track-link-panel" className="track-link-import" hidden={!showLinkImport}>{p.linkImport}</div>}
   {p.importStatus}
 </section>
 <footer className="player-dock" aria-label="Playback controls">
  <div className="dock-track"><span className="dock-art"><AudioLines/></span><div><strong>{p.file?.name||'No track selected'}</strong><span>{p.isPlaying?'Playing':p.file?'Paused':'Add a track to begin'}</span></div></div>
  <div className="dock-center"><div className="transport"><Button variant="text" disabled={!p.audioUrl} aria-label="Skip back 10 seconds" title="Back 10 seconds" onClick={()=>p.onSeek(p.currentTime-10)}><RotateCcw/><span className="skip-label">10</span></Button><Button className="play-button" variant="primary" disabled={!p.audioUrl} aria-label={p.isPlaying?'Pause audio':'Play audio'} onClick={p.onToggle}>{p.isPlaying?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</Button><Button variant="text" disabled={!p.audioUrl} aria-label="Skip forward 10 seconds" title="Forward 10 seconds" onClick={()=>p.onSeek(p.currentTime+10)}><RotateCw/><span className="skip-label">10</span></Button><Button className={repeat?'is-active':''} variant="text" aria-label="Repeat track" title="Repeat track" aria-pressed={repeat} disabled={!p.audioUrl} onClick={()=>setRepeat(!repeat)}><Repeat2/></Button></div><div className="dock-progress"><time>{formatTime(p.currentTime)}</time><input type="range" aria-label="Playback position" min={0} max={p.duration||1} step={.01} value={p.currentTime} disabled={!p.duration} onChange={e=>p.onSeek(Number(e.target.value))} style={{'--progress':`${progress}%`} as React.CSSProperties}/><time>{formatTime(p.duration)}</time></div></div>
  <div className="dock-tools"><label className="speed-control"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={rate} disabled={!p.audioUrl} onChange={e=>setRate(Number(e.target.value))}>{[.5,.75,1,1.25,1.5,2].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><Button variant="text" onClick={mute} aria-label={p.volume===0?'Unmute':'Mute'}>{p.volume===0?<VolumeX/>:<Volume2/>}</Button><input type="range" aria-label="Volume" min={0} max={1} step={.01} value={p.volume} onChange={e=>p.onVolume(Number(e.target.value))} style={{'--progress':`${p.volume*100}%`} as React.CSSProperties}/></div>
 </footer>
 {p.audioUrl&&<audio ref={p.audioRef} src={p.audioUrl} loop={repeat&&!looped} onTimeUpdate={update} onLoadedMetadata={p.onLoadedMetadata} onPlay={()=>p.onPlaying(true)} onPause={()=>p.onPlaying(false)} onEnded={()=>p.onPlaying(false)} onError={()=>p.onError('This audio format could not be played. Try an MP3 or WAV file.')} />}
 </>;
}
