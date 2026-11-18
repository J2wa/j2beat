import { useState } from 'react';
import { families, instruments, techniqueCategories, techniques, universalTechniques } from '../data/playingTechniques';

const normalize = (text: string) => text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

type Props = {
  trackInstruments: string[];
  onAdd: (technique: string, instrument?: string) => void;
};

export default function PlayingTechniquePicker({trackInstruments, onAdd}: Props) {
  const [instrumentId, setInstrumentId] = useState('');
  const [techniqueId, setTechniqueId] = useState('');
  const [query, setQuery] = useState('');
  const trackNames = new Map(trackInstruments.map(name => [normalize(name), name]));
  const trackNameFor = (instrument: typeof instruments[number]) =>
    [instrument.name, ...instrument.aliases].map(name => trackNames.get(normalize(name))).find(Boolean);
  const inTrack = instruments.filter(trackNameFor);
  const instrument = instruments.find(item => item.id === instrumentId);
  const allowed = instrument && new Set([...instrument.playing_methods, ...instrument.techniques, ...universalTechniques]);
  const term = normalize(query);
  const matches = techniques.filter(technique => {
    if (allowed && !allowed.has(technique.id)) return false;
    return !term || normalize([technique.label, ...(technique.aliases ?? [])].join(' ')).includes(term);
  });
  const selected = matches.find(technique => technique.id === techniqueId);

  return (
    <div className="guide-technique-panel">
      <label className="guide-field">
        <span>Instrument</span>
        <select value={instrumentId} onChange={event => { setInstrumentId(event.target.value); setTechniqueId(''); }}>
          <option value="">All instruments</option>
          {inTrack.length > 0 && <optgroup label="In your section notes">
            {inTrack.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </optgroup>}
          {families.map(family => {
            const options = instruments.filter(item => item.family === family.id && !inTrack.includes(item));
            return options.length > 0 && <optgroup key={family.id} label={family.label}>
              {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </optgroup>;
          })}
        </select>
      </label>
      <label className="guide-field">
        <span>Find a technique</span>
        <input type="search" value={query} placeholder="Search names or aliases" onChange={event => { setQuery(event.target.value); setTechniqueId(''); }}/>
      </label>
      <label className="guide-field">
        <span>Technique</span>
        <select value={selected?.id ?? ''} onChange={event => setTechniqueId(event.target.value)} disabled={!matches.length}>
          <option value="">{matches.length ? 'Choose a technique' : 'No matching techniques'}</option>
          {Object.entries(techniqueCategories).map(([category, label]) => {
            const options = matches.filter(technique => technique.category === category);
            return options.length > 0 && <optgroup key={category} label={label}>
              {options.map(technique => <option key={technique.id} value={technique.id}>{technique.label}</option>)}
            </optgroup>;
          })}
        </select>
      </label>
      {selected && <p>{selected.description}</p>}
      <div className="guide-actions">
        <button type="button" className="aces-button" disabled={!selected} onClick={() => {
          if (!selected) return;
          onAdd(selected.label, instrument && (trackNameFor(instrument) ?? instrument.name));
          setTechniqueId('');
        }}>Add technique</button>
      </div>
    </div>
  );
}
