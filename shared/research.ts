export interface ResearchReport {
  status: 'grounded' | 'unverified' | 'unavailable';
  message: string;
  summary: string;
  sources: { id: number; title: string; url: string }[];
  queries: string[];
  searchEntryPoint?: string;
}

const MARKER = '\n\n<!-- ACES_RESEARCH_V1 ';
export function safeSourceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 3000) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Reject invalid provider or imported links. */ }
}

// Keep provenance with browser-local drafts without changing the annotation schema.
export function splitResearch(text: string): { annotation: string; research?: ResearchReport } {
  const index = text.indexOf(MARKER);
  if (index < 0) return { annotation: text };
  const annotation = text.slice(0, index).trimEnd();
  try {
    const json = text.slice(index + MARKER.length).replace(/\s*-->\s*$/, '');
    const data = JSON.parse(json);
    if (!['grounded', 'unverified', 'unavailable'].includes(data.status) || typeof data.message !== 'string' || typeof data.summary !== 'string' || !Array.isArray(data.sources) || !Array.isArray(data.queries)) return { annotation };
    return { annotation, research: {
      status: data.status, message: data.message.slice(0, 1000), summary: data.summary.slice(0, 20000),
      sources: data.sources.filter((s: any) => s && Number.isInteger(s.id) && typeof s.title === 'string' && safeSourceUrl(s.url)).slice(0, 30),
      queries: data.queries.filter((q: unknown) => typeof q === 'string').slice(0, 20),
      searchEntryPoint: typeof data.searchEntryPoint === 'string' ? data.searchEntryPoint.slice(0, 60000) : undefined,
    }};
  } catch { return { annotation }; }
}

export function attachResearch(annotation: string, research?: ResearchReport): string {
  const clean = splitResearch(annotation).annotation.trimEnd();
  if (!research) return clean;
  // Escape HTML delimiters even inside Google's suggestion markup.
  const json = JSON.stringify(research).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `${clean}${MARKER}${json} -->`;
}

export function researchAsMarkdown(research?: ResearchReport): string {
  if (!research) return '';
  return `\n\n## Google Search research\n\n${research.message}\n\n${research.summary}\n\n${research.sources.map(s => `- [${s.id}: ${s.title.replace(/[\[\]\\]/g, '')}](<${s.url}>)`).join('\n')}`;
}
