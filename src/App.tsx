import { attachResearch, splitResearch, researchAsMarkdown, type ResearchReport } from "../shared/research";
import { DEFAULT_MODEL, MODEL_OPTIONS, isModelId, type ModelId } from '../shared/models';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  Music,
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
  Trash2,
  ChevronRight,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  User,
  ShieldCheck,
} from "lucide-react";
import { animate, motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { annotateAudio, refineAnnotation } from "./services/geminiService";


import { Button, Input, Header, SectionContainer } from "./components/BrandSystem";
import { MusicPlayer, formatTime } from "./components/MusicPlayer";
import annotationSOP from "../Music_Annotation_SOP.md?raw";

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ResearchContext({ research }: { research?: ResearchReport }) {
  if (!research) return <aside className="research-panel"><h3>Google Search context</h3><p className="small muted">This saved annotation has no research record. Analyze the track again to add sources.</p></aside>;
  const status = research.status === 'grounded' ? 'Sources found' : research.status === 'unverified' ? 'Needs verification' : 'Search unavailable';
  return <aside className="research-panel" aria-label="Google Search research">
    <div className="section-heading"><div><span className="section-eyebrow">Supporting evidence</span><h3>Google Search context</h3></div><span className={`research-status research-status--${research.status}`}>{status}</span></div>
    <p className="research-message">{research.message}</p>
    {research.summary && <details className="research-findings"><summary>Read research findings</summary><div className="markdown-body research-summary"><ReactMarkdown remarkPlugins={[remarkGfm]}>{research.summary}</ReactMarkdown></div></details>}
    {research.sources.length > 0 && <ol className="research-sources">{research.sources.map(source => <li key={`${source.id}-${source.url}`}><a href={source.url} target="_blank" rel="noopener noreferrer"><span className="source-number">{source.id}</span><span>{source.title}</span><ChevronRight size={16} aria-hidden="true"/></a></li>)}</ol>}
    {research.queries.length > 0 && <details className="research-queries"><summary>Search queries</summary><ul>{research.queries.map((query, i) => <li key={i}>{query}</li>)}</ul></details>}
    {research.searchEntryPoint && <iframe title="Google Search suggestions" className="google-search-suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; form-action 'none'"><base target="_blank"><style>body{margin:0;padding:4px;background:transparent;color:#dce6f7;font:14px system-ui}a{color:#8ab0ff}</style></head><body>${research.searchEntryPoint}</body></html>`}/>}
    <p className="field-hint">Sources support the generated song context. Review manual edits against those sources and verify recording-specific details by listening.</p>
  </aside>;
}

const PROFILES = [
  {
    id: "PRODUCER",
    label: "PRODUCER",
    fullName: "PRODUCER - Musician & Producer",
    desc: "Focuses on groove, arrangement density, and structural development.",
    formula: "Pulse → Texture → Ensemble Development → Transition",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "VOCAL",
    label: "VOCAL",
    fullName: "VOCAL - Choir Director & Vocal Focus",
    desc: "Focuses on vocal delivery, choral harmonies, and vocal techniques.",
    formula: "Opening Character → Vocal Presence → Rhythmic Motion → Ensemble Support → Direction",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "R&B",
    label: "R&B",
    fullName: "R&B - Acoustic & Rhythmic R&B",
    desc: "Warm R&B layout focusing on syncopation, pocket groove, and acoustic layers.",
    formula: "Rhythmic Foundation → Vocal Presence → Instrumental Support → Energy Level → Transition",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "SOLOIST",
    label: "SOLOIST",
    fullName: "SOLOIST - Instrumental & Melodic",
    desc: "Musicology flow focusing on melodic leads, harmony lift, and counterpoints.",
    formula: "Primary Instrumentation → Harmonic Foundation → Vocal Presence → Feel → Development",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "ACOUSTIC",
    label: "ACOUSTIC",
    fullName: "ACOUSTIC - Atmosphere & SOP V2",
    desc: "Spacious focus on room reverb depth, environmental pads, and textures.",
    formula: "Opening element → Supporting texture → Atmosphere → Transition",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "TEXTURE",
    label: "TEXTURE",
    fullName: "TEXTURE - Textural & Layer Arrangement",
    desc: "Focuses on orchestration, arrangement density, and layered physical instruments.",
    formula: "Opening Texture → Vocal Presence → Rhythmic Foundation → Instrumental Development → Overall Effect",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "RHYTHM",
    label: "RHYTHM",
    fullName: "RHYTHM - Rhythm & Structural Pulse",
    desc: "Strict focus on rhythmic patterns, drum fills, timing boundaries, and timing cues.",
    formula: "Rhythmic Foundation → Vocal Presence → Instrumentation → Transition",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "EXPERT",
    label: "EXPERT",
    fullName: "EXPERT - Deep Musicology & Master SOP",
    desc: "Comprehensive musicology flow with full structural and transitions purpose analysis.",
    formula: "Opening Element → Supporting Texture → Atmosphere → Development → Transition",
    color: "border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/15"
  },
  {
    id: "AMBIENT",
    label: "AMBIENT",
    fullName: "AMBIENT - Atmospheric & Reverb Flow",
    desc: "Spacious focus on environmental drones, soundstages, pads, and spatial decay.",
    formula: "Opening element → Supporting texture → Atmosphere → Transition",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  },
  {
    id: "DYNAMICS",
    label: "DYNAMICS",
    fullName: "DYNAMICS - Dynamic Intensity & Energy Shift",
    desc: "Focuses on volume curves, crescendos, decrescendos, and structural transitions.",
    formula: "Opening Character → Vocal Presence → Rhythmic Motion → Ensemble Support → Direction",
    color: "border-accent/25 text-accent bg-accent/5 hover:bg-accent/5"
  }
];

export default function App() {
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try { const stored = localStorage.getItem('aces_music_model'); return isModelId(stored) ? stored : DEFAULT_MODEL; }
    catch { return DEFAULT_MODEL; }
  });
  const [view, setView] = useState<'workspace' | 'guidelines' | 'archive'>('workspace');
  const [archive, setArchive] = useState<Array<{id: string; name: string; text: string; date: string; audioPath?: string; sourceUrl?: string; duration?: number}>>(() => {
    try { return JSON.parse(localStorage.getItem('aces_music_archive_v1') || '[]'); } catch { return []; }
  });
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(data => setServiceReady(data.ready)).catch(() => setServiceReady(false)); }, []);
  const importedSource = useRef<{path:string;sourceUrl:string} | null>(null);
  const [spotifyLink,setSpotifyLink]=useState('');
  const [importing,setImporting]=useState(false);
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const deletedAudioPaths=useRef(new Set<string>());
  const saveAnnotation = (text: string, audioFile = file, audioDuration = duration) => {
    const next = [{id: crypto.randomUUID(), name: audioFile?.name || 'Untitled annotation', text, date: new Date().toISOString(), duration:audioDuration, audioPath:importedSource.current?.path, sourceUrl:importedSource.current?.sourceUrl}, ...archive.map(item=>deletedAudioPaths.current.has(item.audioPath||'')?{...item,audioPath:undefined}:item)].slice(0, 30);
    try { localStorage.setItem('aces_music_archive_v1', JSON.stringify(next)); setArchive(next); }
    catch { setError('Analysis completed, but this browser could not save the archive. Download your result.'); }
  };
  const [file, setFile] = useState<File | null>(null);
  const [splitMarkers, setSplitMarkers] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<"form" | "raw">("form");
  const [sections, setSections] = useState<any[]>([]);
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
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    const saved = localStorage.getItem("active_profile") || "PRODUCER";
    if (saved === "COCO") return "PRODUCER";
    if (saved === "MAJ") return "VOCAL";
    if (saved === "LUCID") return "R&B";
    return saved;
  });
  const [annotationProfile, setAnnotationProfile] = useState<"default" | "brief">(() => (localStorage.getItem("annotation_profile") as "default" | "brief") || "default");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Modal temporary wizard states
  const [tempProfile, setTempProfile] = useState<string>("");
  const [tempAnnotationProfile, setTempAnnotationProfile] = useState<"default" | "brief">("default");
  const [profileStep, setProfileStep] = useState<1 | 2>(1);



  useEffect(() => {
    if (!isProfileModalOpen && !isGenerateModalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, [tabindex="0"]') || []);
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsProfileModalOpen(false); setIsGenerateModalOpen(false); }
      if (e.key === 'Tab') {
        const nodes = focusable(); const first = nodes[0]; const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown',onKey);
    return () => { document.removeEventListener('keydown',onKey); previous?.focus(); };
  }, [isProfileModalOpen, isGenerateModalOpen]);

  // Sync temp wizard state whenever modal is opened
  useEffect(() => {
    if (isProfileModalOpen) {
      setTempProfile(activeProfile || "");
      setTempAnnotationProfile(annotationProfile);
      setProfileStep(1);
    }
  }, [isProfileModalOpen, activeProfile, annotationProfile]);

  const selectAnnotationProfile = (mode: "default" | "brief") => {
    setAnnotationProfile(mode);
    localStorage.setItem("annotation_profile", mode);
  };

  const [creativeGuidance, setCreativeGuidance] = useState("");

  const [generalGuidance, setGeneralGuidance] = useState("");
  const [accurateData, setAccurateData] = useState({
    segmentsCount: "",
    timestamps: "",
    instruments: "",
    vocals: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const { annotation: annotationText, research } = useMemo(() => splitResearch(result || ""), [result]);
  const [globalMetadata, setGlobalMetadata] = useState<{
    genreEraSceneTags?: string;
    genreEraScene?: string;
    tempoRhythmGrooveTags?: string;
    tempoRhythmGroove?: string;
    harmonyChordsKeyTags?: string;
    harmonyChordsKey?: string;
    instrumentationTags?: string;
    instrumentation?: string;
    playingStyleTags?: string;
    playingStyle?: string;
    wowFactorTags?: string;
    wowFactor?: string;
    emotionVibeSettingTags?: string;
    emotionVibeSetting?: string;
    mixTags?: string;
    mix?: string;
    fidelityTags?: string;
    fidelity?: string;
    vocalTags?: string;
    vocal?: string;
    lyricsTags?: string;
    lyrics?: string;
  }>({});
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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const cleanMelodyType = (text: string) => {
    if (!text) return "";
    const cleaned = text.trim();
    const lower = cleaned.toLowerCase().replace(/\.$/, ""); // remove trailing period for check
    if (
      lower === "" ||
      lower === "none" ||
      lower === "n/a" ||
      lower === "absent" ||
      lower === "not applicable" ||
      lower === "no melody" ||
      lower === "no prominent melody" ||
      lower === "no melody specified" ||
      lower === "none specified"
    ) {
      return "";
    }
    return cleaned;
  };

  const parseSections = (text: string) => {
    text = splitResearch(text).annotation;
    let sectionBlocks = text.split(/Timeline Sections/i)[1] || text;
    const splitIndex = sectionBlocks.search(/Global Musical Matrix|Global Analysis|1\.\s*Genre/i);
    if (splitIndex !== -1) {
      sectionBlocks = sectionBlocks.substring(0, splitIndex);
    }
    const items = sectionBlocks
      .split(/^(?:-\s*)?(?:\*\*)?Start Time:?(?:\*\*)?\s*/im)
      .filter((s) => s.trim());

    // Helper to safely extract a field that might span multiple lines until the next common field header
    const extractSectionField = (str: string, fieldName: string) => {
      const lines = str.split("\n");
      const escapedFieldName = fieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`^\\s*(?:-\\s*)?(?:\\*\\*)?${escapedFieldName}:?(?:\\*\\*)?\\s*(.*)`, "i");
      
      let foundIndex = -1;
      let fieldValue = "";
      
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(regex);
        if (match) {
          foundIndex = i;
          fieldValue = match[1];
          break;
        }
      }
      
      if (foundIndex === -1) return "";
      
      const nextFieldRegex = /^\s*(?:-\s*)?(?:\*\*)?(?:Start Time|Section Type|Narrative Description|Instruments|Vibe Tags|Melody|Tempo|Key|Description|Vibe)[\s:]/i;
      const collectedLines = [fieldValue];
      
      for (let i = foundIndex + 1; i < lines.length; i++) {
        if (nextFieldRegex.test(lines[i])) {
          break;
        }
        collectedLines.push(lines[i]);
      }
      
      return collectedLines.join("\n").replace(/^\*\*|\*\*$/g, "").trim();
    };

    const parsed = items.map((item, index) => {
      const timeMatch = item.match(/\[?(\d{1,2}:\d{2})\]?/);
      let instruments = extractSectionField(item, "Instruments");

      const type = extractSectionField(item, "Section Type") || "Unknown";
      const description =
        extractSectionField(item, "Narrative Description") ||
        extractSectionField(item, "Description");
      const vibe =
        extractSectionField(item, "Vibe Tags") ||
        extractSectionField(item, "Vibe");
      const melodyRaw = extractSectionField(item, "Melody");
      const melody = cleanMelodyType(melodyRaw);

      // Heuristic for uncertainty: search for question marks or specific keywords
      const isUnsure =
        instruments.includes("?") ||
        /likely|possibly|maybe|unsure|uncertain/i.test(instruments) ||
        /likely|possibly|maybe|unsure|uncertain/i.test(description);

      return {
        startTime: timeMatch ? timeMatch[1] : "00:00",
        type,
        description,
        instruments,
        vibe,
        melody,
        isUnsure,
        fullText: item,
      };
    });

    const globalBlock = text.split(/Global Musical Matrix|Global Analysis/i)[1] || text;
    const globalLabels = ["Genre, Era & Scene Tags", "Genre, Era & Scene", "Tempo, Rhythm & Groove Tags", "Tempo, Rhythm & Groove", "Harmony, Chords & Key Tags", "Harmony, Chords & Key", "Instrumentation Tags", "Instrumentation", "Playing Style Tags", "Playing Style", "Wow Factor Tags", "Wow Factor", "Emotion, Vibe & Setting Tags", "Emotion, Vibe & Setting", "Mix & Production Tags", "Mix & Production", "Sonic Fidelity Tags", "Sonic Fidelity", "Vocal Expression Tags", "Vocal Expression", "Lyrical Evocation Tags", "Lyrical Evocation", "Song title", "Song by", "Performing Artists"];
    const extractGlobal = (key: string) => {
      const lines = globalBlock.split("\n");
      const normalizeHeader = (line: string) => line.trim().replace(/^(?:[-*]\s+|\d+\.\s*)/, "").replace(/\*\*/g, "");
      const start = lines.findIndex(line => normalizeHeader(line).startsWith(`${key}:`));
      if (start < 0) return "";
      const first = normalizeHeader(lines[start]).slice(key.length + 1).trim();
      const values = [first];
      for (let i = start + 1; i < lines.length; i++) {
        if (globalLabels.some(label => normalizeHeader(lines[i]).startsWith(`${label}:`))) break;
        values.push(lines[i]);
      }
      return values.join("\n").trim();
    };

    setGlobalMetadata({
      genreEraSceneTags: extractGlobal("Genre, Era & Scene Tags"),
      genreEraScene: extractGlobal("Genre, Era & Scene"),
      tempoRhythmGrooveTags: extractGlobal("Tempo, Rhythm & Groove Tags"),
      tempoRhythmGroove: extractGlobal("Tempo, Rhythm & Groove"),
      harmonyChordsKeyTags: extractGlobal("Harmony, Chords & Key Tags"),
      harmonyChordsKey: extractGlobal("Harmony, Chords & Key"),
      instrumentationTags: extractGlobal("Instrumentation Tags"),
      instrumentation: extractGlobal("Instrumentation"),
      playingStyleTags: extractGlobal("Playing Style Tags"),
      playingStyle: extractGlobal("Playing Style"),
      wowFactorTags: extractGlobal("Wow Factor Tags"),
      wowFactor: extractGlobal("Wow Factor"),
      emotionVibeSettingTags: extractGlobal("Emotion, Vibe & Setting Tags"),
      emotionVibeSetting: extractGlobal("Emotion, Vibe & Setting"),
      mixTags: extractGlobal("Mix & Production Tags"),
      mix: extractGlobal("Mix & Production"),
      fidelityTags: extractGlobal("Sonic Fidelity Tags"),
      fidelity: extractGlobal("Sonic Fidelity"),
      vocalTags: extractGlobal("Vocal Expression Tags"),
      vocal: extractGlobal("Vocal Expression"),
      lyricsTags: extractGlobal("Lyrical Evocation Tags"),
      lyrics: extractGlobal("Lyrical Evocation"),
    });

    setSections(parsed);
  };

  const serializeAnnotation = (currentSections: any[], currentMetadata: typeof globalMetadata) => {
    let text = "Timeline Sections\n\n";
    currentSections.forEach((s) => {
      text += `- **Start Time:** ${s.startTime || "00:00"}\n`;
      text += `- **Section Type:** ${s.type || ""}\n`;
      text += `- **Narrative Description:** ${s.description || ""}\n`;
      text += `- **Instruments:** ${s.instruments || ""}\n`;
      text += `- **Vibe Tags:** ${s.vibe || ""}\n`;
      text += `- **Melody:** ${s.melody || ""}\n\n`;
    });

    text += "Global Musical Matrix\n";
    text += `1. Genre, Era & Scene Tags: ${currentMetadata.genreEraSceneTags || ""}\n`;
    text += `2. Genre, Era & Scene: ${currentMetadata.genreEraScene || ""}\n`;
    text += `3. Tempo, Rhythm & Groove Tags: ${currentMetadata.tempoRhythmGrooveTags || ""}\n`;
    text += `4. Tempo, Rhythm & Groove: ${currentMetadata.tempoRhythmGroove || ""}\n`;
    text += `5. Harmony, Chords & Key Tags: ${currentMetadata.harmonyChordsKeyTags || ""}\n`;
    text += `6. Harmony, Chords & Key: ${currentMetadata.harmonyChordsKey || ""}\n`;
    text += `7. Instrumentation Tags: ${currentMetadata.instrumentationTags || ""}\n`;
    text += `8. Instrumentation: ${currentMetadata.instrumentation || ""}\n`;
    text += `9. Playing Style Tags: ${currentMetadata.playingStyleTags || ""}\n`;
    text += `10. Playing Style: ${currentMetadata.playingStyle || ""}\n`;
    text += `11. Wow Factor Tags: ${currentMetadata.wowFactorTags || ""}\n`;
    text += `12. Wow Factor: ${currentMetadata.wowFactor || ""}\n`;
    text += `13. Emotion, Vibe & Setting Tags: ${currentMetadata.emotionVibeSettingTags || ""}\n`;
    text += `14. Emotion, Vibe & Setting: ${currentMetadata.emotionVibeSetting || ""}\n`;
    text += `15. Mix & Production Tags: ${currentMetadata.mixTags || ""}\n`;
    text += `16. Mix & Production: ${currentMetadata.mix || ""}\n`;
    text += `17. Sonic Fidelity Tags: ${currentMetadata.fidelityTags || ""}\n`;
    text += `18. Sonic Fidelity: ${currentMetadata.fidelity || ""}\n`;
    text += `19. Vocal Expression Tags: ${currentMetadata.vocalTags || ""}\n`;
    text += `20. Vocal Expression: ${currentMetadata.vocal || ""}\n`;
    text += `21. Lyrical Evocation Tags: ${currentMetadata.lyricsTags || ""}\n`;
    text += `22. Lyrical Evocation: ${currentMetadata.lyrics || ""}\n`;

    return attachResearch(text.trim(), research);
  };

  const handleToggleEditing = () => {
    if (isEditing) {
      if (editTab === "raw") {
        parseSections(result || "");
      } else {
        const serialized = serializeAnnotation(sections, globalMetadata);
        setResult(serialized);
        parseSections(serialized);
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
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
      if (audioUrl) URL.revokeObjectURL(audioUrl);
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
      items.push(`- Vocals Identity: ${accurateData.vocals.trim()}`);
    }
    return items.join("\n");
  };

  const handleProcess = async (sourceFile = file, sourceDuration = duration) => {
    if (!sourceFile || isProcessing || isRefining) return;
    if (credits < GENERATE_COST) {
      setError(
        "Insufficient credits. You need 10 credits for a new generation.",
      );
      return;
    }

    const compiledGuidance = compileCreativeGuidance();
    setCreativeGuidance(compiledGuidance);

    setIsProcessing(true);
    setIsEditing(false);
    setUserFeedback("");
    setError(null);
    try {
      const annotation = await annotateAudio(
        sourceFile,
        isSimplified,
        isHighAccuracy,
        compiledGuidance,
        sourceDuration,
        activeProfile || "PRODUCER",
        annotationProfile,
        selectedModel,
      );
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
      saveAnnotation(annotation, sourceFile, sourceDuration);
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
    if(!response.ok)throw new Error('Could not load the saved audio.');
    return new File([await response.blob()],name,{type:'audio/mpeg'});
  };
  const importSpotify = async () => {
    if(importing || isProcessing || isRefining)return;
    if(credits<GENERATE_COST){setError('You need 10 local credits to import and analyze.');return;}
    setImporting(true);setError(null);setView('workspace');
    try {
      const response=await fetch('/api/spotify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:spotifyLink.trim(),rightsConfirmed}),signal:AbortSignal.timeout(290000)});
      const data=await response.json();
      if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Music import failed.');
      const downloaded=await loadStoredAudio(data.path,data.name);
      const trackDuration=await new Promise<number>((resolve,reject)=>{
        const audio=new Audio();const url=URL.createObjectURL(downloaded);
        const cleanup=()=>{clearTimeout(timer);audio.removeAttribute('src');URL.revokeObjectURL(url);};
        const timer=setTimeout(()=>{cleanup();reject(new Error('Could not read imported audio duration.'));},15000);
        audio.onloadedmetadata=()=>{const value=audio.duration;cleanup();Number.isFinite(value)&&value>0?resolve(value):reject(new Error('Invalid imported duration.'));};
        audio.onerror=()=>{cleanup();reject(new Error('The downloaded recording could not be played.'));};audio.src=url;
      });
      handleFileSelection(downloaded);importedSource.current={path:data.path,sourceUrl:data.sourceUrl};
      setDuration(trackDuration);saveAnnotation('Audio imported. Analyze this track to generate its annotation.',downloaded,trackDuration);setImporting(false);
      await handleProcess(downloaded,trackDuration);
    }catch(error){setError(error instanceof Error?error.message:'Music import failed.');}
    finally{setImporting(false);}
  };
  const openSaved = async (item:typeof archive[number]) => {
    if(isProcessing || isRefining || importing)return;
    try {
      if(item.audioPath){const audio=await loadStoredAudio(item.audioPath,item.name);handleFileSelection(audio);importedSource.current={path:item.audioPath,sourceUrl:item.sourceUrl||''};}
      else {audioRef.current?.pause();setFile(null);setAudioUrl(null);importedSource.current=null;setDuration(item.duration||0);setSections([]);}
      setResult(item.text);parseSections(item.text);setView('workspace');setError(null);
    }catch(error){setError(error instanceof Error?error.message:'Could not open saved audio.');}
  };

  const handleRefine = async () => {
    if (!file || !result || !userFeedback.trim() || isProcessing || isRefining) return;
    if (credits < REFINE_COST) {
      setError("Insufficient credits. You need 5 credits for refinement.");
      return;
    }

    setIsRefining(true);
    setError(null);
    try {
      const refinedAnnotation = await refineAnnotation(
        file,
        result,
        userFeedback,
        isSimplified,
        isHighAccuracy,
        creativeGuidance,
        duration,
        activeProfile || "PRODUCER",
        annotationProfile,
        selectedModel,
      );
      setCredits((prev) => prev - REFINE_COST);
      setResult(refinedAnnotation);
      saveAnnotation(refinedAnnotation);
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

  const CopyBadge = ({
    text,
    label,
    className,
  }: {
    text: string;
    label: string;
    className?: string;
  }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try { await navigator.clipboard.writeText(text); } catch { setError("Copy failed. Select and copy the annotation manually."); return; }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
  };

  const reset = () => {
    audioRef.current?.pause();
    if(audioUrl) URL.revokeObjectURL(audioUrl);
    setCurrentTime(0); setDuration(0); setIsPlaying(false); setActiveSegment(null);
    setFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
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

  const seekAndPlaySegment = (index: number) => {
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
  };

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

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      audioRef.current.currentTime = percentage * duration;
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioUrl]);

  const toggleMute = () => {
    setVolume((v) => (v === 0 ? 1 : 0));
  };


  return (
    <div className="app-shell">
      <Header view={view} onNavigate={setView} onProfile={() => setIsProfileModalOpen(true)} />
      <div className="page-title"><h1>{view === 'workspace' ? 'Studio' : view === 'archive' ? 'Library' : 'Guide'}</h1>{view === 'workspace' && <span className="small muted">{sections.length ? `${sections.length} segments` : 'Music annotation'}</span>}</div>
      {serviceReady === false && <details className="service-notice"><summary><span className="status-dot"/> AI offline <span className="muted">Setup required</span></summary><p>In Vercel → j2beat → Settings → Environment Variables, set GEMINI_API_KEY and/or OPENROUTER_API_KEY with OPENROUTER_MODEL (an audio-input model). Your selected model is tried first, followed by the other Gemini models and the configured OpenRouter model if needed. Redeploy to apply. Keys remain server-side.</p></details>}
      {error && <div role="alert" className="error-notice">{error}</div>}
      {view === 'guidelines' && <SectionContainer className="document-view"><p className="eyebrow"></p><h2>Annotation guidelines</h2><p>AI output is a draft. Listen to the track and verify instruments, timestamps, and descriptions before exporting.</p><div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{annotationSOP}</ReactMarkdown></div></SectionContainer>}
      {view === 'archive' && <SectionContainer className="document-view"><p className="eyebrow"></p><h2>Saved annotations</h2><p>Annotations are saved in this browser. Imported audio is deleted from storage after successful analysis. Playback remains available in the current browser session.</p>{archive.length === 0 ? <p className="archive-empty">No saved annotations yet.</p> : archive.map(item => <article className="archive-row" key={item.id}><div><h3>{item.name}</h3><p>{new Date(item.date).toLocaleString()}</p></div><div className="archive-actions"><Button disabled={isProcessing||isRefining||importing} onClick={()=>openSaved(item)}><FileAudio />{item.audioPath?'Open & play':'Open annotation'}</Button><Button onClick={async()=>{try{(await import('./utils/pdfGenerator')).exportSavedPDF(item.name,item.text,item.date);}catch{setError('PDF export failed. Please retry.');}}}><Download/>Export PDF</Button>{item.audioPath&&<a className="aces-button aces-button--secondary" href={'/api/audio?path='+encodeURIComponent(item.audioPath)} download={item.name}>Download audio</a>}</div></article>)}</SectionContainer>}
      {view==='workspace'&&<section className="spotify-import"><div><h3>Import from Spotify</h3><p className="field-hint">Paste one track link. spotDL finds a matching YouTube recording, saves it privately, then starts AI analysis. Verify the recording version.</p></div><label htmlFor="spotify-link" className="sr-only">Spotify track link</label><input id="spotify-link" type="url" value={spotifyLink} placeholder="https://open.spotify.com/track/…" onChange={e=>setSpotifyLink(e.target.value)} disabled={importing||isProcessing||isRefining}/><label className="import-permission"><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/>I have permission to download and analyze this recording.</label><Button variant="primary" disabled={!spotifyLink.trim()||!rightsConfirmed||importing||isProcessing||isRefining} onClick={importSpotify}>{importing?'Finding and saving recording…':'Import & analyze'}</Button>{importing&&<p role="status">Downloading and saving audio. This can take a few minutes. The player remains available.</p>}</section>}
      {(isProcessing || isRefining) && <section className="analysis-progress-panel" aria-label="Annotation progress">
        <div className="analysis-progress-heading"><div><span className="analysis-pulse"/><strong>{isRefining ? 'Refining annotation' : 'Analyzing track'}</strong></div><time>{Math.floor(elapsedSeconds/60)}:{String(elapsedSeconds%60).padStart(2,'0')}</time></div>
        <p role="status" aria-live="polite">{analysisStage}</p>
        <div className="analysis-stage-track" aria-label="Processing stages">{['Upload','Analyze','Research','Write'].map((label,i)=>{const stage=/Writing|Repairing/i.test(analysisStage)?3:/Searching/i.test(analysisStage)?2:/Analyzing|Retrying|Preparing AI|Rechecking/i.test(analysisStage)?1:0;return <span key={label} className={i<stage?'complete':i===stage?'active':''}>{i<stage?'✓':i+1} {label}</span>;})}</div>
        <div className="analysis-meter" role="progressbar" aria-label="Current operation" aria-valuenow={/Uploading audio.*%/.test(analysisStage)?Number(analysisStage.match(/(\d+)%/)?.[1]):undefined} aria-valuemin={0} aria-valuemax={100} aria-valuetext={analysisStage}><span className={/Uploading audio.*%/.test(analysisStage)?'determinate':'indeterminate'} style={/Uploading audio.*%/.test(analysisStage)?{width:`${analysisStage.match(/(\d+)%/)?.[1]}%`}:undefined}/></div>
        <small>{elapsedSeconds>90?'Taking longer than usual. Progress and retries appear above.':'You can listen, seek, and loop while the annotation runs.'} AI processing may take up to 4 minutes, plus upload time.</small>
      </section>}
      <div className="player-section" hidden={view !== 'workspace'}>
        <MusicPlayer markers={splitMarkers} onMark={time=>{
          if (!Number.isFinite(time) || !duration || time < 0 || time >= duration) return;
          const second = Math.floor(time);
          setSplitMarkers(previous=>[...new Set([...previous,second])].sort((a,b)=>a-b));
        }} onRemoveMarker={time=>setSplitMarkers(previous=>previous.filter(value=>value!==time))} onClearMarkers={()=>setSplitMarkers([])} onUseMarkers={()=>{
          const times=[...new Set([0,...splitMarkers])].sort((a,b)=>a-b).map(formatTime);
          setAccurateData(previous=>{
            const existing=previous.timestamps.trim();
            const present=new Set(existing.match(/\b\d+:\d{2}\b/g) || []);
            const added=times.filter(time=>!present.has(time));
            return {...previous,timestamps:existing+(existing && added.length ? ', ' : '')+added.join(', ')};
          });
          setIsGenerateModalOpen(true);
        }} file={file} audioUrl={audioUrl} audioRef={audioRef} currentTime={currentTime} duration={duration} isPlaying={isPlaying} volume={volume} onFile={handleFileSelection} onSeek={seekTo} onToggle={togglePlay} onVolume={setVolume} onReset={reset} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onPlaying={setIsPlaying} onError={setError} segments={sections} busy={isProcessing || isRefining || importing}/>
      </div>
      <main id="workspace" hidden={view !== "workspace"} className="studio-grid">
        <section className="settings-panel" aria-labelledby="analysis-settings-title">
          <div className="settings-heading"><span className="section-eyebrow">Configure</span><h2 id="analysis-settings-title">Analysis settings</h2><p className="small muted">Choose how to describe this recording.</p></div>
          <div className="settings-field">
            <label className="field-label" htmlFor="model-select">Model</label>
            <select id="model-select" value={selectedModel} disabled={isProcessing || isRefining} onChange={e=>{
              if (isModelId(e.target.value)) { setSelectedModel(e.target.value); try { localStorage.setItem('aces_music_model',e.target.value); } catch {} }
            }}>{MODEL_OPTIONS.map(model=><option key={model.id} value={model.id}>{model.label}{model.id===DEFAULT_MODEL?' (default)':''}</option>)}</select>
            <p className="field-hint">Automatic fallback enabled.</p>
          </div>
          <div className="settings-field">
            <label className="field-label" htmlFor="profile-select">Analysis profile</label>
            <select id="profile-select" value={activeProfile || 'PRODUCER'} onChange={e=>{setActiveProfile(e.target.value);localStorage.setItem('active_profile',e.target.value);}}>{PROFILES.map(p=><option key={p.id} value={p.id}>{p.label.charAt(0)+p.label.slice(1).toLowerCase()}</option>)}</select>
          </div>
          <div className="settings-field">
            <span className="field-label" id="writing-style-label">Writing style</span>
            <div className="segmented-control" role="group" aria-labelledby="writing-style-label"><Button aria-pressed={annotationProfile==='default'} onClick={()=>selectAnnotationProfile('default')}>Standard</Button><Button aria-pressed={annotationProfile==='brief'} onClick={()=>selectAnnotationProfile('brief')}>Brief</Button></div>
          </div>
          <div className="settings-options">
            <label className="toggle-row"><span>Simple language</span><input type="checkbox" checked={isSimplified} onChange={e=>setIsSimplified(e.target.checked)}/></label>
            <label className="toggle-row"><span>Detailed segmentation</span><input type="checkbox" checked={isHighAccuracy} onChange={e=>setIsHighAccuracy(e.target.checked)}/></label>
          </div>
          <div className="settings-actions">
            <Button className="guidance-button" onClick={()=>setIsGenerateModalOpen(true)}><Settings/>Track details & guidance{generalGuidance.trim() || Object.values(accurateData).some(v=>v.trim()) ? <span className="status-dot"/>:null}</Button>
            <Button variant="primary" className="generate-button" disabled={!file || importing || isProcessing || isRefining || serviceReady!==true} onClick={()=>handleProcess()}>{isProcessing?<Activity/>:<Play/>}{isProcessing?'Analyzing…':result?'Analyze again':'Analyze track'}</Button>
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
                          onClick={() => {
                            setResult(serializeAnnotation(sections, globalMetadata));
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
                            onChange={(e) => setResult(attachResearch(e.target.value, research))}
                            className="w-full h-full min-h-[400px] bg-transparent text-primary p-0 focus:outline-none mono text-sm resize-none"
                            spellCheck={false}
                          />
                        </div>
                      ) : (
                        <div className="matrix-editor">
                          {[
                            {
                              id: "genreEraScene",
                              label: "Genre, Era & Scene",
                              tagKey: "genreEraSceneTags",
                              descKey: "genreEraScene",
                              tagLabel: "Genre, Era & Scene Tags *",
                              descLabel: "Genre, Era & Scene *",
                              tagPlaceholder: "Add specific genres, era, subgenres, or scenes... (comma-separated)",
                              descPlaceholder: "Describe the genre, era or scene, and why...",
                              help: "Can include broad and subgenre (Glam Rock), a specific decade (80s Synthwave), and cultural scene (Club). As before, what is most important is what it sounds like. What are the main elements that lead up to that qualification?."
                            },
                            {
                              id: "tempoRhythmGroove",
                              label: "Tempo, Rhythm & Groove",
                              tagKey: "tempoRhythmGrooveTags",
                              descKey: "tempoRhythmGroove",
                              tagLabel: "Tempo, Rhythm & Groove Tags *",
                              descLabel: "Tempo, Rhythm & Groove *",
                              tagPlaceholder: "Add tempo, rhythm feel, or groove elements... (comma-separated)",
                              descPlaceholder: "Describe the tempo, rhythmic feel, and groove elements in detail...",
                              help: "How fast does it feel? Use a tempo bucket: Very Slow / Slow / Mid-tempo / Upbeat / Fast / Very Fast.\n\nStraight or swung? Syncopated or on-the-beat? Notable rhythmic traits (shuffled hi-hats, four-on-the-floor, boom-bap)? Simple or complex rhythms? Descriptive feel is what matters — \"laid-back swing\" or \"driving march\" works. DO NOT mention explicit counts, time signatures, or meter signatures (such as 4/4, 3/4, 6/8, etc.)."
                            },
                            {
                              id: "harmonyChordsKey",
                              label: "Harmony, Chords & Key",
                              tagKey: "harmonyChordsKeyTags",
                              descKey: "harmonyChordsKey",
                              tagLabel: "Harmony, Chords & Key Tags *",
                              descLabel: "Harmony, Chords & Key *",
                              tagPlaceholder: "Add key, chords, harmonic progression tags... (comma-separated)",
                              descPlaceholder: "Describe the key, chords, harmonic progression, or harmonic feel...",
                              help: "What does the harmony feel like? \"Simple pop chords\", \"jazzy extended chords\", \"dark minor progression\", \"just a bassline\".\n\nInclude key if you know it.\n\nDo chords change quickly or stay on one chord for a while? Descriptive feel > notation.\n\nFocus on feel — \"happy chords\", \"sad and minor\", \"barely any harmony\".\n\nIf possible - Add key, progression shape (e.g., \"I-V-vi-IV\"), complexity."
                            },
                            {
                              id: "instrumentation",
                              label: "Instrumentation",
                              tagKey: "instrumentationTags",
                              descKey: "instrumentation",
                              tagLabel: "Instrumentation Tags *",
                              descLabel: "Instrumentation *",
                              tagPlaceholder: "Add key dominant or supporting instruments... (comma-separated)",
                              descPlaceholder: "Describe the role, contributions, and interplay of the instruments...",
                              help: "What is the role of the instruments? Are they different from the canonical instrument? Which part is played? Is there an interplay between the instruments?."
                            },
                            {
                              id: "playingStyle",
                              label: "Playing Style",
                              tagKey: "playingStyleTags",
                              descKey: "playingStyle",
                              tagLabel: "Playing Style Tags *",
                              descLabel: "Playing Style *",
                              tagPlaceholder: "Add performance qualities, techniques, or styles... (comma-separated)",
                              descPlaceholder: "Describe the performance qualities, techniques, or playing styles in detail...",
                              help: "How is it performed? Tight/Quantized? Loose/Human? Aggressive? Gentle/Intimate? Behind the beat (laid-back) or on top (driving)? Notable techniques (fingerpicking, palm-muting, ghost notes)? Long flowing phrases or short choppy bursts? Do dynamics build or stay flat?."
                            },
                            {
                              id: "wowFactor",
                              label: "Wow Factor",
                              tagKey: "wowFactorTags",
                              descKey: "wowFactor",
                              tagLabel: "Wow Factor Tags *",
                              descLabel: "Wow Factor (Optional)",
                              tagPlaceholder: "Add unique highlights or surprises... (comma-separated)",
                              descPlaceholder: "Describe any highlights, surprises, or standout elements in detail...",
                              help: "What stands out most about this song — positively or negatively?.\n\nA surprise drop?.\n\nA weird instrument pairing (e.g. flute + trap beat)? If the track is generic and nothing stands out, just say so — you don't need to force a highlight.\n\nIf you would described this song to a friend, what is the one thing you would mention."
                            },
                            {
                              id: "emotionVibeSetting",
                              label: "Emotion, Vibe & Setting",
                              tagKey: "emotionVibeSettingTags",
                              descKey: "emotionVibeSetting",
                              tagLabel: "Emotion, Vibe & Setting Tags *",
                              descLabel: "Emotion, Vibe & Setting *",
                              tagPlaceholder: "Add emotional tone, vibe, or setting tags... (comma-separated)",
                              descPlaceholder: "Describe the overall emotional tone, vibe, and ideal listening setting...",
                              help: "How does it feel? (e.g. Happy, Anxious, Triumphant, Chill, Dark, Nostalgic). How does the energy evolve? What setting or occasion fits? (late-night drive, workout, club, studying, dinner party)."
                            },
                            {
                              id: "mix",
                              label: "Mix & Production",
                              tagKey: "mixTags",
                              descKey: "mix",
                              tagLabel: "Mix & Production Tags *",
                              descLabel: "Mix & Production *",
                              tagPlaceholder: "Add soundstage, spatial, panning, reverb, or effects tags... (comma-separated)",
                              descPlaceholder: "Describe the spatial soundstage, panning, effects, and production style...",
                              help: "Describe the 'Sound Stage'.\n\nDry vs Wet? Wide vs Mono? Warm/Vintage vs Cold/Digital? Minimal vs Wall-of-Sound? Era or production style (70s dry drums, 80s gated reverb, modern hyper-compressed)? Notable effects (distortion, tape saturation, sidechain pumping)? What’s foreground vs background? Any spatial movement (panning, stereo shifts)? Pitch effects (risers, drops)?."
                            },
                            {
                              id: "fidelity",
                              label: "Sonic Fidelity",
                              tagKey: "fidelityTags",
                              descKey: "fidelity",
                              tagLabel: "Sonic Fidelity Tags *",
                              descLabel: "Sonic Fidelity *",
                              tagPlaceholder: "Add fidelity, audio quality, or production style tags... (comma-separated)",
                              descPlaceholder: "Describe the audio quality, fidelity characteristics, or styling choices...",
                              help: "Is this Pro or Amateur? Why? Lo-fi beat can be a stylistic choice.\n\nBut note flaws like clipping, bad tuning, clumsy drumming, or 'demo' quality, when they are not serving the material, or would not please the listener.\n\nBe honest—don't just be polite."
                            },
                            {
                              id: "vocal",
                              label: "Vocal Expression",
                              tagKey: "vocalTags",
                              descKey: "vocal",
                              tagLabel: "Vocal Expression Tags *",
                              descLabel: "Vocal Expression *",
                              tagPlaceholder: "Add vocal delivery, pitch, register, or timbre tags... (comma-separated)",
                              descPlaceholder: "Describe the vocal performance, delivery style, timbre, and processing...",
                              help: "Describe the voice.\n\nGender.\n\nPitch range (low/mid/high).\n\nTimbre (Raspy, Breathy, Clean, Nasal, Warm, Smoky).\n\nDelivery (Rap, Croon, Belt, Scream, Whisper)..\n\nProcessing (Autotune, Vocoder, dry)..\n\nVocal tropes (R&B runs,country twang, falsetto,ad-libs)worker-tagging..\n\nDoes vocal style change between sections?."
                            },
                            {
                              id: "lyrics",
                              label: "Lyrical Evocation",
                              tagKey: "lyricsTags",
                              descKey: "lyrics",
                              tagLabel: "Lyrical Evocation Tags *",
                              descLabel: "Lyrical Evocation *",
                              tagPlaceholder: "Add lyrics themes, topics, or emotional imagery tags... (comma-separated)",
                              descPlaceholder: "Describe the lyrical themes, topics, or emotional imagery in detail...",
                              help: "If lyrics stand out, what are they about? (Love, Politics, Party, Nonsense, Storytelling).\n\nIf Instrumental, write N/A.\n\nDo not spend time deeply analysing the lyrics."
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
                            placeholder="Describe any inaccuracies in instrumentation, segmentation, or vocal gender (e.g., 'The section at 1:15 is actually a bridge, and the vocal is female'...)"
                            className="w-full bg-bg-main/50 border border-border-dim rounded p-4 text-xs text-primary focus:outline-none focus:border-accent/30 min-h-[80px] resize-none"
                            disabled={isRefining}
                          />
                          <div className="correction-actions">
                            <Button
                              onClick={handleRefine}
                              disabled={!userFeedback.trim() || isRefining || isProcessing}
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

                      {/* Global Analysis Matrix */}
                      <div className="matrix-section">
                        <div className="section-heading">
                          <h2 className="text-xs uppercase tracking-wide text-accent font-bold mb-0">
                            Global Musical Matrix
                          </h2>
                          <CopyBadge
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
                                        <CopyBadge
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
                                        <CopyBadge
                                          text={item.desc}
                                          label="Description"
                                          className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-bg-main text-sm px-2 py-0.5"
                                        />
                                      </div>
                                      <div className="text-xs text-primary font-medium leading-relaxed markdown-body mt-1">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.desc}</ReactMarkdown>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ),
                          )}
                        </div>
                      </div>

                      {/* Sections List */}
                      {sections.length > 0 && (
                        <div className="space-y-4">
                          <div className="section-heading">
                            <h2 className="text-xs uppercase tracking-wide text-accent font-bold mb-0 flex items-center gap-4">
                              Timeline Segmentation
                            </h2>
                            <div className="section-actions">
                              <CopyBadge
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
                                    <CopyBadge
                                      text={section.startTime}
                                      label="Time"
                                    />
                                    <CopyBadge
                                      text={section.description}
                                      label="Description"
                                    />
                                    <CopyBadge
                                      text={
                                        section.instruments.endsWith(",")
                                          ? section.instruments
                                          : `${section.instruments}${section.instruments ? "," : ""}`
                                      }
                                      label="Instruments"
                                    />
                                    {section.vibe && (
                                      <CopyBadge
                                        text={section.vibe}
                                        label="Vibe"
                                      />
                                    )}
                                    {section.melody && (
                                      <CopyBadge
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
                      )}

                      {/* Raw Markdown Output */}
                      <details className="full-annotation">
                        <summary>Full annotation</summary>
                        <div className="full-annotation-actions">
                          <CopyBadge
                            text={annotationText + researchAsMarkdown(research)}
                            label="Copy full annotation"
                          />
                        </div>
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{annotationText}</ReactMarkdown>
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

      {isGenerateModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Annotation guidance" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-panel border border-border-dim rounded-xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <Button
              aria-label="Close guidance settings" onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-4 right-4 text-dim hover:text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="mb-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                Guidance
              </h3>
              <p className="text-sm text-dim uppercase tracking-wider mt-1">
                Add the song title, artist, and recording version here to help Google Search identify the right song.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* General Guidance Section */}
              <div className="flex flex-col gap-1.5 border-b border-border-dim pb-4">
                <label className="text-sm text-accent uppercase tracking-wider font-semibold">
                  Song details & listening guidance
                </label>
                <span className="text-sm text-dim uppercase tracking-wide">
                  Include the track identity and any audible details you want checked.
                </span>
                <textarea
                  aria-label="Creative guidance" value={generalGuidance}
                  onChange={(e) => setGeneralGuidance(e.target.value)}
                  placeholder="e.g., Focus heavily on the atmospheric synth layers, keep the narrative description highly mysterious, and analyze the low-end sub-bass frequencies carefully."
                  className="w-full bg-bg-main/50 border border-border-dim rounded p-2.5 text-xs text-primary placeholder-white/20 focus:outline-none focus:border-accent/50 min-h-[70px] resize-none mt-1"
                />
              </div>

              {/* Structured Template Inputs */}
              <div>
                <label className="text-sm text-accent uppercase tracking-wider font-semibold block mb-1">
                  Track details
                </label>
                <span className="text-sm text-dim uppercase tracking-wide block mb-3">
                  
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-primary uppercase tracking-wider font-semibold">
                      Target Segments Count
                    </label>
                    <Input
                      type="text"
                      aria-label="Target segment count" value={accurateData.segmentsCount}
                      onChange={(e) => setAccurateData({ ...accurateData, segmentsCount: e.target.value })}
                      placeholder="e.g. 8"
                      className="w-full bg-bg-main/50 border border-border-dim rounded p-2 text-xs text-primary placeholder-white/20 focus:outline-none focus:border-accent/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-primary uppercase tracking-wider font-semibold">
                      Vocals Profile
                    </label>
                    <Input
                      type="text"
                      aria-label="Vocal profile" value={accurateData.vocals}
                      onChange={(e) => setAccurateData({ ...accurateData, vocals: e.target.value })}
                      placeholder="e.g. Instrumental, Male rap, Female..."
                      className="w-full bg-bg-main/50 border border-border-dim rounded p-2 text-xs text-primary placeholder-white/20 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-3.5">
                  <label className="text-sm text-primary uppercase tracking-wider font-semibold">
                    Specific Time Stamps
                  </label>
                  <textarea
                    aria-label="Specific timestamps" value={accurateData.timestamps}
                    onChange={(e) => setAccurateData({ ...accurateData, timestamps: e.target.value })}
                    placeholder="e.g. 0:00, 0:30, 1:15, 1:45, 2:30"
                    className="w-full bg-bg-main/50 border border-border-dim rounded p-2 text-xs text-primary placeholder-white/20 focus:outline-none focus:border-accent/50 min-h-[50px] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 mt-3.5">
                  <label className="text-sm text-primary uppercase tracking-wider font-semibold">
                    Instruments Present (Comma Separated)
                  </label>
                  <Input
                    type="text"
                    aria-label="Instruments present" value={accurateData.instruments}
                    onChange={(e) => setAccurateData({ ...accurateData, instruments: e.target.value })}
                    placeholder="e.g. Acoustic Guitar, Lead Vocal, Synth Bass, Shaker"
                    className="w-full bg-bg-main/50 border border-border-dim rounded p-2 text-xs text-primary placeholder-white/20 focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border-dim mt-4">
                <Button
                  aria-label="Close guidance settings" onClick={() => setIsGenerateModalOpen(false)}
                  className="flex-1 py-3 bg-bg-card border border-border-dim text-primary font-bold text-sm uppercase tracking-[0.15em] rounded hover:bg-bg-card transition-colors cursor-pointer"
                >
                  Close
                </Button>
                {file ? (
                  <Button
                    onClick={() => {
                      setIsGenerateModalOpen(false);
                      handleProcess();
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-accent text-bg-main font-bold text-sm uppercase tracking-[0.15em] rounded hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(215,183,139,0.15)]"
                  >
                    Analyze track ({GENERATE_COST} CR)
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const compiled = compileCreativeGuidance();
                      setCreativeGuidance(compiled);
                      setIsGenerateModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-bg-card hover:bg-bg-card text-primary border border-border-dim font-bold text-sm uppercase tracking-[0.15em] rounded transition-colors cursor-pointer"
                  >
                    Save guidance
                  </Button>
                )}
              </div>
              
              {!file && (
                <p className="text-sm text-dim text-center uppercase tracking-wider opacity-60">
                  Note: Upload an audio track to directly execute analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Analysis profile settings" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-bg-panel border border-border-dim rounded-xl p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in">
            {activeProfile && (
              <Button
                aria-label="Close profile settings" onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-5 right-5 text-dim hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
            
            {profileStep === 1 ? (
              <>
                <div className="mb-6 text-center">
                  <div className="inline-flex p-3 rounded-full bg-accent/10 border border-accent/20 mb-3 text-accent">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-primary uppercase tracking-[0.2em]">
                    Choose your analysis profile
                  </h3>
                  <p className="text-sm text-dim uppercase tracking-widest mt-1.5 max-w-md mx-auto leading-relaxed">
                    Choose the musical perspective for your annotations. You can change it at any time.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center items-center gap-4 mb-6">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-accent text-bg-main text-sm font-black flex items-center justify-center">1</span>
                    <span className="text-sm font-bold text-accent uppercase tracking-wider">Analysis profile</span>
                  </div>
                  <div className="w-8 h-[1px] bg-bg-card" />
                  <div className="flex items-center gap-1.5 opacity-100">
                    <span className="w-4 h-4 rounded-full bg-bg-card text-primary text-sm font-black flex items-center justify-center">2</span>
                    <span className="text-sm font-bold text-primary uppercase tracking-wider">Annotation Style</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROFILES.map((profile) => (
                    <Button
                      key={profile.id}
                      onClick={() => setTempProfile(profile.id)}
                      className={cn(
                        "text-left p-5 rounded-lg border transition-all flex flex-col gap-2 group cursor-pointer relative overflow-hidden",
                        tempProfile === profile.id
                          ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(215,183,139,0.1)]"
                          : "border-border-dim bg-bg-card hover:bg-bg-card hover:border-border-dim"
                      )}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-black uppercase tracking-[0.15em] text-primary group-hover:text-accent transition-colors">
                          {profile.label}
                        </span>
                        {tempProfile === profile.id && (
                          <span className="text-sm uppercase tracking-widest font-black text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/25">
                            SELECTED
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-dim leading-relaxed font-medium">
                        {profile.desc}
                      </p>
                      
                      <div className="mt-1 pt-2 border-t border-border-dim w-full">
                        <span className="text-sm uppercase tracking-widest font-black text-accent/70 block mb-0.5">
                          SOP Section Formula
                        </span>
                        <span className="text-sm font-mono text-primary block truncate leading-normal">
                          {profile.formula}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="flex justify-center mt-8">
                  {tempProfile ? (
                    <Button
                      onClick={() => setProfileStep(2)}
                      className="py-3 px-10 bg-accent text-bg-main font-bold text-sm uppercase tracking-[0.2em] rounded-sm hover:bg-accent/90 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(215,183,139,0.15)]"
                    >
                      Continue
                    </Button>
                  ) : (
                    <p className="text-sm text-accent/60 uppercase tracking-widest animate-pulse font-bold">
                      Select a profile above to continue
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="inline-flex p-3 rounded-full bg-accent/10 border border-accent/20 mb-3 text-accent">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-primary uppercase tracking-[0.2em]">
                    Writing style
                  </h3>
                  <p className="text-sm text-dim uppercase tracking-widest mt-1.5 max-w-md mx-auto leading-relaxed">
                    
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center items-center gap-4 mb-8">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <span className="w-4 h-4 rounded-full bg-bg-card text-primary text-sm font-black flex items-center justify-center">1</span>
                    <span className="text-sm font-bold text-primary uppercase tracking-wider">Analysis profile</span>
                  </div>
                  <div className="w-8 h-[1px] bg-bg-card" />
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-accent text-bg-main text-sm font-black flex items-center justify-center">2</span>
                    <span className="text-sm font-bold text-accent uppercase tracking-wider">Annotation Style</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
                  <Button
                    onClick={() => setTempAnnotationProfile("default")}
                    className={cn(
                      "text-left p-6 rounded-lg border transition-all flex flex-col gap-3 group cursor-pointer relative overflow-hidden",
                      tempAnnotationProfile === "default"
                        ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(215,183,139,0.1)]"
                        : "border-border-dim bg-bg-card hover:bg-bg-card hover:border-border-dim"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-black uppercase tracking-[0.15em] text-primary group-hover:text-accent transition-colors">
                        Default Style
                      </span>
                      {tempAnnotationProfile === "default" && (
                        <span className="text-sm uppercase tracking-widest font-black text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/25">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dim leading-relaxed font-medium">
                      Standard detailed outputs based on the specific annotation formulas and musicology template per account.
                    </p>
                  </Button>

                  <Button
                    onClick={() => setTempAnnotationProfile("brief")}
                    className={cn(
                      "text-left p-6 rounded-lg border transition-all flex flex-col gap-3 group cursor-pointer relative overflow-hidden",
                      tempAnnotationProfile === "brief"
                        ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(215,183,139,0.1)]"
                        : "border-border-dim bg-bg-card hover:bg-bg-card hover:border-border-dim"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-black uppercase tracking-[0.15em] text-primary group-hover:text-accent transition-colors">
                        Brief & Concise
                      </span>
                      {tempAnnotationProfile === "brief" && (
                        <span className="text-sm uppercase tracking-widest font-black text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/25">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dim leading-relaxed font-medium">
                      Forces outputs to have a more human, conversational tone, removes AI slop phrases, and strictly limits fields to short, simple sentences.
                    </p>
                  </Button>
                </div>

                <div className="flex justify-center gap-4 mt-10">
                  <Button
                    onClick={() => setProfileStep(1)}
                    className="py-3 px-6 bg-bg-card hover:bg-bg-card text-primary font-bold text-sm uppercase tracking-[0.2em] rounded-sm transition-all border border-border-dim cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveProfile(tempProfile);
                      setAnnotationProfile(tempAnnotationProfile);
                      localStorage.setItem("active_profile", tempProfile);
                      localStorage.setItem("annotation_profile", tempAnnotationProfile);
                      setIsProfileModalOpen(false);
                    }}
                    className="py-3 px-8 bg-accent text-bg-main font-bold text-sm uppercase tracking-[0.2em] rounded-sm hover:bg-accent/90 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(215,183,139,0.15)]"
                  >
                    Save profile
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
