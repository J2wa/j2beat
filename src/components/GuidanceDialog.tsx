import { useEffect, useRef } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from './BrandSystem';

const fields = [
  { key: 'timestamps', label: 'Timestamps to check', placeholder: '0:32 chorus starts, 1:18 drum fill' },
  { key: 'instruments', label: 'Instruments to verify', placeholder: 'Synth bass, shaker' },
  { key: 'vocals', label: 'Vocal cues', placeholder: 'Layered harmonies in the chorus' },
  { key: 'segmentsCount', label: 'Target segment count', placeholder: '8' },
] as const;

type Field = typeof fields[number]['key'];

export function GuidanceDialog({ mode, notes, details, onNotesChange, onDetailChange, onClose, onAddGuidance, onProceed }: {
  mode: 'form' | 'confirm';
  notes: string;
  details: Record<Field, string>;
  onNotesChange: (value: string) => void;
  onDetailChange: (field: Field, value: string) => void;
  onClose: () => void;
  onAddGuidance: () => void;
  onProceed: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (mode === 'form') notesRef.current?.focus();
    else dialogRef.current?.querySelector<HTMLButtonElement>('[data-add-guidance]')?.focus();
  }, [mode]);

  return (
    <dialog ref={dialogRef} className="guidance-dialog" aria-labelledby="guidance-title" aria-describedby="guidance-description" onCancel={event => {
      event.preventDefault();
      onClose();
    }}>
      <header className="guidance-header">
        <span className="guidance-icon"><Settings size={20} aria-hidden="true" /></span>
        <Button variant="text" aria-label="Close guidance" onClick={onClose}><X /></Button>
      </header>
      {mode === 'confirm' ? <>
        <h2 id="guidance-title">Are you sure you want to proceed without guidance?</h2>
        <p id="guidance-description">Even one note can help the AI check a tricky transition, identify the recording, or focus on a musical detail you care about.</p>
        <div className="guidance-actions">
          <Button onClick={onProceed}>Proceed without guidance</Button>
          <Button variant="primary" data-add-guidance onClick={onAddGuidance}>Add guidance</Button>
        </div>
      </> : <>
        <h2 id="guidance-title">Guide the annotation</h2>
        <p id="guidance-description">Tell the AI what to listen for. A track title and artist help identify the recording, and a timestamp helps it check a specific change. Fill in any field you know.</p>
        <label className="guidance-field">
          <span>Song details and listening notes</span>
          <textarea ref={notesRef} rows={3} value={notes} onChange={event => onNotesChange(event.target.value)} placeholder="e.g. Live version. Listen for the bass pattern after the first chorus." />
        </label>
        <fieldset className="guidance-fields">
          <legend>Specific cues <span>Optional</span></legend>
          {fields.map(field => <label className="guidance-field" key={field.key}>
            <span>{field.label}</span>
            <input type="text" inputMode={field.key === 'segmentsCount' ? 'numeric' : undefined} value={details[field.key]} placeholder={field.placeholder} onChange={event => onDetailChange(field.key, event.target.value)} />
          </label>)}
        </fieldset>
        <div className="guidance-actions">
          <Button variant="primary" onClick={onClose}>Save guidance</Button>
        </div>
      </>}
    </dialog>
  );
}
