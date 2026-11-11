# ACES MUSIC

Music annotation workspace adapted from J2wa/j2beatsv1 with the ACES Intelligence visual system.

## Development
`npm ci`, then `npm run dev`. `npm run lint` checks TypeScript; `npm run build` creates the production frontend. Local Vite alone does not serve the Vercel API functions. Use Vercel's development runtime to test live AI requests.

## Vercel
Project: `j2beat`. Intended domain: `music.acesintelligence.xyz`.
Configure `GEMINI_API_KEY` as a server environment variable. Redeploy after changing configuration. Never use a VITE_ prefix for secrets.

AI files must be under 3 MB; larger files remain playable locally. Archives are stored only in the current browser and domain. The source had no authentication, database, or real payment system. Local credits are a convenience counter only.

See [prompt and functionality extraction](docs/CONCEPTS_AND_PROMPTS.md) and the original annotation SOP/template. These retain the actual prompt text and all ten profile concepts; no original app-building conversation was present in the repository.

## Providers and fallback
Set server-only GEMINI_API_KEY and/or OPENROUTER_API_KEY plus OPENROUTER_MODEL (must support audio input). The default is Gemini 3.5 Flash. The Model selector in Analysis settings remembers your selection in this browser and applies to both analysis and refinement. The selected model is tried first, followed by the remaining Gemini models (3.5 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, 2.5 Flash, without duplicates), then the configured OpenRouter audio model. Each generation attempt gets at most 50 seconds; errors, timeouts, empty responses, and incomplete Gemini responses trigger the next attempt. Legacy GEMINI_MODEL and AI_PRIMARY_PROVIDER values no longer override this order. All attempts failing preserves the draft and does not deduct local credits. Fallback sends the audio to the secondary provider and may incur charges from either provider. Key presence is not proof of valid credentials. Never paste keys in chat or store them in browser storage.

All generated and refined outputs receive an evidence-first natural-writing directive, overriding formulaic style instructions while preserving parser field labels. Accuracy cannot be guaranteed by a prompt; human listening review remains necessary.

Large audio files use private direct multipart uploads (up to 100 MB), bypassing the function request body limit. Analysis consumes and deletes uploaded temporary files; interrupted uploads may need manual cleanup. Provider context, audio duration, and runtime limits still apply. Blob store: j2beat-audio. Connect it to the project with Blob credentials if OIDC access is unavailable.


## Shared-password login
Set `USER_PASSWORD` in Vercel → j2beat → Settings → Environment Variables, for Production and Preview, then redeploy. This matches the variable name used by the video project. Everyone enters their own display name and the same shared password. No signup, database, or verified individual accounts are required. Never use a VITE_ prefix for this secret.

The app blocks access until configured. Signed, HttpOnly, Secure, SameSite cookies expire after 12 hours. Changing the shared password and redeploying invalidates existing sessions. Analysis, status, and upload-token endpoints require a valid session. Sign out clears the browser cookie. Existing browser-local profiles/library remain unchanged and are shared on that browser, not private per-person accounts. Login throttling is best-effort per function instance, not a global distributed rate limit.

## Gemini music-understanding pipeline
Analysis and refinement now run a preliminary structured listening pass, followed by the existing formatted annotation pass. The first pass covers whole-track observations and section-level events. Code validates numeric intervals, rejects overlaps/out-of-duration intervals, caps metadata size, and carries uncertainties into the final audio-grounded pass. The final pass receives text and validated metadata only, with no audio, and writes prose without adding audible musical facts and preserves existing annotation field labels and writing profiles.

This is an independently implemented adaptation of the workflow described at https://github.com/wx9songs/MOSS-Music-Data-Pipeline, not MOSS model inference or a port of its specialist MIR tools. No GPU hosting, model weights, new credentials, SongFormer, BeatNet, or Chordino are required. Estimated sections/key/tempo are Gemini observations, not measured MIR results; human review remains required. Audio duration comes from the existing client metadata, not a new server-side decoder.

A successful run normally uses one audio analysis request, a Google Search research request, and one text-only writing request, each billed by the provider. The optional evidence pass has one provider attempt and a 45-second budget; errors or malformed JSON fall back to direct annotation. All passes share a 240-second inference budget; Google Search has a separate maximum 55-second allowance within it. The existing selected-model order and OpenRouter fallback remain available for final generation. Validation checks preliminary timestamps, not the free-text final output. No separate lyric transcription, audio slicing, batch queue, or new timeline UI is introduced.

Checks: `npm run lint`, `npm run build`, `node --import tsx tests/providers.test.mjs`, `node --import tsx tests/musicPipeline.test.ts`.


## Google Search context and melody descriptions

Initial analysis and refinement search for the song using the uploaded filename, analysis guidance and short intelligible lyric clues from the listening pass. Add the title, artist and recording/version in Analysis guidance when the filename is ambiguous. The server uses Gemini's `googleSearch` tool in a separate text-only request, then retains actual search queries, HTTPS source URLs, supported passages and Google Search suggestions. Source-supported context can inform Lyrical Evocation and other relevant Global Musical Matrix fields, with inline source links. It never establishes segment timing, melodic movement or which instruments are audible. Only passages with API grounding support are passed to the final writer. A matching search result is not independent proof of the uploaded recording's identity.

The research pass uses the selected Gemini model with a bounded Gemini 2.5 Flash fallback. It requires the existing server `GEMINI_API_KEY` and can incur additional Google Search charges. An unavailable search or uncertain match is shown explicitly, and the normal audio annotation still runs; OpenRouter is never presented as Google Search. No new credentials or browser-stored keys are needed.

Source provenance is retained in browser-local saved annotations using a versioned metadata footer. The footer is hidden from editing and parsing, preserved through form/raw edits, and excluded from refinement requests. The interface shows cited research and sources separately; text copies and PDF exports include a readable research section. Google suggestions are displayed in a sandboxed iframe with scripts and same-origin access disabled.

The old melody phrase lists are removed from every runtime prompt. All profiles and refinement use the same Melody rule: one concise 3–7 word phrase naming the audible carrier and gesture, using only instruments listed in that segment, without repeating the narrative. No subjective judgments, canned contour openings or invented pitch/key names. Absent or insufficient melodic evidence stays blank. Human listening review remains necessary.

Additional regression checks: `node --import tsx tests/songResearch.test.ts`.

Full-duration validation now checks preliminary interval coverage and final timeline starts against the uploaded duration. Missing tails, gaps, omitted intervals, and segments over 60 seconds trigger bounded repair attempts. Incomplete listening notes cannot become the sole input to the writer; persistent invalid final timelines return an actionable error instead of a saved partial annotation. This validates structural coverage, not the correctness of AI listening.

## Multiple Gemini API keys

In Vercel → j2beat → Settings → Environment Variables, add server-only
`GEMINI_API_KEY_1` through `GEMINI_API_KEY_10`, one key per variable.
Alternatively use `GEMINI_API_KEYS` with comma-separated or newline-separated values.
The existing `GEMINI_API_KEY` remains supported; duplicates and blanks are removed.
Do not use a VITE_ prefix or put credentials in frontend code. Redeploy after saving.

Each provider call starts at a random key to spread independent requests, then
tries the remaining keys on the same model before moving to fallback models.
This applies to listening, annotation/refinement, coverage repair, and Google
Search research. Evidence-pass attempt limits still allow credential failover.
All retries share the existing deadlines; slow failures can exhaust the budget
before every key is tried. Search retains its 55-second total budget.
Keys, provider error bodies, and credential indexes are never sent in progress messages.
This is best-effort distribution, not a centralized queue or concurrency guarantee.
Existing OpenRouter fallback is unchanged and uses its existing single key.
