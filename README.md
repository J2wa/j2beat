# ACES MUSIC

Music annotation workspace adapted from J2wa/j2beatsv1 with the ACES Intelligence visual system.

## Development
`npm ci`, then `npm run dev`. `npm run lint` checks TypeScript; `npm run build` creates the production frontend. Local Vite alone does not serve the Vercel API functions. Use Vercel's development runtime to test live AI requests.

## Vercel
Project: `j2beat`. Intended domain: `music.acesintelligence.xyz`.
Configure `GEMINI_API_KEY` as a server environment variable; optionally override `GEMINI_MODEL`. Redeploy after changing configuration. Never use a VITE_ prefix for secrets.

AI files must be under 3 MB; larger files remain playable locally. Archives are stored only in the current browser and domain. The source had no authentication, database, or real payment system. Local credits are a convenience counter only.

See [prompt and functionality extraction](docs/CONCEPTS_AND_PROMPTS.md) and the original annotation SOP/template. These retain the actual prompt text and all ten profile concepts; no original app-building conversation was present in the repository.
