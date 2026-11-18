import { parseAnnotation, serializeAnnotation, isSectionUnsure, type AnnotationSection, type GlobalMetadata } from "./utils/annotationForm";
import { ManualMode } from './components/ManualMode';
import { importedAudioExpiresAt } from "../shared/importExpiry";
import { attachResearch, splitResearch, researchAsMarkdown, type ResearchReport } from "../shared/research";
import { DEFAULT_MODEL, MODEL_OPTIONS, isModelId, type ModelId } from '../shared/models';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import {
  FileAudio,
  Settings,
  Play,
  Pause,
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Download,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { annotateAudio, refineAnnotation } from "./services/geminiService";


import { Button, Input, Header, SectionContainer } from "./components/BrandSystem";
import { automaticallyHumanize } from "./services/humanizerService";
import { musicProseFields } from "../shared/musicHumanizer";
import { DescriptionRevision } from "./components/DescriptionRevision";
import { MusicHumanizer } from "./components/MusicHumanizer";
import { GuidanceDialog } from "./components/GuidanceDialog";
import { MusicPlayer, formatTime } from "./components/MusicPlayer";

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CopyBadge = memo(({
  text,
  label,
  className,
  onCopyError,
}: {
  text: string;
  label: string;
  className?: string;
  onCopyError: (message: string) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); } catch { onCopyError("Copy failed. Select and copy the annotation manually."); return; }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      onClick={handleCopy}
      aria-label={label.toLowerCase().startsWith("copy ") ? label : `Copy ${label.toLowerCase()}`}
      title={copied ? "Copied" : label.toLowerCase().startsWith("copy ") ? label : `Copy ${label.toLowerCase()}`}
      className={cn(
        "copy-button",
        copied
          ? "bg-green-500/20 text-green-500 border border-green-500/30"
          : "bg-bg-card text-dim border border-border-dim hover:border-accent/40 hover:text-accent",
        className,
      )}
    >
      {copied ? (
        <CheckCircle2 className="w-2 h-2" />
      ) : (
        <Copy className="w-2 h-2" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
});

const AnnotationMarkdown = memo(({ text }: { text: string }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
));

function ResearchContext({ research }: { research?: ResearchReport }) {
  if (!research) return <aside className="research-panel"><h3>Google Search context</h3><p className="small muted">This saved annotation has no research record. Analyze the track again to add sources.</p></aside>;
  const status = research.status === 'grounded' ? 'Sources found' : research.status === 'unverified' ? 'Needs verification' : 'Search unavailable';
  return <aside className="research-panel" aria-label="Google Search research">
    <div className="section-heading"><div><span className="section-eyebrow">Supporting evidence</span><h3>Google Search context</h3></div><span className={`research-status research-status--${research.status}`}>{status}</span></div>
    <p className="research-message">{research.message}</p>
    {research.summary && <details className="research-findings"><summary>Read research findings</summary><div className="markdown-body research-summary"><AnnotationMarkdown text={research.summary} /></div></details>}
    {research.sources.length > 0 && <ol className="research-sources">{research.sources.map(source => <li key={`${source.id}-${source.url}`}><a href={source.url} target="_blank" rel="noopener noreferrer"><span className="source-number">{source.id}</span><span>{source.title}</span><ChevronRight size={16} aria-hidden="true"/></a></li>)}</ol>}
    {research.queries.length > 0 && <details className="research-queries"><summary>Search queries</summary><ul>{research.queries.map((query, i) => <li key={i}>{query}</li>)}</ul></details>}
    {research.searchEntryPoint && <iframe title="Google Search suggestions" className="google-search-suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; form-action 'none'"><base target="_blank"><style>body{margin:0;padding:4px;background:transparent;color:#dce6f7;font:14px system-ui}a{color:#8ab0ff}</style></head><body>${research.searchEntryPoint}</body></html>`}/>}
    <p className="field-hint">Sources support the generated song context. Review manual edits against those sources and verify recording-specific details by listening.</p>
  </aside>;
}

const IMPORTED_TRACK_NOTE = "Audio imported. Analyze this track to generate its annotation.";

export default function App() {
  const [manualMode,setManualMode]=useState(false);
  const [manualMarks,setManualMarks]=useState<{id:number;times:number[]}>({id:0,times:[]});
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try { const stored = localStorage.getItem('aces_music_model'); return isModelId(stored) ? stored : DEFAULT_MODEL; }
    catch { return DEFAULT_MODEL; }
  });
  const [view, setView] = useState<'workspace' | 'guidelines' | 'archive'>('workspace');
  const [archive, setArchive] = useState<Array<{id: string; name: string; text: string; date: string; audioPath?: string; expiresAt?: number; sourceUrl?: string; duration?: number}>>(() => {
    try { return JSON.parse(localStorage.getItem('aces_music_archive_v1') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    const expiration = (item: typeof archive[number]) =>
      item.expiresAt ?? importedAudioExpiresAt(item.date);
    const discardExpired = () => {
      const now = Date.now();
      const active = archive.flatMap(item => {
        if (!item.audioPath || !(expiration(item) <= now)) return [item];
        return item.text === IMPORTED_TRACK_NOTE ? [] : [{ ...item, audioPath: undefined }];
      });
      if (active.length !== archive.length || active.some((item, index) => item !== archive[index])) {
        setArchive(active);
        try { localStorage.setItem('aces_music_archive_v1', JSON.stringify(active)); } catch {}
      }
    };
    const nextExpiry = Math.min(...archive.filter(item => item.audioPath).map(expiration));
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(discardExpired, Math.min(2_147_483_647, Math.max(0, nextExpiry - Date.now())));
    return () => window.clearTimeout(timer);
  }, [archive]);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(data => setServiceReady(data.ready)).catch(() => setServiceReady(false)); }, []);
  const importedSource = useRef<{path:string;sourceUrl:string;expiresAt?:number} | null>(null);
  const [spotifyLink,setSpotifyLink]=useState('');
  const [importing,setImporting]=useState(false);
  const [importProgress,setImportProgress]=useState<{stage:string;percent:number|null}>({stage:'Preparing import',percent:null});
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const deletedAudioPaths=useRef(new Set<string>());
  const saveAnnotation = useCallback((text: string, audioFile: File | null, audioDuration: number) => {
    const next = [{id: crypto.randomUUID(), name: audioFile?.name || 'Untitled annotation', text, date: new Date().toISOString(), duration:audioDuration, audioPath:importedSource.current?.path, expiresAt:importedSource.current?.expiresAt, sourceUrl:importedSource.current?.sourceUrl}, ...archive.filter(item => item.text !== IMPORTED_TRACK_NOTE || !deletedAudioPaths.current.has(item.audioPath || ''))
      .map(item=>deletedAudioPaths.current.has(item.audioPath||'')?{...item,audioPath:undefined}:item)].slice(0, 30);
    try { localStorage.setItem('aces_music_archive_v1', JSON.stringify(next)); setArchive(next); }
    catch { setError('Analysis completed, but this browser could not save the archive. Download your result.'); }
  }, [archive]);
  const [file, setFile] = useState<File | null>(null);
  const [splitMarkers, setSplitMarkers] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<"form" | "raw">("form");
  const [sections, setSections] = useState<AnnotationSection[]>([]);
  const [activeSegment, setActiveSegment] = useState<{
    start: number;
    end: number | null;
    index: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSimplified, setIsSimplified] = useState(false);
  const [isHighAccuracy, setIsHighAccuracy] = useState(false);
  const [guidanceDialog, setGuidanceDialog] = useState<"form" | "confirm" | null>(null);

  const [creativeGuidance, setCreativeGuidance] = useState("");

  const [generalGuidance, setGeneralGuidance] = useState("");
  const [accurateData, setAccurateData] = useState({
    segmentsCount: "",
    timestamps: "",
    instruments: "",
    vocals: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [humanizationNotice, setHumanizationNotice] = useState("");
  const proseFields = useMemo(()=>musicProseFields(result || ""),[result]);
  const { annotation: annotationText, research, audioQaIncomplete } = useMemo(() => splitResearch(result || ""), [result]);
  const [globalMetadata, setGlobalMetadata] = useState<GlobalMetadata>({});
  const [credits, setCredits] = useState<number>(() => {
    const getLast8AMPHT = () => {
      const now = new Date();
      // 8 AM PHT is exactly 00:00 UTC
      const lastMidnightUTC = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      return lastMidnightUTC.getTime();
    };

    const lastReset = localStorage.getItem("j2_last_reset");
    const currentLast8AM = getLast8AMPHT();

    if (!lastReset || parseInt(lastReset, 10) < currentLast8AM) {
      localStorage.setItem("j2_last_reset", currentLast8AM.toString());
      localStorage.setItem("j2_credits_v3", "1000");
      return 1000;
    }

    const saved = localStorage.getItem("j2_credits_v3");
    if (saved !== null) return parseInt(saved, 10);

    // Check old credits to potentially migrate, or just start at 1000
    const oldSaved =
      localStorage.getItem("j2_credits_v2") ||
      localStorage.getItem("j2_credits");
    const oldAmount = oldSaved !== null ? parseInt(oldSaved, 10) : 1000;
    return oldAmount > 1000 ? oldAmount : 1000;
  });

  useEffect(() => {
    localStorage.setItem("j2_credits_v3", credits.toString());
  }, [credits]);

  const GENERATE_COST = 10;
  const REFINE_COST = 5;

  const [userFeedback, setUserFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('Preparing audio');
  useEffect(() => {
    const update = (event: Event) => setAnalysisStage((event as CustomEvent<string>).detail);
    window.addEventListener('analysis-progress',update);
    return () => window.removeEventListener('analysis-progress',update);
  }, []);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!isProcessing && !isRefining) return;
    const start = Date.now();
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now()-start)/1000)),1000);
    return () => window.clearInterval(timer);
  }, [isProcessing, isRefining]);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const parseSections = useCallback((text: string) => {
    const parsed = parseAnnotation(text);
    setSections(parsed.sections);
    setGlobalMetadata(parsed.globalMetadata);
  }, []);

  const handleToggleEditing = () => {
    setHumanizationNotice("");
    if (isEditing) {
      const text = editTab === "raw"
        ? result || ""
        : serializeAnnotation(sections, globalMetadata, research, audioQaIncomplete);
      setResult(text);
      parseSections(text);
      saveAnnotation(text, file, duration);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    importedSource.current=null;
    if (
      selectedFile.type.startsWith("audio/") ||
      selectedFile.name.endsWith(".mp3") ||
      selectedFile.name.endsWith(".wav")
    ) {
      audioRef.current?.pause();
      setCurrentTime(0); setDuration(0); setIsPlaying(false); setActiveSegment(null);
      setFile(selectedFile);
      setSplitMarkers([]);
      setAudioUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setSections([]);
      setError(null);
    } else {
      setError("Please upload a valid audio file (MP3, WAV, etc.)");
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio(
      "https://actions.google.com/sounds/v1/alarms/bell_chime_medium.ogg",
    );
    audio.play().catch((e) => console.log("Failed to play audio:", e));
  };

  const handleResetCredits = () => {
    setCredits(1000);
    localStorage.setItem("j2_credits_v3", "1000");
    playNotificationSound();
  };

  const compileCreativeGuidance = () => {
    const items = [];
    if (generalGuidance.trim()) {
      items.push(`- General Creative/Aesthetic Guidance: ${generalGuidance.trim()}`);
    }
    if (accurateData.segmentsCount.trim()) {
      items.push(`- Total Segments: ${accurateData.segmentsCount.trim()}`);
    }
    if (accurateData.timestamps.trim()) {
      items.push(`- Timestamps: ${accurateData.timestamps.trim()}`);
    }
    if (accurateData.instruments.trim()) {
      items.push(`- Instruments Used: ${accurateData.instruments.trim()}`);
    }
    if (accurateData.vocals.trim()) {
      items.push(`- Audible vocal qualities: ${accurateData.vocals.trim()}`);
    }
    return items.join("\n");
  };

  const hasGuidance = Boolean(generalGuidance.trim() || Object.values(accurateData).some(value => value.trim()));
  const canAnalyze = Boolean(file && !importing && !isProcessing && !isRefining && !isHumanizing && serviceReady === true);

  const handleProcess = async (allowEmptyGuidance = false) => {
    if (!file || !canAnalyze) return;
    if (credits < GENERATE_COST) {
      setError(
        "Insufficient credits. You need 10 credits for a new generation.",
      );
      return;
    }

    const compiledGuidance = compileCreativeGuidance();
    if (!compiledGuidance && !allowEmptyGuidance) {
      setGuidanceDialog("confirm");
      return;
    }

    setGuidanceDialog(null);
    setCreativeGuidance(compiledGuidance);

    setIsProcessing(true);
    setIsEditing(false);
    setUserFeedback("");
    setError(null);
    try {
      setHumanizationNotice("");
      const draft = await annotateAudio(
        file,
        isSimplified,
        isHighAccuracy,
        compiledGuidance,
        duration,
        selectedModel,
      );
      saveAnnotation(draft, file, duration); // Keep a completed draft if the page closes during the wording pass.
      setAnalysisStage("Humanizing wording");
      const polished = await automaticallyHumanize(draft,selectedModel);
      const annotation = polished.text;
      setHumanizationNotice(polished.notice);
      setCredits((prev) => prev - GENERATE_COST);
      setResult(annotation);
      const savedPath=importedSource.current?.path;
      if(savedPath){
        try{
          const cleanup=await fetch('/api/audio?path='+encodeURIComponent(savedPath),{method:'DELETE'});
          if(!cleanup.ok)throw new Error('cleanup');
          importedSource.current=null;
          deletedAudioPaths.current.add(savedPath);
        }catch{setError('Annotation completed, but stored audio cleanup failed. Analyze again to retry cleanup.');}
      }
      saveAnnotation(annotation, file, duration);
      parseSections(annotation);
      playNotificationSound();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadStoredAudio = async (path:string,name:string) => {
    const response=await fetch('/api/audio?path='+encodeURIComponent(path));
    if (response.status === 410 || response.status === 404) throw new Error('This imported audio is no longer available. Import the track again.');
    if (!response.ok) throw new Error('Could not load the saved audio.');
    const expiresAt = Date.parse(response.headers.get('X-Audio-Expires-At') ?? '');
    return { file: new File([await response.blob()], name, { type: 'audio/mpeg' }), expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined };
  };
  const importSpotify = async () => {
    if (!spotifyLink.trim() || !rightsConfirmed || importing || isProcessing || isRefining || isHumanizing) return;
    setImporting(true);setImportProgress({stage:'Connecting to downloader',percent:null});setError(null);setView('workspace');
    try {
      const response=await fetch('/api/spotify',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/x-ndjson'},body:JSON.stringify({url:spotifyLink.trim(),rightsConfirmed}),signal:AbortSignal.timeout(290000)});
      if(!response.ok){const error=await response.json();throw new Error(error.error||'Music import failed.');}
      if(!response.body)throw new Error('Download connection was interrupted.');
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
      let data:{path:string;name:string;sourceUrl:string}|undefined;
      while(true){
        const chunk=await reader.read();buffer+=decoder.decode(chunk.value,{stream:!chunk.done});
        const lines=buffer.split('\n');buffer=lines.pop()||'';
        for(const line of lines){
          if(!line.trim())continue;const event=JSON.parse(line);
          if(event.type==='error')throw new Error(event.error||'Music import failed.');
          if(event.type==='progress')setImportProgress({stage:event.stage,percent:event.percent??null});
          if(event.type==='result')data=event;
        }
        if(chunk.done)break;
      }
      if(!data?.path)throw new Error('Download connection ended before completion. Please retry.');
      setImportProgress({stage:'Loading audio into player',percent:null});
      const { file: downloaded, expiresAt } = await loadStoredAudio(data.path, data.name);
      const trackDuration=await new Promise<number>((resolve,reject)=>{
        const audio=new Audio();const url=URL.createObjectURL(downloaded);
        const cleanup=()=>{clearTimeout(timer);audio.removeAttribute('src');URL.revokeObjectURL(url);};
        const timer=setTimeout(()=>{cleanup();reject(new Error('Could not read imported audio duration.'));},15000);
        audio.onloadedmetadata=()=>{const value=audio.duration;cleanup();Number.isFinite(value)&&value>0?resolve(value):reject(new Error('Invalid imported duration.'));};
        audio.onerror=()=>{cleanup();reject(new Error('The downloaded recording could not be played.'));};audio.src=url;
      });
      handleFileSelection(downloaded);importedSource.current={path:data.path,sourceUrl:data.sourceUrl,expiresAt};
      setDuration(trackDuration);
      saveAnnotation(IMPORTED_TRACK_NOTE, downloaded, trackDuration);
      setSpotifyLink('');
      setRightsConfirmed(false);
    }catch(error){setError(error instanceof Error?error.message:'Music import failed.');}
    finally{setImporting(false);}
  };
  const openSaved = async (item:typeof archive[number]) => {
    if(isProcessing || isRefining || isHumanizing || importing)return;
    setHumanizationNotice('');
    try {
      if (item.audioPath) {
        const audio = await loadStoredAudio(item.audioPath, item.name);
        handleFileSelection(audio.file);
        importedSource.current = { path: item.audioPath, sourceUrl: item.sourceUrl || '', expiresAt: audio.expiresAt };
      }
      else {audioRef.current?.pause();setFile(null);setAudioUrl(null);importedSource.current=null;setDuration(item.duration||0);setSections([]);}
      if (item.text === IMPORTED_TRACK_NOTE) {
        setResult(null);
        setSections([]);
      } else {
        setResult(item.text);
        parseSections(item.text);
      }
      setView('workspace');setError(null);
    }catch(error){setError(error instanceof Error?error.message:'Could not open saved audio.');}
  };

  const applyWordingResult = useCallback((text:string) => {
    setHumanizationNotice("");
    setResult(text);parseSections(text);saveAnnotation(text, file, duration);
  }, [parseSections, saveAnnotation, file, duration]);

  const handleRefine = async () => {
    if (!file || !result || !userFeedback.trim() || isProcessing || isRefining || isHumanizing) return;
    if (credits < REFINE_COST) {
      setError("Insufficient credits. You need 5 credits for refinement.");
      return;
    }

    setIsRefining(true);
    setError(null);
    try {
      setHumanizationNotice("");
      const draft = await refineAnnotation(
        file,
        result,
        userFeedback,
        isSimplified,
        isHighAccuracy,
        creativeGuidance,
        duration,
        selectedModel,
      );
      saveAnnotation(draft, file, duration); // Keep a completed draft if the page closes during the wording pass.
      setAnalysisStage("Humanizing wording");
      const polished = await automaticallyHumanize(draft,selectedModel);
      const refinedAnnotation = polished.text;
      setHumanizationNotice(polished.notice);
      setCredits((prev) => prev - REFINE_COST);
      setResult(refinedAnnotation);
      saveAnnotation(refinedAnnotation, file, duration);
      parseSections(refinedAnnotation);
      setUserFeedback("");
      playNotificationSound();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Refinement failed. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const reset = () => {
    importedSource.current = null;
    audioRef.current?.pause();
    setCurrentTime(0); setDuration(0); setIsPlaying(false); setActiveSegment(null);
    setFile(null);
    setSplitMarkers([]);
    setAudioUrl(null);
    setResult(null);
    setSections([]);
    setError(null);
    setIsProcessing(false);
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.replace(/[\[\]]/g, "").split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  };

  const seekAndPlaySegment = useCallback((index: number) => {
    if (audioRef.current) {
      const currentSection = sections[index];
      const nextSection = sections[index + 1];

      const start = parseTimeToSeconds(currentSection.startTime);
      const end = nextSection
        ? parseTimeToSeconds(nextSection.startTime)
        : null;

      // If we are already playing this segment, toggle pause
      if (activeSegment?.index === index && !audioRef.current.paused) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = start;
        setActiveSegment({ start, end, index });
        audioRef.current.play().catch(() => setError("Playback could not start. Try another audio file."));
      }
    }
  }, [sections, activeSegment?.index]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (activeSegment && activeSegment.end !== null) {
        if (audioRef.current.currentTime >= activeSegment.end) {
          audioRef.current.pause();
          setActiveSegment(null);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const seekTo = (time: number) => {
    if(!audioRef.current || !Number.isFinite(duration)) return;
    const next = Math.max(0,Math.min(duration,time));
    audioRef.current.currentTime=next; setCurrentTime(next); setActiveSegment(null);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setError("Playback could not start. Try another audio file."));
      }
    }
  };



  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioUrl]);




  const revisionBusy = isProcessing || isRefining || isHumanizing || importing;
  const matrixView = useMemo(() => result && !isEditing ? (
    <div className="matrix-section">
      <div className="section-heading">
        <h2 className="text-xs uppercase tracking-wide text-accent font-bold mb-0">
          Global Musical Matrix
        </h2>
        <CopyBadge onCopyError={setError}
          text={JSON.stringify(globalMetadata, null, 2)}
          label="Copy JSON"
        />
      </div>

      <div className="matrix-grid">
        {[
          {
            category: "Genre, Era & Scene",
            tags: globalMetadata.genreEraSceneTags,
            desc: globalMetadata.genreEraScene,
            id: "genreEraScene",
          },
          {
            category: "Tempo, Rhythm & Groove",
            tags: globalMetadata.tempoRhythmGrooveTags,
            desc: globalMetadata.tempoRhythmGroove,
            id: "tempoRhythmGroove",
          },
          {
            category: "Harmony, Chords & Key",
            tags: globalMetadata.harmonyChordsKeyTags,
            desc: globalMetadata.harmonyChordsKey,
            id: "harmonyChordsKey",
          },
          {
            category: "Instrumentation",
            tags: globalMetadata.instrumentationTags,
            desc: globalMetadata.instrumentation,
            id: "instrumentation",
          },
          {
            category: "Playing Style",
            tags: globalMetadata.playingStyleTags,
            desc: globalMetadata.playingStyle,
            id: "playingStyle",
          },
          {
            category: "Wow Factor",
            tags: globalMetadata.wowFactorTags,
            desc: globalMetadata.wowFactor,
            id: "wowFactor",
          },
          {
            category: "Emotion, Vibe & Setting",
            tags: globalMetadata.emotionVibeSettingTags,
            desc: globalMetadata.emotionVibeSetting,
            id: "emotionVibeSetting",
          },
          {
            category: "Mix & Production",
            tags: globalMetadata.mixTags,
            desc: globalMetadata.mix,
            id: "mix",
          },
          {
            category: "Sonic Fidelity",
            tags: globalMetadata.fidelityTags,
            desc: globalMetadata.fidelity,
            id: "fidelity",
          },
          {
            category: "Vocal Expression",
            tags: globalMetadata.vocalTags,
            desc: globalMetadata.vocal,
            id: "vocal",
          },
          {
            category: "Lyrical Evocation",
            tags: globalMetadata.lyricsTags,
            desc: globalMetadata.lyrics,
            id: "lyrics",
          },
        ].map(
          (item) =>
            (item.tags || item.desc) && (
              <div
                key={item.id}
                className="matrix-card"
              >
                <div className="flex justify-between items-center mb-1 pb-1 border-b border-border-dim">
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
                    {item.category}
                  </h4>
                </div>

                {item.tags && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-[0.15em] text-primary">
                        Tags
                      </span>
                      <CopyBadge onCopyError={setError}
                        text={item.tags}
                        label="Tags"
                        className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-bg-main text-sm px-2 py-0.5"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag, i) => (
                          <span
                            key={i}
                            className="text-sm font-mono font-bold tracking-tight bg-accent/5 hover:bg-accent/10 text-accent/80 border border-accent/25 px-2 py-0.5 rounded-full transition-colors uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {item.desc && (
                  <div className={cn("space-y-2", item.tags ? "mt-3 border-t border-white/[0.03] pt-3" : "")}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-[0.15em] text-primary">
                        Description
                      </span>
                      <CopyBadge onCopyError={setError}
                        text={item.desc}
                        label="Description"
                        className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-bg-main text-sm px-2 py-0.5"
                      />
                    </div>
                    <div className="text-xs text-primary font-medium leading-relaxed markdown-body mt-1">
                      <AnnotationMarkdown text={item.desc} />
                    </div>
                    <DescriptionRevision source={result} fieldId={proseFields.find(field=>field.label===item.category)?.id} label={item.category} model={selectedModel} disabled={revisionBusy} onBusy={setIsHumanizing} onApply={applyWordingResult} />
                  </div>
                )}
              </div>
            ),
        )}
      </div>
    </div>
  ) : null, [result, isEditing, globalMetadata, proseFields, selectedModel, revisionBusy, applyWordingResult]);

  const timelineView = useMemo(() => result && !isEditing && (
    sections.length > 0 && (
      <div className="space-y-4">
        <div className="section-heading">
          <h2 className="text-xs uppercase tracking-wide text-accent font-bold mb-0 flex items-center gap-4">
            Timeline Segmentation
          </h2>
          <div className="section-actions">
            <CopyBadge onCopyError={setError}
              text={sections
                .map(
                  (s) =>
                    `[${s.startTime}] ${s.type}: ${s.description}`,
                )
                .join("\n")}
              label="Copy All Segments"
            />
            <span className="text-sm font-mono text-dim uppercase tracking-widest">
              {sections.length} segments
            </span>
          </div>
        </div>
        <div className="grid gap-3">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="segment-card group"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="mono text-sm text-accent font-bold mb-1">
                  {section.startTime}
                </span>
                <Button
                  aria-label={`${activeSegment?.index === idx && isPlaying ? "Pause" : "Play"} segment ${idx + 1}`}
                  disabled={!audioUrl}
                  onClick={() => seekAndPlaySegment(idx)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 active:scale-95",
                    activeSegment?.index === idx && isPlaying
                      ? "bg-accent text-bg-main"
                      : "bg-accent/10 text-accent hover:bg-accent hover:text-bg-main",
                  )}
                >
                  {activeSegment?.index === idx &&
                  isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                </Button>
              </div>
              <div className="segment-body space-y-2">
                <div className="segment-heading">
                  <div className="segment-title">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
                      {section.type}
                    </h4>
                    {section.isUnsure && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent/5 border border-accent/25 text-accent text-sm font-bold uppercase tracking-widest animate-pulse">
                        <AlertCircle className="w-2.5 h-2.5" />{" "}
                        Identity uncertain
                      </div>
                    )}
                    {(() => {
                      const startSec = parseTimeToSeconds(
                        section.startTime,
                      );
                      const nextSec = sections[idx + 1]
                        ? parseTimeToSeconds(
                            sections[idx + 1].startTime,
                          )
                        : duration;
                      const segmentDuration =
                        nextSec > startSec
                          ? nextSec - startSec
                          : 0;
                      if (segmentDuration > 50) {
                        return (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold uppercase tracking-widest animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />{" "}
                            LONG SEGMENT PLEASE SPLIT
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {section.vibe && (
                    <span className="text-sm px-2 py-0.5 rounded bg-accent/10 text-accent/80 border border-accent/20">
                      {section.vibe}
                    </span>
                  )}
                </div>
                <p className="text-xs text-primary leading-relaxed font-medium">
                  {section.description}
                </p>
                <DescriptionRevision source={result} fieldId={proseFields.find(field=>field.label===`Section ${idx+1}: Narrative Description` || field.label===`Section ${idx+1}: Description`)?.id} label={`Segment ${idx+1} at ${section.startTime}`} model={selectedModel} disabled={revisionBusy} onBusy={setIsHumanizing} onApply={applyWordingResult} />
                {section.melody && (
                  <div className="bg-bg-card p-3 rounded border-l-2 border-accent/20 relative group/melody">
                    <p className="text-sm uppercase text-accent/60 font-bold mb-1 tracking-wider">
                      Melody
                    </p>
                    <p className="text-sm text-primary italic">
                      {section.melody}
                    </p>
                  </div>
                )}
                <div className="pt-2 flex flex-wrap gap-2 items-center">
                  {section.instruments
                    .split(",")
                    .filter((inst: string) => inst.trim())
                    .map((inst: string, i: number) => {
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1"
                        >
                          <span className="text-sm text-dim uppercase tracking-tighter border border-border-dim px-1.5 py-0.5 rounded bg-bg-card">
                            {inst.trim()}
                          </span>
                        </div>
                      );
                    })}
                </div>

                <div className="pt-3 mt-3 border-t border-border-dim flex flex-wrap gap-2 items-center">
                  <span className="text-sm uppercase tracking-widest text-primary font-bold mr-1">
                    Copy:
                  </span>
                  <CopyBadge onCopyError={setError}
                    text={section.startTime}
                    label="Time"
                  />
                  <CopyBadge onCopyError={setError}
                    text={section.description}
                    label="Description"
                  />
                  <CopyBadge onCopyError={setError}
                    text={
                      section.instruments.endsWith(",")
                        ? section.instruments
                        : `${section.instruments}${section.instruments ? "," : ""}`
                    }
                    label="Instruments"
                  />
                  {section.vibe && (
                    <CopyBadge onCopyError={setError}
                      text={section.vibe}
                      label="Vibe"
                    />
                  )}
                  {section.melody && (
                    <CopyBadge onCopyError={setError}
                      text={section.melody}
                      label="Melody"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  ), [result, isEditing, sections, duration, activeSegment?.index, isPlaying, audioUrl,
      seekAndPlaySegment, proseFields, selectedModel, revisionBusy, applyWordingResult]);

  return (
    <div className="app-shell">
      <Header view={view} onNavigate={setView} />
      <div className="page-title"><h1>{view === 'workspace' ? 'Studio' : view === 'archive' ? 'Library' : 'Guide'}</h1>{view === 'workspace' && <span className="small muted">{sections.length ? `${sections.length} segments` : 'Music annotation'}</span>}</div>
      {serviceReady === false && <details className="service-notice"><summary><span className="status-dot"/> AI offline <span className="muted">Setup required</span></summary><p>In Vercel → j2beat → Settings → Environment Variables, set GEMINI_API_KEY and/or OPENROUTER_API_KEY with OPENROUTER_MODEL (an audio-input model). Your selected model is tried first, followed by the other Gemini models and the configured OpenRouter model if needed. Redeploy to apply. Keys remain server-side.</p></details>}
      {error && <div role="alert" className="error-notice">{error}</div>}
      {view === "guidelines" && (
        <SectionContainer className="document-view">
          <h2>How to annotate a track</h2>
          <ol className="list-decimal space-y-6 pl-6 marker:font-bold marker:text-accent">
            <li className="space-y-2 pl-2">
              <h3>Add the track</h3>
              <p className="muted">
                In <strong>Studio</strong>, select <strong>Upload audio</strong> to choose a file, or select{" "}
                <strong>Import from Spotify</strong>, paste the track link, confirm permission, and click{" "}
                <strong>Import track</strong>. Play the imported audio to check that it’s the right version.
              </p>
            </li>
            <li className="space-y-2 pl-2">
              <h3>Mark section starts and add guidance</h3>
              <p className="muted">
                Listen and seek on the waveform. Click <strong>Mark split</strong> at the start of each new
                musical section. When you’re done, click <strong>Use in specific timestamps</strong> to copy the
                markers into <strong>Timestamps to check</strong>. The app adds <strong>0:00</strong> for you.
              </p>
              <p className="muted">
                List the instruments you can hear in <strong>Instruments to verify</strong>. Use{" "}
                <strong>Song details and listening notes</strong> to say where they enter, if you know.
                Click <strong>Save guidance</strong>, then <strong>Analyze track</strong>.
              </p>
            </li>
            <li className="space-y-2 pl-2">
              <h3>Review and correct the AI draft</h3>
              <p className="muted">
                Replay each section and check the start time, section label, instrument tags, and description
                against the audio. Under <strong>Refine the annotation</strong>, enter the timestamp and what
                should change in <strong>Correction instructions</strong>, then click <strong>Apply Correction</strong>.
              </p>
              <p className="muted">
                Example: “The chorus starts at 0:42, and a shaker enters at 0:47.” Check the revised draft
                against the track before copying or exporting it.
              </p>
            </li>
          </ol>
          <Button className="mt-6" variant="primary" onClick={() => setView("workspace")}>Open Studio</Button>
        </SectionContainer>
      )}
      {view === 'archive' && <SectionContainer className="document-view"><p className="eyebrow"></p><h2>Saved annotations</h2><p>Annotations are saved in this browser. Unannotated imports expire after 24 hours. Successful analysis removes the stored audio and keeps the annotation.</p>{archive.length === 0 ? <p className="archive-empty">No saved annotations yet.</p> : archive.map(item => <article className="archive-row" key={item.id}><div><h3>{item.name}</h3><p>{new Date(item.date).toLocaleString()}</p>{item.audioPath && item.text === IMPORTED_TRACK_NOTE && <p>Expires {new Date(item.expiresAt ?? importedAudioExpiresAt(item.date)).toLocaleString()}</p>}</div><div className="archive-actions"><Button disabled={isProcessing||isRefining||isHumanizing||importing} onClick={()=>openSaved(item)}><FileAudio />{item.audioPath?'Open & play':'Open annotation'}</Button>{item.text !== IMPORTED_TRACK_NOTE && <Button onClick={async()=>{try{(await import('./utils/pdfGenerator')).exportSavedPDF(item.name,item.text,item.date);}catch{setError('PDF export failed. Please retry.');}}}><Download/>Export PDF</Button>}{item.audioPath&&<a className="aces-button aces-button--secondary" href={'/api/audio?path='+encodeURIComponent(item.audioPath)} download={item.name}>Download audio</a>}</div></article>)}</SectionContainer>}
      {(isProcessing || isRefining) && <section className="analysis-progress-panel" aria-label="Annotation progress">
        <div className="analysis-progress-heading"><div><span className="analysis-pulse"/><strong>{isRefining ? 'Refining annotation' : 'Analyzing track'}</strong></div><time>{Math.floor(elapsedSeconds/60)}:{String(elapsedSeconds%60).padStart(2,'0')}</time></div>
        <p role="status" aria-live="polite">{analysisStage}</p>
        <div className="analysis-stage-track" aria-label="Processing stages">{['Upload','Analyze','Research','Write','Review','Humanize'].map((label,i)=>{const stage=/Humanizing/i.test(analysisStage)?5:/Reviewing/i.test(analysisStage)?4:/Writing|Repairing/i.test(analysisStage)?3:/Searching/i.test(analysisStage)?2:/Analyzing|Retrying|Preparing AI|Rechecking/i.test(analysisStage)?1:0;return <span key={label} className={i<stage?'complete':i===stage?'active':''}>{i<stage?'✓':i+1} {label}</span>;})}</div>
        <div className="analysis-meter" role="progressbar" aria-label="Current operation" aria-valuenow={/Uploading audio.*%/.test(analysisStage)?Number(analysisStage.match(/(\d+)%/)?.[1]):undefined} aria-valuemin={0} aria-valuemax={100} aria-valuetext={analysisStage}><span className={/Uploading audio.*%/.test(analysisStage)?'determinate':'indeterminate'} style={/Uploading audio.*%/.test(analysisStage)?{width:`${analysisStage.match(/(\d+)%/)?.[1]}%`}:undefined}/></div>
        <small>{elapsedSeconds>90?'Taking longer than usual. Progress and retries appear above.':'You can listen, seek, and loop while the annotation runs.'} Analysis may take several minutes, followed by the automatic wording pass.</small>
      </section>}
      {view === 'workspace' && <section className="annotation-mode-picker" aria-label="Choose annotation mode">
        <button type="button" aria-pressed={!manualMode} disabled={isProcessing||isRefining||isHumanizing} onClick={()=>setManualMode(false)}><span className="mode-icon">✦</span><strong>Automatic annotation</strong><span>Upload your audio. AI listens and drafts the full annotation.</span><small>{!manualMode?'Selected':'Choose automatic →'}</small></button>
        <button type="button" aria-pressed={manualMode} disabled={isProcessing||isRefining||isHumanizing} onClick={()=>setManualMode(true)}><span className="mode-icon">✎</span><strong>Manual annotation</strong><span>Mark sections, add listening notes, then let AI complete the draft.</span><small>{manualMode?'Selected':'Choose manual →'}</small></button>
      </section>}
      <div className="player-section" hidden={view !== 'workspace'}>
        <MusicPlayer markersActionLabel={manualMode ? "Use split marks in Manual" : "Use in specific timestamps"} linkImport={
          <form onSubmit={event => { event.preventDefault(); void importSpotify(); }}>
            <label htmlFor="spotify-link">Spotify track link</label>
            <div className="track-link-controls">
              <input id="spotify-link" type="url" value={spotifyLink} placeholder="https://open.spotify.com/track/…" onChange={event => setSpotifyLink(event.target.value)} disabled={importing || isProcessing || isRefining || isHumanizing} required />
              <Button type="submit" disabled={!spotifyLink.trim() || !rightsConfirmed || importing || isProcessing || isRefining || isHumanizing}>{importing ? 'Importing…' : 'Import track'}</Button>
            </div>
            <p className="field-hint">Loads a matched recording into the player. Check the version before analyzing. Unannotated imports expire after 24 hours.</p>
            <label className="import-permission"><input type="checkbox" checked={rightsConfirmed} disabled={importing || isProcessing || isRefining || isHumanizing} onChange={event => setRightsConfirmed(event.target.checked)} />I have permission to download and analyze this recording.</label>
          </form>
        } importStatus={importing && <div className="track-import-status" role="status">
          <p>{importProgress.stage}{importProgress.percent !== null ? ` · ${importProgress.percent}%` : '…'}</p>
          <progress aria-label={importProgress.stage} max={100} value={importProgress.percent ?? undefined} />
        </div>} markers={splitMarkers} onMark={time=>{
          if (!Number.isFinite(time) || !duration || time < 0 || time >= duration) return;
          const second = Math.floor(time);
          setSplitMarkers(previous=>[...new Set([...previous,second])].sort((a,b)=>a-b));
        }} onRemoveMarker={time=>setSplitMarkers(previous=>previous.filter(value=>value!==time))} onClearMarkers={()=>setSplitMarkers([])} onUseMarkers={()=>{
          if(manualMode){setManualMarks(previous=>({id:previous.id+1,times:[...splitMarkers]}));requestAnimationFrame(()=>document.getElementById('manual-annotation')?.scrollIntoView({behavior:'smooth',block:'start'}));return;}
          const times=[...new Set([0,...splitMarkers])].sort((a,b)=>a-b).map(formatTime);
          setAccurateData(previous=>{
            const existing=previous.timestamps.trim();
            const present=new Set(existing.match(/\b\d+:\d{2}\b/g) || []);
            const added=times.filter(time=>!present.has(time));
            return {...previous,timestamps:existing+(existing && added.length ? ', ' : '')+added.join(', ')};
          });
          setGuidanceDialog("form");
        }} file={file} audioUrl={audioUrl} audioRef={audioRef} currentTime={currentTime} duration={duration} isPlaying={isPlaying} volume={volume} onFile={handleFileSelection} onSeek={seekTo} onToggle={togglePlay} onVolume={setVolume} onReset={reset} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onPlaying={setIsPlaying} onError={setError} segments={sections} busy={isProcessing || isRefining || isHumanizing || importing}/>
      </div>
      <div hidden={!manualMode || view !== 'workspace'}><ManualMode marksRequest={manualMarks} file={file} duration={duration} currentTime={currentTime} onSeek={seekTo} onBusy={setIsProcessing} onComplete={text=>{applyWordingResult(text);setManualMode(false);}}/></div>
      <main id="workspace" hidden={manualMode || view !== "workspace"} className="studio-grid">
        <section className="settings-panel" aria-labelledby="analysis-settings-title">
          <div className="settings-heading"><span className="section-eyebrow">Configure</span><h2 id="analysis-settings-title">Analysis settings</h2><p className="small muted">Choose how to describe this recording.</p></div>
          <div className="settings-field">
            <label className="field-label" htmlFor="model-select">Model</label>
            <select id="model-select" value={selectedModel} disabled={isProcessing || isRefining || isHumanizing} onChange={e=>{
              if (isModelId(e.target.value)) { setSelectedModel(e.target.value); try { localStorage.setItem('aces_music_model',e.target.value); } catch {} }
            }}>{MODEL_OPTIONS.map(model=><option key={model.id} value={model.id}>{model.label}{model.id===DEFAULT_MODEL?' (default)':''}</option>)}</select>
            <p className="field-hint">Automatic fallback enabled.</p>
          </div>
          <p className="field-hint">Natural writing is automatic. Each segment uses fresh phrasing based on its musical details.</p>
          <div className="settings-options">
            <label className="toggle-row"><span>Simple language</span><input type="checkbox" checked={isSimplified} onChange={e=>setIsSimplified(e.target.checked)}/></label>
            <label className="toggle-row"><span>Detailed segmentation</span><input type="checkbox" checked={isHighAccuracy} onChange={e=>setIsHighAccuracy(e.target.checked)}/></label>
          </div>
          <div className="settings-actions">
            <Button className="guidance-button" onClick={()=>setGuidanceDialog("form")}><Settings/>{hasGuidance ? 'Edit guidance' : 'Add guidance'}{hasGuidance && <span className="status-dot"/>}</Button>
            <p className="field-hint">{hasGuidance ? 'English, Tagalog, or Taglish notes will guide the next analysis.' : 'Add timestamps or listening notes in English, Tagalog, or Taglish. The annotation is written in English.'}</p>
            <Button variant="primary" className="generate-button" disabled={!canAnalyze} onClick={() => void handleProcess()}>{isProcessing?<Activity/>:<Play/>}{isProcessing?'Analyzing…':result?'Analyze again':'Analyze track'}</Button>
            <p className="field-hint">Song research uses Google Search. Review sources alongside the audio.</p>
          </div>
          <details className="credit-details"><summary>{credits} local credits</summary><Button variant="text" onClick={handleResetCredits}><RotateCcw/>Reset credits</Button></details>
        </section>

        {/* Right Output Area */}
        <section className="output-column flex flex-col">
          <div className="hardware-card annotation-panel flex-1 flex flex-col overflow-hidden">
            <div className="annotation-toolbar">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                    isProcessing
                      ? "text-accent animate-pulse"
                      : result
                        ? "text-green-500"
                        : "text-dim",
                  )}
                />
                <h3 className="text-sm font-bold tracking-[0.25em] uppercase text-secondary">
                  {isProcessing
                    ? "Analyzing…"
                    : result
                      ? "Annotations"
                      : "Annotations"}
                </h3>
              </div>

              {result && (
                <div className="annotation-actions">
                  <Button
                    onClick={handleToggleEditing}
                    disabled={isHumanizing || isProcessing || isRefining || importing}
                    className={cn(
                      "flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors",
                      isEditing ? "text-accent" : "text-dim hover:text-accent",
                    )}
                  >
                    {isEditing ? "Save changes" : "Edit"}
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(annotationText + researchAsMarkdown(research))}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-dim hover:text-accent transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                  <Button
                    onClick={async () => (await import("./utils/pdfGenerator")).generatePDF(file?.name || "audio_transcription", duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, "0")}` : "0:00", globalMetadata, sections, research)}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-dim hover:text-accent transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export PDF
                  </Button>
                </div>
              )}
            </div>

            <div className="annotation-content flex-1 relative">
              {audioQaIncomplete && !isProcessing && (
                <p className="small muted mb-4" role="status">Draft · audio QA incomplete</p>
              )}
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center space-y-8"
                  >
                    <div className="relative group">
                      <div className="w-20 h-20 border border-border-dim rounded-full flex items-center justify-center bg-bg-main">
                        <Activity className="w-10 h-10 text-accent animate-pulse" />
                      </div>
                      <div className="absolute inset-[-4px] border border-accent/20 rounded-full animate-[spin_4s_linear_infinite]" />
                      <div className="absolute inset-[-8px] border border-accent/5 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
                    </div>
                    <div className="text-center space-y-3">
                      <p className="mono text-sm text-accent tracking-wide uppercase">
                        Structural Parsing In Progress
                      </p>
                      <p className="text-sm text-dim uppercase tracking-wide font-medium">
                        Deconstructing Spectral data
                      </p>
                    </div>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center space-y-4"
                  >
                    <AlertCircle className="w-8 h-8 text-red-500/80 mb-2" />
                    <p className="text-sm uppercase tracking-widest text-red-400 font-bold">
                      {error}
                    </p>
                    <Button
                      onClick={() => setError(null)}
                      className="text-sm uppercase tracking-[0.2em] text-red-400/60 hover:text-red-400 underline underline-offset-4 mt-4"
                    >
                      Dismiss
                    </Button>
                  </motion.div>
                ) : result ? (
                  isEditing ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key="editing"
                      className="h-full flex flex-col space-y-6"
                    >
                      <div className="flex gap-2 border-b border-border-dim pb-4">
                        <Button
                          disabled={isHumanizing}
                          onClick={() => { if (editTab === "raw") parseSections(result || ""); setEditTab("form"); }}
                          className={cn(
                            "px-4 py-2 text-sm font-bold uppercase tracking-widest border transition-all rounded",
                            editTab === "form"
                              ? "bg-accent/10 border-accent/30 text-accent"
                              : "bg-transparent border-border-dim text-dim hover:border-border-dim hover:text-primary"
                          )}
                        >
                          Form Editor
                        </Button>
                        <Button
                          disabled={isHumanizing}
                          onClick={() => {
                            if (editTab === "form") setResult(serializeAnnotation(sections, globalMetadata, research, audioQaIncomplete));
                            setEditTab("raw");
                          }}
                          className={cn(
                            "px-4 py-2 text-sm font-bold uppercase tracking-widest border transition-all rounded",
                            editTab === "raw"
                              ? "bg-accent/10 border-accent/30 text-accent"
                              : "bg-transparent border-border-dim text-dim hover:border-border-dim hover:text-primary"
                          )}
                        >
                          Raw Editor
                        </Button>
                      </div>

                      {editTab === "raw" ? (
                        <div className="flex-1 min-h-[400px]">
                          <textarea
                            aria-label="Raw annotation"
                            value={annotationText}
                            onChange={(e) => setResult(attachResearch(e.target.value, research, audioQaIncomplete))}
                            className="w-full h-full min-h-[400px] bg-transparent text-primary p-0 focus:outline-none mono text-sm resize-none"
                            spellCheck={false}
                          />
                        </div>
                      ) : (
                        <div className="matrix-editor">
                          <h2>Timeline Segmentation</h2>
                          {sections.map((section, index) => (
                            <section className="matrix-editor-card" key={index} aria-label={`Edit segment ${index + 1}`}>
                              <h3>Segment {index + 1}</h3>
                              {([
                                ["startTime", "Start time"], ["type", "Section type"],
                                ["description", "Narrative description"], ["instruments", "Instruments"],
                                ["vibe", "Vibe tags"], ["melody", "Melody"],
                              ] as const).map(([key, label]) => {
                                const change = (value: string) => setSections(previous => previous.map((item, i) => {
                                  if (i !== index) return item;
                                  const next = { ...item, [key]: value };
                                  return { ...next, isUnsure: isSectionUnsure(next.instruments, next.description) };
                                }));
                                const props = {
                                  value: section[key], disabled: revisionBusy,
                                  className: "w-full bg-bg-card border border-border-dim rounded px-4 py-2.5 text-sm",
                                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.target.value),
                                };
                                return (
                                  <div key={key}>
                                    <label className="editor-label block">
                                      {label}
                                      {key === "description" ? <textarea {...props} rows={4} /> : <input {...props} />}
                                    </label>
                                    {key === "description" && (
                                      <DescriptionRevision
                                        source={`- **Start Time:** ${section.startTime}\n- **Narrative Description:** ${section.description}`}
                                        fieldId="f0" label={`Segment ${index + 1} at ${section.startTime}`}
                                        model={selectedModel} disabled={revisionBusy} onBusy={setIsHumanizing}
                                        onApply={text => {
                                          const field = musicProseFields(text)[0];
                                          if (field) change(field.text);
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </section>
                          ))}
                          <h2>Global Musical Matrix</h2>
                          {[
                            {
                              id: "genreEraScene",
                              label: "Genre, Era & Scene",
                              tagKey: "genreEraSceneTags",
                              descKey: "genreEraScene",
                              tagLabel: "Genre, Era & Scene Tags *",
                              descLabel: "Genre, Era & Scene *",
                              tagPlaceholder: "Examples: blues, electric blues, rock, 1990s (comma-separated)",
                              descPlaceholder: "Describe the genre, era or scene, and why...",
                              help: "What style does it sound like? Use familiar genre names. Add an era or scene only when supported."
                            },
                            {
                              id: "tempoRhythmGroove",
                              label: "Tempo, Rhythm & Groove",
                              tagKey: "tempoRhythmGrooveTags",
                              descKey: "tempoRhythmGroove",
                              tagLabel: "Tempo, Rhythm & Groove Tags *",
                              descLabel: "Tempo, Rhythm & Groove *",
                              tagPlaceholder: "Examples: mid-tempo, steady, swing, bouncy, offbeat accents (comma-separated)",
                              descPlaceholder: "Describe the tempo, rhythmic feel, and groove elements in detail...",
                              help: "How fast does it feel? Is the beat steady, bouncy, swung, or uneven? Explain how the bass and drums work together."
                            },
                            {
                              id: "harmonyChordsKey",
                              label: "Harmony, Chords & Key",
                              tagKey: "harmonyChordsKeyTags",
                              descKey: "harmonyChordsKey",
                              tagLabel: "Harmony, Chords & Key Tags *",
                              descLabel: "Harmony, Chords & Key *",
                              tagPlaceholder: "Examples: repeating chords, blues chords, bright, tense (comma-separated)",
                              descPlaceholder: "Describe tonal stability, chord movement, harmonic color, and tension...",
                              help: "Do the chords repeat or change? Do they sound bright, dark, tense, or relaxed? Avoid guessing an exact key or chord sequence."
                            },
                            {
                              id: "instrumentation",
                              label: "Instrumentation",
                              tagKey: "instrumentationTags",
                              descKey: "instrumentation",
                              tagLabel: "Instrumentation Tags *",
                              descLabel: "Instrumentation *",
                              tagPlaceholder: "Examples: guitar, bass, drums, piano, horns (comma-separated)",
                              descPlaceholder: "Describe the role, contributions, and interplay of the instruments...",
                              help: "Name the instruments you can hear, then explain what each one does."
                            },
                            {
                              id: "playingStyle",
                              label: "Playing Style",
                              tagKey: "playingStyleTags",
                              descKey: "playingStyle",
                              tagLabel: "Playing Style Tags *",
                              descLabel: "Playing Style *",
                              tagPlaceholder: "Examples: strumming, picking, bending notes, gentle, loose (comma-separated)",
                              descPlaceholder: "Describe the performance qualities, techniques, or playing styles in detail...",
                              help: "How are the parts played? Listen for strumming, picking, bent notes, gentle playing, or a loose feel."
                            },
                            {
                              id: "wowFactor",
                              label: "Wow Factor",
                              tagKey: "wowFactorTags",
                              descKey: "wowFactor",
                              tagLabel: "Wow Factor Tags *",
                              descLabel: "Wow Factor (Optional)",
                              tagPlaceholder: "Examples: guitar solo, sudden pause, big chorus, spoken part (comma-separated)",
                              descPlaceholder: "Describe any highlights, surprises, or standout elements in detail...",
                              help: "What catches your ear? A solo, sudden pause, unusual sound, or a big chorus? Do not force a highlight."
                            },
                            {
                              id: "emotionVibeSetting",
                              label: "Emotion, Vibe & Setting",
                              tagKey: "emotionVibeSettingTags",
                              descKey: "emotionVibeSetting",
                              tagLabel: "Emotion, Vibe & Setting Tags *",
                              descLabel: "Emotion, Vibe & Setting *",
                              tagPlaceholder: "Examples: happy, sad, energetic, relaxed, nostalgic (comma-separated)",
                              descPlaceholder: "Describe the overall emotional tone, vibe, and ideal listening setting...",
                              help: "How does it feel: happy, sad, energetic, relaxed? What listening setting fits?"
                            },
                            {
                              id: "mix",
                              label: "Mix & Production",
                              tagKey: "mixTags",
                              descKey: "mix",
                              tagLabel: "Mix & Production Tags *",
                              descLabel: "Mix & Production *",
                              tagPlaceholder: "Examples: vocals up front, wide, echo, heavy bass (comma-separated)",
                              descPlaceholder: "Describe the spatial soundstage, panning, effects, and production style...",
                              help: "Which sounds are up front or in the background? Is there echo, heavy bass, or sound spread across both sides?"
                            },
                            {
                              id: "fidelity",
                              label: "Sonic Fidelity",
                              tagKey: "fidelityTags",
                              descKey: "fidelity",
                              tagLabel: "Sonic Fidelity Tags *",
                              descLabel: "Sonic Fidelity *",
                              tagPlaceholder: "Examples: clear, warm, muffled, noisy, distorted (comma-separated)",
                              descPlaceholder: "Describe the audio quality, fidelity characteristics, or styling choices...",
                              help: "Is the sound clear, warm, muffled, noisy, or distorted? Describe what you hear without guessing the equipment or studio."
                            },
                            {
                              id: "vocal",
                              label: "Vocal Expression",
                              tagKey: "vocalTags",
                              descKey: "vocal",
                              tagLabel: "Vocal Expression Tags *",
                              descLabel: "Vocal Expression *",
                              tagPlaceholder: "Examples: raspy, breathy, soft, shouting, spoken, harmonies (comma-separated)",
                              descPlaceholder: "Describe audible register, pitch range, timbre, phrasing, and delivery...",
                              help: "Is the voice raspy, breathy, soft, loud, spoken, or layered with harmonies? Use N/A if there is no voice."
                            },
                            {
                              id: "lyrics",
                              label: "Lyrical Evocation",
                              tagKey: "lyricsTags",
                              descKey: "lyrics",
                              tagLabel: "Lyrical Evocation Tags *",
                              descLabel: "Lyrical Evocation *",
                              tagPlaceholder: "Examples: love, heartbreak, relationship problems, loss, storytelling (comma-separated)",
                              descPlaceholder: "Describe the lyrical themes, topics, or emotional imagery in detail...",
                              help: "What are the audible lyrics about: love, heartbreak, loss, a story? Use N/A for instrumental music; do not guess unclear lyrics."
                            }
                          ].map((cat) => (
                            <div
                              key={cat.id}
                              className="matrix-editor-card"
                            >
                              <div className="matrix-editor-fields space-y-4"><h3>{cat.label}</h3>
                                <div className="space-y-1.5">
                                  <label htmlFor={`${cat.id}-tags`} className="editor-label">
                                    Tags
                                  </label>
                                  <Input
                                    disabled={isHumanizing}
                                    id={`${cat.id}-tags`}
                                    type="text"
                                    value={(globalMetadata as any)[cat.tagKey] || ""}
                                    onChange={(e) =>
                                      setGlobalMetadata((prev) => ({
                                        ...prev,
                                        [cat.tagKey]: e.target.value,
                                      }))
                                    }
                                    placeholder={cat.tagPlaceholder}
                                    className="w-full bg-bg-card border border-border-dim rounded px-4 py-2.5 text-xs text-primary placeholder:text-primary focus:outline-none focus:border-accent/40 focus:bg-bg-card transition-all"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label htmlFor={`${cat.id}-description`} className="editor-label">
                                    Description
                                  </label>
                                  <textarea
                                    disabled={isHumanizing}
                                    id={`${cat.id}-description`}
                                    value={(globalMetadata as any)[cat.descKey] || ""}
                                    onChange={(e) =>
                                      setGlobalMetadata((prev) => ({
                                        ...prev,
                                        [cat.descKey]: e.target.value,
                                      }))
                                    }
                                    placeholder={cat.descPlaceholder}
                                    className="w-full bg-bg-card border border-border-dim rounded px-4 py-2.5 text-xs text-primary placeholder:text-primary focus:outline-none focus:border-accent/40 focus:bg-bg-card min-h-[110px] resize-y transition-all leading-relaxed"
                                  />
                                  <DescriptionRevision source={`${cat.label}: ${(globalMetadata as any)[cat.descKey] || ""}`} fieldId="f0" label={cat.label} model={selectedModel} disabled={isHumanizing || isProcessing || isRefining || importing} onBusy={setIsHumanizing} onApply={text=>{const field=musicProseFields(text)[0];if(field)setGlobalMetadata(previous=>({...previous,[cat.descKey]:field.text}));}} />
                                </div>
                              </div>
                              <details className="field-guidance">
                                <summary>Writing guidance</summary>
                                <div className="text-sm text-dim font-medium leading-relaxed whitespace-pre-line">
                                  {cat.help}
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key="result"
                      className="annotation-results"
                    >
                      {humanizationNotice && <p className="field-hint" role="status">{humanizationNotice}</p>}
                      <MusicHumanizer text={result} model={selectedModel} disabled={isProcessing || isRefining || isHumanizing || importing || isEditing} onBusy={setIsHumanizing} onApply={applyWordingResult} />
                      {/* Feedback Section */}
                      <section className="correction-panel">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                            Refine the annotation
                          </h4>
                          <span className="text-sm text-dim uppercase">
                            Optional
                          </span>
                        </div>
                        <div className="relative">
                          <textarea
                            aria-label="Correction instructions" value={userFeedback}
                            onChange={(e) => setUserFeedback(e.target.value)}
                            placeholder="Describe what to correct, such as a bridge starting at 1:15 or a shift to a higher vocal register."
                            className="w-full bg-bg-main/50 border border-border-dim rounded p-4 text-xs text-primary focus:outline-none focus:border-accent/30 min-h-[80px] resize-none"
                            disabled={isRefining}
                          />
                          <div className="correction-actions">
                            <Button
                              onClick={handleRefine}
                              disabled={!userFeedback.trim() || isRefining || isProcessing || isHumanizing}
                              className={cn(
                                "py-2 px-4 rounded text-sm font-bold uppercase tracking-widest transition-all h-8 flex items-center gap-2",
                                userFeedback.trim() && !isRefining
                                  ? "bg-accent/20 text-accent hover:bg-accent hover:text-bg-main"
                                  : "bg-bg-card text-dim cursor-not-allowed",
                              )}
                            >
                              {isRefining ? (
                                <Activity className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  Apply Correction{" "}
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded ml-1",
                                      userFeedback.trim() && !isRefining
                                        ? "bg-bg-main/20"
                                        : "bg-black/20",
                                    )}
                                  >
                                    {REFINE_COST} CR
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="field-hint">Describe what should change. The model will review the audio and update its draft.</p>
                      </section>

                      <ResearchContext research={research} />

                      {matrixView}
                      {timelineView}

                      {/* Raw Markdown Output */}
                      <details className="full-annotation">
                        <summary>Full annotation</summary>
                        <div className="full-annotation-actions">
                          <CopyBadge onCopyError={setError}
                            text={annotationText + researchAsMarkdown(research)}
                            label="Copy full annotation"
                          />
                        </div>
                        <div className="markdown-body">
                          <AnnotationMarkdown text={annotationText} />
                        </div>
                      </details>
                    </motion.div>
                  )
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="mono text-sm uppercase tracking-widest text-red-400">
                      {error}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center space-y-6 text-dim"
                  >
                    <div className="w-20 h-20 border border-dashed border-border-dim rounded-full flex items-center justify-center">
                      <FileAudio className="w-8 h-8 opacity-100" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-bold tracking-wide uppercase text-primary">
                        No annotations yet
                      </p>
                      <p className="text-sm uppercase tracking-[0.2em] opacity-100">
                        Upload a track and select Analyze.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {result && (
              <div className="px-6 py-3 bg-bg-card/50 border-t border-border-dim flex justify-between items-center">
                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-dim">
                  <div className="flex gap-1">
                    <CheckCircle2 className="w-3 h-3 text-accent" />
                  </div>
                  AI draft · Human review required
                </div>
                <div className="flex items-center gap-4 text-sm mono text-secondary uppercase tracking-tighter">
                  <span>
                    {Math.floor(currentTime / 60)}:
                    {Math.floor(currentTime % 60)
                      .toString()
                      .padStart(2, "0")}{" "}
                    / {Math.floor(duration / 60)}:
                    {Math.floor(duration % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                  
                  
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {guidanceDialog && <GuidanceDialog
        mode={guidanceDialog}
        notes={generalGuidance}
        onNotesChange={setGeneralGuidance}
        details={accurateData}
        onDetailChange={(field, value) => setAccurateData(previous => ({ ...previous, [field]: value }))}
        onClose={() => setGuidanceDialog(null)}
        onAddGuidance={() => setGuidanceDialog("form")}
        onProceed={() => void handleProcess(true)}
      />}

    </div>
  );
}
