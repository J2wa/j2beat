# ACES MUSIC

Music annotation workspace adapted from J2wa/j2beatsv1 with the ACES Intelligence visual system.

## Development
`npm ci`, then `npm run dev`. `npm run lint` checks TypeScript; `npm run build` creates the production frontend. Local Vite alone does not serve the Vercel API functions. Use Vercel's development runtime to test live AI requests.

## Vercel
Project: `j2beat`. Intended domain: `music.acesintelligence.xyz`.
Configure `GEMINI_API_KEY` as a server environment variable; optionally override `GEMINI_MODEL`. Redeploy after changing configuration. Never use a VITE_ prefix for secrets.

AI files must be under 3 MB; larger files remain playable locally. Archives are stored only in the current browser and domain. The source had no authentication, database, or real payment system. Local credits are a convenience counter only.

See [prompt and functionality extraction](docs/CONCEPTS_AND_PROMPTS.md) and the original annotation SOP/template. These retain the actual prompt text and all ten profile concepts; no original app-building conversation was present in the repository.

## Providers and fallback
Set server-only GEMINI_API_KEY and/or OPENROUTER_API_KEY plus OPENROUTER_MODEL (must support audio input). AI_PRIMARY_PROVIDER selects gemini (default) or openrouter. Each provider gets at most 50 seconds; errors, timeouts, and empty responses trigger the other configured provider once. Both failing preserves the draft and does not deduct local credits. Fallback sends the audio to the secondary provider and may incur charges from either provider. Key presence is not proof of valid credentials. Never paste keys in chat or store them in browser storage.

All generated and refined outputs receive an evidence-first natural-writing directive, overriding formulaic style instructions while preserving parser field labels. Accuracy cannot be guaranteed by a prompt; human listening review remains necessary.
