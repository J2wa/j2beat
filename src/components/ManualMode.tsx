import { paidGeminiHeaders } from '../services/paidGemini';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Flag, Play, Sparkles, X } from 'lucide-react';
import { parseMusicSuggestions, addConfirmedInstrument, type MusicSuggestion } from '../../shared/musicSuggestions';
import { parseGlobalSuggestions, type GlobalSuggestion, type GlobalSuggestionField, type GlobalSuggestions } from '../../shared/globalSuggestions';
import { SECTION_GROUPS, SECTION_TYPES } from '../../shared/annotationSections';
import { TEMPO_BUCKETS } from '../../shared/goldenAnnotation';
import { mergeSplitMarks, displayTimestamp, timestampSeconds } from '../../shared/manualSegments';
import { splitResearch, researchAsMarkdown } from '../../shared/research';
import { annotateAudio, suggestAudio, suggestGlobalAudio } from '../services/geminiService';
import { automaticallyHumanize } from '../services/humanizerService';
import { DEFAULT_MODEL, GEMINI_NEON_MODEL, MODEL_OPTIONS, type ModelId } from '../../shared/models';
import { parseAnnotation } from '../utils/annotationForm';
import {
  COMMON_INSTRUMENTS, MOODS, QUESTIONS, QUESTION_GROUPS, GAP_MARKER,
  manualRow, emptySong, itemList, missingInstruments, sectionEnd, buildManualInput, prepareManualDraft,
  type ManualSheet, type ManualRow,
} from '../utils/manualEvaluation';

const STORAGE_KEY = 'aces_guided_manual';
const PlayingTechniquePicker = lazy(() => import('./PlayingTechniquePicker'));
const STEPS = ['Mark sections', 'Describe each section', 'Whole song', 'Finish'];
const TITLES = ['Mark where the song changes', 'Describe what you hear', 'Tell us about the whole song', 'Check the write-up, then copy it'];
const INSTRUCTIONS = [
  'Listen through once. Mark each meaningful change, then choose a type for the sections you found.',
  'Work through one section at a time. Name the instruments you recognize and describe what they do.',
  'Short notes are enough. Skip anything you cannot hear and come back to it during review.',
  'Read the draft against the recording. If something is missing or inaccurate, fix your notes and write it up again.',
];

type Props = {
  active: boolean;
  neonAvailable: boolean;
  marksRequest: {id: number; times: number[]};
  playerMarks: number[];
  file: File | null;
  duration: number;
  currentTime: number;
  renderPlayer: (sectionStarts: number[], canMark: boolean) => ReactNode;
  onSeek: (time: number) => void;
  onPlaySection: (start: number, end: number) => void;
  onComplete: (text: string) => void;
  onBusy: (busy: boolean) => void;
};

function loadSheet(): ManualSheet {
  const initial = {rows: [manualRow('0:00')], notes: {}, tags: {}, song: emptySong};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(saved?.rows) && saved.rows.length &&
      saved.rows.every((row: unknown) => row && typeof row === 'object' && Object.keys(manualRow()).every(key => typeof (row as Record<string, unknown>)[key] === 'string'))) {
      return {rows: saved.rows, notes: saved.notes ?? {}, tags: saved.tags ?? {}, song: {...emptySong, ...saved.song}};
    }
  } catch { /* A fresh sheet is available when browser storage is unavailable. */ }
  return initial;
}

type Gap = {message: string; step: number; section?: number; group?: number};
type WholeSongQuestion = typeof QUESTIONS[number];

function reviewText(text: string) {
  return text.split(/(\[NEEDS INPUT:[^\]]+\])/gi).map((part, index) => /^\[NEEDS INPUT:/i.test(part)
    ? <mark key={index}>{part.replace(/^\[NEEDS INPUT:\s*/i, 'Missing: ').slice(0, -1)}</mark>
    : part);
}

export function ManualMode({active, neonAvailable, marksRequest, playerMarks, file, duration, currentTime, renderPlayer, onSeek, onPlaySection, onComplete, onBusy}: Props) {
  const [sheet, setSheet] = useState(loadSheet);
  const {rows, notes, tags, song} = sheet;
  const starts = useMemo(() => rows.map(row => timestampSeconds(row.start)), [rows]);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [selected, setSelected] = useState(0);
  const [group, setGroup] = useState<number | null>(0);
  const [preferredModel, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const model = preferredModel === GEMINI_NEON_MODEL && !neonAvailable ? DEFAULT_MODEL : preferredModel;
  const [useAudio, setUseAudio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [stored, setStored] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [draft, setDraft] = useState<{text: string; sheet: ManualSheet; track: File; useAudio: boolean}>();
  const [suggestions, setSuggestions] = useState<{kind: 'splits' | 'instruments'; sections: MusicSuggestion[]}>();
  const [techniquesOpen, setTechniquesOpen] = useState(false);
  const [globalSuggestions, setGlobalSuggestions] = useState<{track: File; duration: number; model: ModelId; values: GlobalSuggestions}>();
  const [globalSuggestionField, setGlobalSuggestionField] = useState<GlobalSuggestionField>();
  const [globalSuggestionError, setGlobalSuggestionError] = useState('');
  const lastMarks = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const instrumentInput = useRef<HTMLInputElement>(null);
  const moodInput = useRef<HTMLInputElement>(null);
  const currentFile = useRef(file);
  currentFile.current = file;

  const currentIndex = Math.min(selected, rows.length - 1);
  const section = rows[currentIndex];
  const trackEnd = Math.floor(duration);
  const timingError = !file || trackEnd <= 0
    ? 'Load an audio file to mark its sections.'
    : starts.some((start, index) => !Number.isFinite(start) || start < 0 || start >= trackEnd || (index === 0 ? start !== 0 : start <= starts[index - 1]))
      ? 'Start at 0:00. Enter increasing M:SS times before the end of the song.'
      : '';
  const longSections = rows.filter((_, index) => sectionEnd(rows, index, duration) - starts[index] > 60).length;
  const applicable = QUESTIONS.filter(question => !song.instrumental || question.group !== 1);
  const unanswered = applicable.filter(question => !notes[question.label]?.trim());
  const review = useMemo(() => draft ? parseAnnotation(draft.text) : undefined, [draft]);
  const stale = !!draft && (draft.sheet !== sheet || draft.track !== file || draft.useAudio !== useAudio);
  const wholeSongCandidates = globalSuggestions && globalSuggestions.track === file && globalSuggestions.duration === duration && globalSuggestions.model === model
    ? globalSuggestions.values : undefined;
  const trackInstruments = useMemo(() => [...new Set(rows.flatMap(row => itemList(row.instruments)).filter(name => name.toLowerCase() !== 'none'))], [rows]);
  const tempoTags = itemList(tags.tempoRhythmGroove ?? '');
  const tempoBucket = TEMPO_BUCKETS.find(bucket => tempoTags.some(tag => tag.toLowerCase() === bucket.toLowerCase()));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet));
      setStored(true);
    } catch { setStored(false); }
  }, [sheet]);

  useEffect(() => {
    setSuggestions(undefined);
    setGlobalSuggestions(undefined);
    setGlobalSuggestionField(undefined);
    setGlobalSuggestionError('');
    setTechniquesOpen(false);
    setConfirmed(false);
    setDraft(undefined);
    setStep(0);
    setFurthest(0);
  }, [file]);

  useEffect(() => {
    if (!active || !duration || busy || !marksRequest.id || marksRequest.id === lastMarks.current) return;
    lastMarks.current = marksRequest.id;
    addMarks(marksRequest.times);
  }, [active, marksRequest, duration, busy]);

  useEffect(() => {
    if (!busy) return;
    const update = (event: Event) => setStage((event as CustomEvent<string>).detail);
    window.addEventListener('analysis-progress', update);
    return () => window.removeEventListener('analysis-progress', update);
  }, [busy]);

  function goTo(next: number, index?: number) {
    if ((next === 1 || next === 2) && timingError) {
      setError(timingError);
      return;
    }
    setError('');
    setNotice('');
    setStep(next);
    setFurthest(previous => Math.max(previous, next));
    if (index !== undefined) setSelected(index);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function updateRow(index: number, key: keyof ManualRow, value: string) {
    if (key === 'start') setSuggestions(undefined);
    setSheet(previous => ({...previous, rows: previous.rows.map((row, i) => i === index ? {...row, [key]: value} : row)}));
  }

  function addMarks(times: number[], type = '') {
    const next = mergeSplitMarks(rows, times, duration, time => ({...manualRow(time), type}));
    if (next.length === rows.length) {
      setNotice('No new boundary. Choose a different position inside the song.');
      return;
    }
    setSheet(previous => ({...previous, rows: next}));
    setNotice(`Added ${next.length - rows.length} section ${next.length - rows.length === 1 ? 'start' : 'starts'}.`);
  }

  function removeRow(index: number) {
    setSuggestions(undefined);
    setSheet(previous => ({...previous, rows: previous.rows.filter((_, i) => i !== index)}));
  }

  function addItem(index: number, key: 'instruments' | 'vibe', value: string) {
    const next = itemList(value).reduce((previous, item) => addConfirmedInstrument(previous, item), rows[index][key]);
    if (next !== rows[index][key]) updateRow(index, key, next);
  }

  async function requestSuggestions(kind: 'splits' | 'instruments') {
    if (!file || busy || trackEnd < 2 || (kind === 'instruments' && timingError)) return;
    const expectedStarts = kind === 'instruments' ? starts : undefined;
    setBusy(true);
    onBusy(true);
    setStage(kind === 'splits' ? 'Listening for section changes' : 'Listening for instruments');
    setError('');
    setNotice('');
    try {
      const text = await suggestAudio(file, duration, model, expectedStarts);
      if (currentFile.current === file) setSuggestions({kind, sections: parseMusicSuggestions(text, duration, expectedStarts)});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suggestions could not be loaded.');
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  async function requestGlobalSuggestion(field: GlobalSuggestionField) {
    if (!file || trackEnd < 1 || busy) return;
    setGlobalSuggestionField(field);
    setGlobalSuggestionError('');
    if (wholeSongCandidates) return;
    setBusy(true);
    onBusy(true);
    setStage('Listening for whole-song suggestions');
    setError('');
    setNotice('');
    try {
      const values = parseGlobalSuggestions(await suggestGlobalAudio(file, duration, model));
      if (currentFile.current === file) setGlobalSuggestions({track: file, duration, model, values});
    } catch (cause) {
      if (currentFile.current === file) setGlobalSuggestionError(cause instanceof Error ? cause.message : 'Could not suggest an answer. Please try again.');
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  function addGlobalObservation(question: WholeSongQuestion, observation: GlobalSuggestion) {
    setSheet(previous => {
      const notes = previous.notes[question.label] ?? '';
      const tags = previous.tags[question.key] ?? '';
      const alreadyNoted = notes.split('\n').some(line => line.trim().toLowerCase() === observation.notes.toLowerCase());
      const nextNotes = alreadyNoted ? notes : [notes.trimEnd(), observation.notes].filter(Boolean).join('\n');
      const nextTags = observation.tags.reduce(addConfirmedInstrument, tags);
      if (nextNotes === notes && nextTags === tags) return previous;
      return {...previous, notes: {...previous.notes, [question.label]: nextNotes}, tags: {...previous.tags, [question.key]: nextTags}};
    });
  }

  async function writeUp() {
    if (!file || busy || timingError) return;
    setBusy(true);
    onBusy(true);
    setStage(useAudio ? 'Preparing audio' : 'Writing from your notes');
    setError('');
    setNotice('');
    try {
      const input = buildManualInput(sheet, duration);
      let text: string;
      if (useAudio) {
        const guidance = 'Use the supplied section starts and labels. Verify observations by listening. Fill only audible gaps, and mark unresolved details [NEEDS INPUT: reason].\n\n' + input;
        const annotation = await annotateAudio(file, true, true, guidance, duration, model);
        setStage('Finishing wording');
        text = (await automaticallyHumanize(annotation, model)).text;
      } else {
        const response = await fetch('/api/manual', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', ...paidGeminiHeaders(model)},
          body: JSON.stringify({text: input, model}),
          signal: AbortSignal.timeout(125000),
        });
        const result = await response.json();
        if (!response.ok || typeof result.text !== 'string' || !result.text.trim()) throw Error(result.error || 'The write-up failed. Your notes are saved.');
        text = result.text;
      }
      if (currentFile.current !== file) return;
      setDraft({text: prepareManualDraft(text, sheet, useAudio), sheet, track: file, useAudio});
      setConfirmed(false);
      goTo(3);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The write-up failed. Your notes are saved.');
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  const gaps: Gap[] = [];
  if (review && !stale) {
    if (timingError) gaps.push({message: timingError, step: 0});
    rows.forEach((row, index) => {
      const time = row.start;
      if (sectionEnd(rows, index, duration) - starts[index] > 60) gaps.push({message: `${time}: split this section into parts of 60 seconds or less.`, step: 0});
      if (!useAudio && !row.type) gaps.push({message: `${time}: choose a section type.`, step: 0});
      const written = review.sections.find(item => timestampSeconds(item.startTime) === starts[index]);
      if (!itemList(useAudio ? written?.instruments ?? row.instruments : row.instruments).length && !/^silence$/i.test(row.type)) {
        gaps.push({message: `${time}: name the instruments you can hear, or enter “None” for a quiet section.`, step: 1, section: index});
      }
      const unlisted = missingInstruments(row);
      if (unlisted.length) gaps.push({message: `${time}: your notes mention ${unlisted.join(', ')} but the instrument list does not.`, step: 1, section: index});
      for (const flag of written?.description.matchAll(GAP_MARKER) ?? []) gaps.push({message: `${time}: ${flag[1]}`, step: 1, section: index});
    });
    for (const question of applicable) {
      const prose = review.globalMetadata[question.key];
      const flag = [...(prose ?? '').matchAll(GAP_MARKER)][0]?.[1];
      if (!prose || flag) gaps.push({message: flag || question.prompt, step: 2, group: question.group});
    }
    // The provider may flag other fields outside the narrative and global answers.
    if (!gaps.length && [...(draft?.text ?? '').matchAll(GAP_MARKER)].length) {
      gaps.push({message: 'Resolve the Missing notes in the write-up.', step: 1});
    }
  }
  const exportReady = !!draft && !stale && !gaps.length && confirmed && !busy;

  async function copyDraft(unfinished = false) {
    if (!draft || (!unfinished && !exportReady)) return;
    const {annotation, research} = splitResearch(draft.text);
    const warnings = unfinished && (stale || gaps.length)
      ? ['Unfinished manual annotation', ...(stale ? ['The notes changed after this write-up.'] : []), ...gaps.map(gap => 'Missing: ' + gap.message), ''].join('\n') + '\n'
      : '';
    try {
      await navigator.clipboard.writeText(warnings + annotation + researchAsMarkdown(research));
      setError('');
      setNotice(unfinished ? 'Draft copied with review notes.' : 'Annotation copied.');
    } catch { setError('Copy failed. Select the write-up and copy it manually.'); }
  }

  async function downloadPDF() {
    if (!draft || !exportReady) return;
    try {
      const {exportSavedPDF} = await import('../utils/pdfGenerator');
      exportSavedPDF(song.title || file?.name || 'Manual annotation', draft.text, new Date().toISOString());
    } catch { setError('Could not create the PDF. Please try again.'); }
  }

  function fixGap(gap: Gap) {
    if (gap.group !== undefined) setGroup(gap.group);
    goTo(gap.step, gap.section);
  }

  function seek(time: number) {
    if (file && Number.isFinite(time)) onSeek(time);
  }

  const rowLabel = (row: ManualRow, index: number) => row.type || `Section ${index + 1}`;
  const noteField = (key: 'parts' | 'vocals' | 'melody' | 'changes', label: string, hint: string, bookRows = 2) => (
    <label className="guide-field">
      <span>{label}</span>
      <textarea rows={bookRows} value={section[key]} placeholder={hint} onChange={event => updateRow(currentIndex, key, event.target.value)} />
    </label>
  );

  return (
    <>
      {active && (
        <header className="manual-guide guide-header">
          <nav aria-label="Manual evaluation steps">
            <ol className="guide-steps">
              {STEPS.map((label, index) => (
                <li key={label}>
                  <button type="button" aria-current={step === index ? 'step' : undefined} disabled={busy || index > furthest} onClick={() => goTo(index)}>
                    <span className="guide-step-number" aria-hidden="true">{index < step ? <Check size={15}/> : index + 1}</span>
                    {label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="guide-heading">
            <div>
              <p className="guide-caption">Step {step + 1} of {STEPS.length}{step === 1 && ` · Section ${currentIndex + 1} of ${rows.length}`}</p>
              <h2 tabIndex={-1} ref={heading}>{TITLES[step]}</h2>
              <p>{INSTRUCTIONS[step]}</p>
            </div>
            <span className="guide-save">{stored ? <><Check size={15}/> Draft saved on this device</> : 'Draft in this tab'}</span>
          </div>
        </header>
      )}
      {renderPlayer([...new Set(starts.filter(start => Number.isFinite(start) && start >= 0 && start < trackEnd))], step === 0)}
      {active && (
        <section id="manual-annotation" className="manual-guide guide-content" aria-label="Manual evaluation" aria-busy={busy}>
          {busy && <p className="guide-banner" role="status">{stage}…</p>}
          {notice && <p className="guide-banner" role="status">{notice}</p>}
          {error && <p className="guide-banner guide-warning" role="alert">{error}</p>}
          <fieldset className="guide-fields" disabled={busy}>
            {step === 0 && (
              <>
                <div className="guide-actions guide-mark-tools">
                  <button type="button" className="aces-button aces-button--primary" disabled={!file || !trackEnd} onClick={() => addMarks([currentTime])}><Flag size={17}/> Mark a section here <kbd>M</kbd></button>
                  {playerMarks.length > 0 && <button type="button" className="aces-button" disabled={!file} onClick={() => addMarks(playerMarks)}>Use player marks</button>}
                  <button type="button" className="aces-button aces-button--text" disabled={!file || trackEnd < 2} onClick={() => void requestSuggestions('splits')}>Suggest section times</button>
                </div>
                <div className="guide-mark-grid">
                  <section className="guide-card">
                    <h3>Your sections</h3>
                    <div className="guide-section-table">
                      <div className="guide-section-labels" aria-hidden="true"><span>Starts at</span><span>What is it?</span><span>Length</span><span/></div>
                      {rows.map((row, index) => {
                        const length = sectionEnd(rows, index, duration) - starts[index];
                        return (
                          <div className="guide-section-row" key={index}>
                            <div className="guide-start">
                              <input aria-label={`Section ${index + 1} start time`} value={row.start} onChange={event => updateRow(index, 'start', event.target.value)} />
                              <button type="button" className="aces-button aces-button--text" aria-label={`Seek to section ${index + 1}`} disabled={!file || !Number.isFinite(starts[index])} onClick={() => seek(starts[index])}><Play size={15}/></button>
                            </div>
                            <select aria-label={`Section ${index + 1} type`} value={row.type} onChange={event => updateRow(index, 'type', event.target.value)}>
                              <option value="">Choose type</option>
                              {row.type && !SECTION_TYPES.includes(row.type) && <option value={row.type}>{row.type} (saved)</option>}
                              {SECTION_GROUPS.map(({label, sections}) => <optgroup key={label} label={label}>
                                {sections.map(([type]) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
                              </optgroup>)}
                            </select>
                            <span className={length > 60 ? 'guide-long' : ''}>{length > 0 ? `${length}s` : '—'}</span>
                            <button type="button" className="aces-button aces-button--text" aria-label={`Remove section ${index + 1}`} disabled={index === 0} onClick={() => removeRow(index)}><X size={17}/></button>
                          </div>
                        );
                      })}
                    </div>
                    <p className={`guide-banner ${timingError && file || longSections ? 'guide-warning' : ''}`}>
                      {timingError || (longSections ? `${longSections} ${longSections === 1 ? 'section is' : 'sections are'} longer than 60 seconds. Listen for another change and add a mark.` : 'Your sections cover the whole song. Each is 60 seconds or shorter.')}
                    </p>
                  </section>
                  <aside className="guide-card guide-change-help">
                    <h3>What counts as a change?</h3>
                    <ul>
                      <li>An instrument comes in or drops out.</li>
                      <li>The drums change or stop.</li>
                      <li>The chords move somewhere new.</li>
                      <li>The singing changes.</li>
                    </ul>
                    <p>Keep brief fills, ad-libs, and slides inside the current section. For a long section, listen for a smaller change near 50 seconds.</p>
                    <p>Start at 0:00 and choose the label that fits what you hear. When a section returns, add a row and reuse its label.</p>
                  </aside>
                </div>
              </>
            )}

            {step === 1 && (
              <div className="guide-describe-grid">
                <aside className="guide-card guide-section-nav">
                  <h3>Your sections</h3>
                  {rows.map((row, index) => (
                    <button type="button" key={index} aria-current={index === currentIndex ? 'true' : undefined} onClick={() => goTo(1, index)}>
                      <time>{row.start}</time><span>{rowLabel(row, index)}</span>
                      {!!row.instruments.trim() && !!row.parts.trim() && <Check size={15}/>}
                    </button>
                  ))}
                </aside>
                <div className="guide-section-editor" key={currentIndex}>
                  <section className="guide-card guide-editor-header">
                    <div><h3>{rowLabel(section, currentIndex)}</h3><p>{section.start} to {displayTimestamp(sectionEnd(rows, currentIndex, duration))}</p></div>
                    <button type="button" className="aces-button" disabled={!!timingError} onClick={() => onPlaySection(starts[currentIndex], currentIndex + 1 < rows.length ? starts[currentIndex + 1] : duration)}><Play size={16}/> Play this section at half speed</button>
                  </section>
                  <section className="guide-card">
                    <h3>Which instruments can you hear?</h3>
                    <p>Only add the ones you are sure about. Skip sounds you cannot name.</p>
                    <div className="guide-chips">
                      {itemList(section.instruments).map((item, index) => (
                        <button type="button" className="guide-chip" key={index} aria-label={`Remove ${item}`} onClick={() => updateRow(currentIndex, 'instruments', itemList(section.instruments).filter((_, i) => i !== index).join(', '))}>{item}<X size={14}/></button>
                      ))}
                    </div>
                    <div className="guide-add">
                      <input placeholder="Type an instrument" aria-label="Type an instrument" ref={instrumentInput} onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); addItem(currentIndex, 'instruments', event.currentTarget.value); event.currentTarget.value = ''; }
                      }}/>
                      <button type="button" className="aces-button" onClick={() => {
                        if (!instrumentInput.current) return;
                        addItem(currentIndex, 'instruments', instrumentInput.current.value);
                        instrumentInput.current.value = '';
                      }}>Add</button>
                    </div>
                    <div className="guide-chips">
                      {COMMON_INSTRUMENTS.filter(item => !itemList(section.instruments).some(name => name.toLowerCase() === item.toLowerCase())).slice(0, 8).map(item => (
                        <button type="button" key={item} className="guide-chip guide-chip-option" onClick={() => addItem(currentIndex, 'instruments', item)}>+ {item}</button>
                      ))}
                    </div>
                    <button type="button" className="aces-button aces-button--text" disabled={!!timingError} onClick={() => void requestSuggestions('instruments')}>Suggest instruments</button>
                  </section>
                  <section className="guide-card">
                    <h3>What is each one doing?</h3>
                    <p>Use one line per instrument. Note its role and how it fits with the other parts.</p>
                    {noteField('parts', 'Listening notes', 'Acoustic guitar, soft fingerpicked chords\nBass, follows the kick', 5)}
                    {missingInstruments(section).map(item => (
                      <div className="guide-banner guide-warning guide-inline" key={item}>
                        <span>{item} is in your notes but missing from the list.</span>
                        <button type="button" className="aces-button" onClick={() => addItem(currentIndex, 'instruments', item)}>Add {item.toLowerCase()}</button>
                      </div>
                    ))}
                  </section>
                  <section className="guide-card">
                    <h3>How does it feel?</h3>
                    <div className="guide-chips">
                      {[...new Set([...MOODS, ...itemList(section.vibe)])].map(mood => {
                        const chosen = itemList(section.vibe).includes(mood);
                        return <button type="button" className="guide-chip" key={mood} aria-pressed={chosen} onClick={() => chosen ? updateRow(currentIndex, 'vibe', itemList(section.vibe).filter(item => item !== mood).join(', ')) : addItem(currentIndex, 'vibe', mood)}>{mood}</button>;
                      })}
                    </div>
                    <div className="guide-add">
                      <input aria-label="Add a mood word" placeholder="Add a mood word" ref={moodInput} onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); addItem(currentIndex, 'vibe', event.currentTarget.value); event.currentTarget.value = ''; }
                      }}/>
                      <button type="button" className="aces-button" onClick={() => {
                        if (!moodInput.current) return;
                        addItem(currentIndex, 'vibe', moodInput.current.value);
                        moodInput.current.value = '';
                      }}>Add word</button>
                    </div>
                  </section>
                  <details className="guide-card">
                    <summary>Optional: vocals, melody and changes</summary>
                    <div className="guide-stack">
                      {noteField('vocals', 'What do the vocals sound like?', 'Phrasing, delivery, or harmonies')}
                      {noteField('melody', 'Melody', 'Use a full sentence about a clear instrumental melody, or leave this blank.', 2)}
                      <p>Describe vocal melody here for a cappella, aria, or choral music. Keep rhythm, chords, and key in their own fields.</p>
                      {noteField('changes', 'What changes in this section?', currentIndex === rows.length - 1
                        ? 'Include how the recording ends, such as a fade, cut, or held note.'
                        : 'Something enters, leaves, or shifts. Include a time if known.')}
                    </div>
                  </details>
                </div>
              </div>
            )}

            {suggestions && ((step === 0 && suggestions.kind === 'splits') || step === 1) && (
              <section className="guide-card guide-suggestions">
                <div className="guide-inline"><h3>{step === 0 ? 'Suggested section starts' : 'Suggested instruments'}</h3><button type="button" className="aces-button aces-button--text" onClick={() => setSuggestions(undefined)}>Dismiss</button></div>
                <p>Listen to check a suggestion before adding it.</p>
                {suggestions.sections.filter(suggestion => step === 0 || suggestion.start === starts[currentIndex]).map(suggestion => {
                  const index = starts.indexOf(suggestion.start);
                  return (
                    <article key={suggestion.start} className="guide-suggestion">
                      <div className="guide-inline">
                        <strong>{displayTimestamp(suggestion.start)} · {suggestion.label}</strong>
                        <div className="guide-actions">
                          <button type="button" className="aces-button" onClick={() => seek(suggestion.start)}>Seek</button>
                          {suggestions.kind === 'splits' && <button type="button" className="aces-button" disabled={index >= 0 && !!rows[index].type} onClick={() => {
                            const label = suggestion.label.toLowerCase();
                            const type = SECTION_TYPES.includes(label) ? label : 'section';
                            if (index >= 0) updateRow(index, 'type', type);
                            else addMarks([suggestion.start], type);
                          }}>{index < 0 ? 'Add time' : rows[index].type ? 'Added' : 'Use label'}</button>}
                        </div>
                      </div>
                      <p>{suggestion.reason}</p>
                      {step === 1 && suggestion.instruments.map(instrument => {
                        const added = itemList(rows[index]?.instruments || '').some(name => name.toLowerCase() === instrument.name.toLowerCase());
                        return (
                          <div className="guide-inline" key={instrument.name}>
                            <p><strong>{instrument.name}</strong> · {instrument.reason}</p>
                            <button type="button" className="aces-button" disabled={index < 0 || added} onClick={() => addItem(index, 'instruments', instrument.name)}>{added ? 'Added' : 'Confirm & add'}</button>
                          </div>
                        );
                      })}
                      {step === 1 && suggestion.instruments.length === 0 && <p>No instrument candidates for this section.</p>}
                    </article>
                  );
                })}
              </section>
            )}
            {step === 2 && (
              <div className="guide-stack guide-whole-song">
                <section className="guide-card">
                  <h3>The song</h3>
                  <div className="guide-song-fields">
                    {([['title', 'Title'], ['artist', 'Song by'], ['version', 'Which version?'], ['performers', 'Performing artists (optional)']] as const).map(([key, label]) => (
                      <label className="guide-field" key={key}>
                        <span>{label}</span>
                        <input value={song[key]} onChange={event => setSheet(previous => ({...previous, song: {...previous.song, [key]: event.target.value}}))}/>
                      </label>
                    ))}
                  </div>
                  <label className="guide-check">
                    <input type="checkbox" checked={song.instrumental} onChange={event => setSheet(previous => ({...previous, song: {...previous.song, instrumental: event.target.checked}}))}/>
                    No singing in this song
                  </label>
                </section>
                {QUESTION_GROUPS.map((label, index) => {
                  const questions = applicable.filter(question => question.group === index);
                  return (
                    <section className="guide-card guide-question-group" key={label}>
                      <button type="button" className="guide-group-toggle" aria-expanded={group === index} aria-controls={`guide-group-${index}`} onClick={() => setGroup(group === index ? null : index)}>
                        <span>{label}</span>
                        <small>{questions.length ? `${questions.length - unanswered.filter(question => question.group === index).length} of ${questions.length} answered` : 'Not applicable'}</small>
                      </button>
                      <div id={`guide-group-${index}`} hidden={group !== index} className="guide-group-body">
                        {!questions.length && <p>Voice and lyrics will be marked N/A.</p>}
                        {questions.map(question => {
                          const open = globalSuggestionField === question.key;
                          const candidate = wholeSongCandidates?.[question.key];
                          return (
                            <div className="guide-question" key={question.key}>
                              {question.key === 'tempoRhythmGroove' && <label className="guide-field">
                                <span>Tempo</span>
                                <select value={tempoBucket ?? ''} onChange={event => {
                                  const bucket = event.target.value;
                                  const otherTags = tempoTags.filter(tag => !TEMPO_BUCKETS.some(option => tag.toLowerCase() === option.toLowerCase()));
                                  const value = [bucket, ...otherTags].filter(Boolean).join(', ');
                                  setSheet(previous => ({...previous, tags: {...previous.tags, tempoRhythmGroove: value}}));
                                }}>
                                  <option value="">Choose a tempo</option>
                                  {TEMPO_BUCKETS.map(bucket => <option key={bucket}>{bucket}</option>)}
                                </select>
                              </label>}
                              <label className="guide-field">
                                <span>{question.prompt}</span>
                                <small>{question.hint}</small>
                                <textarea rows={2} value={notes[question.label] ?? ''} onChange={event => setSheet(previous => ({...previous, notes: {...previous.notes, [question.label]: event.target.value}}))}/>
                              </label>
                              <input aria-label={`${question.label} tags`} placeholder="Tags, separated by commas (optional)" value={tags[question.key] ?? ''} onChange={event => setSheet(previous => ({...previous, tags: {...previous.tags, [question.key]: event.target.value}}))}/>
                              <div className="guide-actions">
                                <button type="button" className="aces-button" aria-label={`Suggest ${question.label} with AI`} aria-expanded={open} aria-controls={`guide-ai-${question.key}`} disabled={!file || trackEnd < 1} onClick={() => void requestGlobalSuggestion(question.key)}><Sparkles size={15} aria-hidden="true"/> Suggest with AI</button>
                                {question.key === 'instrumentation' && <button type="button" className="aces-button aces-button--text" onClick={() => {
                                  const value = trackInstruments.reduce(addConfirmedInstrument, tags.instrumentation ?? '');
                                  setSheet(previous => ({...previous, tags: {...previous.tags, instrumentation: value}}));
                                }}>Add instrument tags from sections</button>}
                              </div>
                              <div id={`guide-ai-${question.key}`} hidden={!open}>
                                {open && <div className="guide-ai-candidate">
                                  {busy ? <p role="status">Listening to the recording…</p>
                                    : globalSuggestionError ? <p role="alert">{globalSuggestionError}</p>
                                    : candidate ? <>
                                      <p><strong>AI suggestion</strong></p>
                                      <p>{candidate.notes}</p>
                                      {candidate.tags.length > 0 && <p><small>Suggested tags: {candidate.tags.join(', ')}</small></p>}
                                    </> : <p>No clear suggestion for this field. Add what you can hear.</p>}
                                  {!busy && <div className="guide-actions">
                                    {candidate && <button type="button" className="aces-button aces-button--primary" onClick={() => {
                                      addGlobalObservation(question, candidate);
                                      setGlobalSuggestionField(undefined);
                                    }}>Add suggestion</button>}
                                    <button type="button" className="aces-button aces-button--text" onClick={() => setGlobalSuggestionField(undefined)}>Dismiss</button>
                                  </div>}
                                </div>}
                              </div>
                              {question.key === 'playingStyle' && <details className="guide-technique-picker" onToggle={event => setTechniquesOpen(event.currentTarget.open)}>
                                <summary>Choose playing techniques</summary>
                                {techniquesOpen && <Suspense fallback={<p role="status">Loading playing techniques…</p>}>
                                  <PlayingTechniquePicker trackInstruments={trackInstruments} onAdd={(technique, instrument) => addGlobalObservation(question, {
                                    notes: instrument ? `${instrument}: ${technique}` : technique,
                                    tags: [technique.replace(/,/g, ' /')],
                                  })}/>
                                </Suspense>}
                              </details>}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                <details className="guide-card guide-settings">
                  <summary>Write-up settings</summary>
                  <label className="guide-check"><input type="checkbox" checked={useAudio} onChange={event => setUseAudio(event.target.checked)}/> Let AI listen and fill in audible gaps</label>
                  <p>{useAudio ? 'This sends the recording to the selected AI provider for analysis.' : 'The writer receives your notes and marks unresolved fields as Missing.'} English, Tagalog, and Taglish notes are welcome.</p>
                  <label className="guide-field"><span>AI model</span><select value={model} onChange={event => {
                    setModel(event.target.value as ModelId);
                    setGlobalSuggestionField(undefined);
                    setGlobalSuggestionError('');
                  }}>{MODEL_OPTIONS.map(option => <option key={option.id} value={option.id} disabled={option.id === GEMINI_NEON_MODEL && !neonAvailable}>{option.label}</option>)}</select></label>
                </details>
              </div>
            )}

            {step === 3 && draft && review && (
              <div className="guide-stack guide-review">
                {stale && <p className="guide-banner guide-warning">Your notes changed after this write-up. Write it up again to use the updated notes.</p>}
                {!stale && gaps.length > 0 && (
                  <section className="guide-card guide-gap-card">
                    <h3>{gaps.length} {gaps.length === 1 ? 'thing' : 'things'} to fix before you can copy</h3>
                    <ol>{gaps.map((gap, index) => <li className="guide-inline" key={index}><span>{gap.message}</span><button type="button" className="aces-button" onClick={() => fixGap(gap)}>Fix this</button></li>)}</ol>
                  </section>
                )}
                <div className="guide-actions"><button type="button" className="aces-button" disabled={!!timingError} onClick={() => void writeUp()}>Write up again</button>{!stale && gaps.length > 0 && <span>Use this after fixing your notes.</span>}</div>
                <h3>Sections</h3>
                {review.sections.map((section, index) => (
                  <article className="guide-card guide-write-up" key={index}>
                    <h4><time>{section.startTime}</time> {section.type}</h4>
                    <p>{reviewText(section.description)}</p>
                    <dl>
                      <dt>Instruments</dt><dd>{section.instruments || '—'}</dd>
                      {section.vibe && <><dt>Mood</dt><dd>{section.vibe}</dd></>}
                      {section.melody && <><dt>Melody</dt><dd>{section.melody}</dd></>}
                    </dl>
                  </article>
                ))}
                <section className="guide-card guide-write-up">
                  <h3>Whole song</h3>
                  {(review.globalMetadata.songTitle || review.globalMetadata.songBy) && <p>{review.globalMetadata.songTitle}{review.globalMetadata.songBy && ` · ${review.globalMetadata.songBy}`}</p>}
                  <dl>{QUESTIONS.map(question => (
                    <div className="guide-review-answer" key={question.key}>
                      <dt>{question.label}</dt>
                      <dd>{reviewText(review.globalMetadata[question.key] || '')}
                        {review.globalMetadata[question.tagKey] && <small>{review.globalMetadata[question.tagKey]}</small>}
                      </dd>
                    </div>
                  ))}</dl>
                </section>
                <section className="guide-card">
                  <h3>Finish</h3>
                  <label className="guide-check"><input type="checkbox" checked={confirmed && !stale} disabled={stale || !!gaps.length} onChange={event => setConfirmed(event.target.checked)}/> I listened back, and everything here matches what I heard.</label>
                  <div className="guide-actions">
                    <button type="button" className="aces-button aces-button--primary" disabled={!exportReady} onClick={() => void copyDraft()}>Copy the annotation</button>
                    <button type="button" className="aces-button" disabled={!exportReady} onClick={() => void downloadPDF()}>Download PDF</button>
                    <button type="button" className="aces-button" disabled={!exportReady} onClick={() => onComplete(draft.text)}>Open in editor</button>
                  </div>
                  {!exportReady && <p>Copy and PDF unlock when the missing items are resolved and you confirm your listening check.</p>}
                  {!exportReady && <button type="button" className="aces-button aces-button--text guide-draft-copy" onClick={() => void copyDraft(true)}>Copy an unfinished draft with the Missing notes</button>}
                </section>
              </div>
            )}

            {step < 3 && <footer className="guide-footer">
              {step > 0 && <button type="button" className="aces-button" onClick={() => step === 1 && currentIndex > 0 ? goTo(1, currentIndex - 1) : goTo(step - 1)}><ArrowLeft size={16}/>{step === 2 ? 'Back to sections' : currentIndex > 0 ? 'Previous section' : 'Back to marks'}</button>}
              <span>
                {step === 0 ? `${rows.length} ${rows.length === 1 ? 'section' : 'sections'} marked`
                  : step === 1 ? `${rows.filter(row => row.instruments.trim() && row.parts.trim()).length} of ${rows.length} sections described`
                  : unanswered.length ? `${unanswered.length} unanswered. ${useAudio ? 'AI will check audible gaps.' : 'Review will mark them Missing.'}` : 'All questions answered'}
              </span>
              <button type="button" className="aces-button aces-button--primary" disabled={!!timingError} onClick={() => {
                if (step === 0) goTo(1, 0);
                else if (step === 1) currentIndex < rows.length - 1 ? goTo(1, currentIndex + 1) : goTo(2);
                else void writeUp();
              }}>
                {step === 0 ? 'Next: describe each section' : step === 1 ? currentIndex < rows.length - 1 ? 'Next section' : 'Next: whole song' : 'Write it up with AI'}<ArrowRight size={17}/>
              </button>
            </footer>}
          </fieldset>
        </section>
      )}
    </>
  );
}
