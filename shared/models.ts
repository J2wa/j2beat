export const GEMINI_OPTIONS = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const;
export const GEMINI_NEON_MODEL = 'gemini-4-neon';
export const NEMOTRON_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
export const MODEL_OPTIONS = [...GEMINI_OPTIONS, {id:GEMINI_NEON_MODEL, label:'Gemini 4 Neon (Paid)'}, {id:NEMOTRON_MODEL, label:'NVIDIA Nemotron 3 Nano Omni (Free · OpenRouter)'}] as const;
export const DEFAULT_MODEL = MODEL_OPTIONS[0].id;
export type ModelId = typeof MODEL_OPTIONS[number]['id'];
export function isModelId(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some(model => model.id === value);
}
export function modelOrder(selected: ModelId = DEFAULT_MODEL): ModelId[] {
  if (selected === GEMINI_NEON_MODEL) return [GEMINI_NEON_MODEL];
  if (selected === NEMOTRON_MODEL) return GEMINI_OPTIONS.map(model => model.id);
  return [selected, ...GEMINI_OPTIONS.map(model => model.id).filter(id => id !== selected)];
}
