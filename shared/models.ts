export const MODEL_OPTIONS = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const;
export const DEFAULT_MODEL = MODEL_OPTIONS[0].id;
export type ModelId = typeof MODEL_OPTIONS[number]['id'];
export function isModelId(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some(model => model.id === value);
}
export function modelOrder(selected: ModelId = DEFAULT_MODEL): ModelId[] {
  return [selected, ...MODEL_OPTIONS.map(model => model.id).filter(id => id !== selected)];
}
