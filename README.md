# ACES MUSIC

Music annotation workspace adapted from J2wa/j2beatsv1 with the ACES Intelligence visual system.

## Development
`npm ci`, then `npm run dev`. `npm run lint` checks TypeScript; `npm run build` creates the production frontend. Local Vite alone does not serve the Vercel API functions. Use Vercel's development runtime to test live AI requests.

## Vercel
Project: `j2beat`. Intended domain: `music.acesintelligence.xyz`.
Configure `GEMINI_API_KEY` as a server environment variable. Redeploy after changing configuration. Never use a VITE_ prefix for secrets.

AI files must be under 3 MB; larger files remain playable locally. Archives are stored only in the current browser and domain. The source had no authentication, database, or real payment system. Local credits are a convenience counter only.

See [prompt and functionality extraction](docs/CONCEPTS_AND_PROMPTS.md) and the original annotation SOP/template. These retain the original annotation reference material; no original app-building conversation was present in the repository.

## Providers and fallback
Set server-only GEMINI_API_KEY and/or OPENROUTER_API_KEY plus OPENROUTER_MODEL (must support audio input). The default is Gemini 3.5 Flash. The Model selector in Analysis settings remembers your selection in this browser and applies to both analysis and refinement. The selected model is tried first, followed by the remaining Gemini models (3.5 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, 2.5 Flash, without duplicates), then the configured OpenRouter audio model. Each generation attempt gets at most 50 seconds; errors, timeouts, empty responses, and incomplete Gemini responses trigger the next attempt. Legacy GEMINI_MODEL and AI_PRIMARY_PROVIDER values no longer override this order. All attempts failing preserves the draft and does not deduct local credits. Fallback sends the audio to the secondary provider and may incur charges from either provider. Key presence is not proof of valid credentials. Never paste keys in chat or store them in browser storage.

Studio’s **Paid Gemini API key** accepts a key from a billing-enabled Google AI Studio project. The key stays in tab memory until disconnect, refresh, or sign-out. A Google model lookup enables **Gemini 4 Neon (Paid)** in automatic and manual mode when the key can see it. The connected key is used only for Neon, including its listening, research, and writing requests. Other Gemini models use the server key pool. Explicit OpenRouter requests use the server’s OpenRouter credentials. Google enforces billing and quota when the app runs analysis.

All generated and refined outputs receive an evidence-first natural-writing directive, overriding formulaic style instructions while preserving parser field labels. Accuracy cannot be guaranteed by a prompt; human listening review remains necessary.

Large audio files use private direct multipart uploads (up to 100 MB), bypassing the function request body limit. Analysis consumes and deletes uploaded temporary files; interrupted uploads may need manual cleanup. Provider context, audio duration, and runtime limits still apply. Blob store: j2beat-audio. Connect it to the project with Blob credentials if OIDC access is unavailable.


## Shared-password login
Set `USER_PASSWORD` in Vercel → j2beat → Settings → Environment Variables, for Production and Preview, then redeploy. This matches the variable name used by the video project. Everyone enters their own display name and the same shared password. No signup, database, or verified individual accounts are required. Never use a VITE_ prefix for this secret.

The app blocks access until configured. Signed, HttpOnly, Secure, SameSite cookies expire after 12 hours. Changing the shared password and redeploying invalidates existing sessions. Analysis, status, and upload-token endpoints require a valid session. Sign out clears the browser cookie. Existing browser-local library remain unchanged and are shared on that browser, not private per-person accounts. Login throttling is best-effort per function instance, not a global distributed rate limit.

## Gemini music-understanding pipeline
Analysis and refinement now run a preliminary structured listening pass, followed by the existing formatted annotation pass. The first pass covers whole-track observations and section-level events. Code validates numeric intervals, rejects overlaps/out-of-duration intervals, caps metadata size, and carries uncertainties into the final audio-grounded pass. The final pass receives text and validated metadata only, with no audio, and writes prose without adding audible musical facts and preserves existing annotation field labels.

This is an independently implemented adaptation of the workflow described at https://github.com/wx9songs/MOSS-Music-Data-Pipeline, not MOSS model inference or a port of its specialist MIR tools. No GPU hosting, model weights, new credentials, SongFormer, BeatNet, or Chordino are required. Estimated sections/key/tempo are Gemini observations, not measured MIR results; human review remains required. Audio duration comes from the existing client metadata, not a new server-side decoder.

A successful run normally uses one audio analysis request, a Google Search research request, and one text-only writing request, each billed by the provider. The optional evidence pass has one provider attempt and a 45-second budget; errors or malformed JSON fall back to direct annotation. All passes share a 240-second inference budget; Google Search has a separate maximum 55-second allowance within it. The existing selected-model order and OpenRouter fallback remain available for final generation. Validation checks preliminary timestamps, not the free-text final output. No separate lyric transcription, audio slicing, batch queue, or new timeline UI is introduced.

Checks: `npm run lint`, `npm run build`, `node --import tsx tests/providers.test.mjs`, `node --import tsx tests/musicPipeline.test.ts`.


## Google Search context and melody descriptions

Initial analysis and refinement search for the song using the uploaded filename, analysis guidance and short intelligible lyric clues from the listening pass. Add the title, artist and recording/version in Analysis guidance when the filename is ambiguous. The server uses Gemini's `googleSearch` tool in a separate text-only request, then retains actual search queries, HTTPS source URLs, supported passages and Google Search suggestions. Source-supported context can inform relevant Global Musical Matrix fields, with inline source links. Lyrical Evocation summarizes understandable English lyrics from listening. It uses “Lyrics unavailable” for non-English or unintelligible lyrics and “N/A” for instrumentals. It never establishes segment timing, melodic movement or which instruments are audible. Only passages with API grounding support are passed to the final writer. A matching search result is not independent proof of the uploaded recording's identity.

The research pass uses the selected Gemini model with a bounded Gemini 2.5 Flash fallback. Research uses the paid key exclusively for Neon and the server key pool for other models. Google Search can incur additional charges. An unavailable search or uncertain match is shown explicitly, and the normal audio annotation still runs; OpenRouter is never presented as Google Search. No new credentials or browser-stored keys are needed.

Source provenance is retained in browser-local saved annotations using a versioned metadata footer. The footer is hidden from editing and parsing, preserved through form/raw edits, and excluded from refinement requests. The interface shows cited research and sources separately; text copies and PDF exports include a readable research section. Google suggestions are displayed in a sandboxed iframe with scripts and same-origin access disabled.

Generation and refinement use the Music Section Annotation Handbook’s 47 section labels. Melody uses a complete sentence about a clearly audible tagged instrument’s melodic gesture. Vocal melodies qualify only for a cappella, aria, or choral music. Leave Melody blank when the evidence is unclear.

Additional regression checks: `node --import tsx tests/songResearch.test.ts`.

Full-duration validation now checks preliminary interval coverage and final timeline starts against the uploaded duration. Missing tails, gaps, omitted intervals, and segments over 60 seconds trigger bounded repair attempts. Incomplete listening notes cannot become the sole input to the writer; persistent invalid final timelines return an actionable error instead of a saved partial annotation. This validates structural coverage, not the correctness of AI listening.

## Multiple Gemini API keys

In Vercel → j2beat → Settings → Environment Variables, add server-only
`GEMINI_API_KEY_1` through `GEMINI_API_KEY_10`, one key per variable.
Alternatively use `GEMINI_API_KEYS` with comma-separated or newline-separated values.
The existing `GEMINI_API_KEY` remains supported; duplicates and blanks are removed.
Do not use a VITE_ prefix or put credentials in frontend code. Redeploy after saving.

The app starts with `GEMINI_API_KEY`, then tries numbered keys in order,
then keys in `GEMINI_API_KEYS`. It retries the same model with the other keys
before moving to fallback models. A key that already holds an audio upload may
be reused for later passes on the same track.
This applies to listening, annotation/refinement, coverage repair, and Google
Search research. Evidence-pass attempt limits still allow credential failover.
All retries share the existing deadlines; slow failures can exhaust the budget
before every key is tried. Search retains its 55-second total budget.
Keys, provider error bodies, and credential indexes are never sent in progress messages.
Existing OpenRouter fallback is unchanged and uses its existing single key.


## Spotify track import and Library PDF exports

Library rows provide branded PDF export from their own saved annotation text, without changing the current workspace. PDF headers include a vector ACES Intelligence mark and company name. Older browser-local entries remain exportable.

The signed-in Spotify import accepts one track URL and uses spotDL 4.6.0 with FFmpeg fetched into temporary storage at import time to find a matching YouTube recording. It does not download audio from Spotify. The user confirms download/analysis permission before import. Python dependencies are pinned in requirements.txt. Import has a 210-second downloader timeout and 300-second Vercel function limit; Import loads the track into the Studio player. Analysis starts when the user selects Analyze track and confirms if they have left all guidance fields empty. Source sites can reject data-center downloads; unavailable matches return an explicit error with manual upload as fallback.

Audio is stored in the existing private Vercel Blob store using BLOB_READ_WRITE_TOKEN or Vercel OIDC credentials plus BLOB_STORE_ID. Browser Library entries retain the private pathname and source link, allowing Open & play and Download audio after refresh. Library metadata still resides in this browser; it is not a shared cross-device catalog. Audio import creates a Library entry before analysis, so a failed AI call does not hide the saved track. Existing uploads without a saved audio reference remain annotation-only entries. All signed-in users share the existing app access model. Unannotated imports expire 24 hours after upload. The audio endpoint rejects expired files immediately and the cleanup cron removes them from Blob storage daily (00:00 UTC), compatible with the Vercel Hobby plan. Expired audio remains inaccessible before that cleanup. Set the production-only `CRON_SECRET` to authorize Vercel cron requests.

Validation: npm run lint, npm run build, python tests/spotify_test.py, and generated-PDF text inspection. Downloader execution and external matching require source-site availability; mocked integration tests do not establish live download success.


### Optional YouTube session cookies

Set `YOUTUBE_COOKIES_BASE64` as a sensitive, server-only Vercel environment variable for Production, then redeploy. Leave it unset to use anonymous downloads. Never prefix it with `VITE_` or commit cookie files.

Export a Netscape-format `cookies.txt` containing YouTube cookies. On Windows, copy its base64 encoding to your clipboard without printing it:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\cookies.txt))) | Set-Clipboard
```

Paste the clipboard into the Vercel variable value. Base64 is encoding, not encryption. Treat the value as a login credential and do not share it in chat or logs.

The worker validates the export, retains only youtube.com domains, writes a request-specific file with owner-only permissions, and passes its path through spotDL's `--cookie-file`. The temporary directory is removed when the request exits, including failures. Cookie-enabled failures log only an error category, never downloader output. The environment variable itself remains configured until you remove or replace it.

Cookies can expire and do not guarantee that YouTube accepts the hosting network. Replace the variable and redeploy to refresh; remove it and redeploy to disable.

## Music-specific wording humanizer

In Studio, open a generated or saved annotation and select **Preview wording edits**
under **Humanize wording**. Review the Original/Suggested field comparisons, then
apply or discard them. **Undo wording edits** restores the immediately preceding
text while that applied draft remains open. Applied and restored drafts use the
existing browser-local archive. Save manual form/raw edits before humanizing.

This original copyeditor improves narrative descriptions and the eleven Global
Musical Matrix prose fields. It preserves musical roles, techniques, interactions,
vocal phrasing and section changes in its instructions. It does not fill missing
observations or verify the music; use audio refinement for those changes.
Timestamps, section types, instrument/vibe/global tags, melody fields, identity
fields and the research footer are never rewritten. Code applies only recognized
prose-field patches and rejects unknown/duplicate fields, structural insertions,
changed numeric/citation tokens, removed uncertainty/negation tokens and large
length changes. These checks cannot prove semantic equivalence; review the preview.
Unsupported annotation formats return an error rather than an unrestricted rewrite.

The authenticated `/api/humanize` endpoint sends text only to the selected model,
using the existing Gemini key/model and OpenRouter fallback with a 110-second
shared budget. No new package, GPU, key, audio upload or Google Search request is
needed. Existing provider usage charges apply; the local credit counter is unchanged.
Failed or invalid edits leave the original intact. Cancel stops the browser request;
a provider call already in progress may still complete and incur charges.

Implementation: `shared/musicHumanizer.ts` contains reusable rules, field extraction
and patch validation; `server/musicHumanizer.ts` handles generation. This is an
independent implementation, not a copy of the listed third-party skills.

Validation: `node --import tsx tests/musicHumanizer.test.ts`, provider and runtime
regressions, `npx tsc --noEmit`, and `npm run build`. Provider tests use mocks;
they do not establish live output quality or provider availability.

## Automatic natural writing (no template selection)

The analysis-profile selector, Standard/Brief control and Profile wizard are removed.
Old browser preferences and legacy request profile fields no longer shape the result.
Analysis, refinement and the wording humanizer share a natural-writing policy. The
runtime knowledge base retains musical references but removes canned narrative
sentences and fixed sentence-order formulas.

The writer receives independently shuffled, optional construction cues per validated
segment, varying openings, grammatical subjects, sentence lengths and clause order.
These cues contain no sample annotation sentences or musical facts. Evidence and
coverage take priority; returning sections remain self-contained and every supported
instrument role, vocal detail and change stays relevant. There is no extra AI request.
This improves the writing instructions, not a guarantee of human authorship or a
particular detector score. Review the resulting prose and musical accuracy.

Regression checks: `node --import tsx tests/naturalMusicWriting.test.ts` and
`node --import tsx tests/annotationSettings.test.mjs`, plus the existing humanizer,
pipeline, provider, upload, native-runtime, TypeScript and production-build checks.

## Automatic humanization and description revisions

After each new analysis or audio correction, Studio automatically requests a separate
text-only humanization pass and applies validated wording edits before saving the final
result. Progress includes a Humanize stage. The completed draft is checkpointed first;
a timeout, provider error or validation failure preserves that draft and shows a notice.
The extra pass uses the selected model and existing fallback, has its own bounded
request budget and can incur provider charges. It does not re-upload audio or extend
the analysis function's deadline. Saved annotations are not automatically rewritten on open.

Every timeline description and Global Musical Matrix description has **Revise description**.
Add optional wording instructions, generate a suggestion, compare Original/Suggested,
and apply or discard it. Undo is available until that applied source changes. In Form
Editor, revisions update only that draft description; other unsaved fields are retained,
and Save changes commits the form. Empty/unknown descriptions cannot be expanded by
this text-only tool. Use the existing audio-correction control for new musical evidence.

`/api/humanize` now accepts a validated optional fieldId and revision instructions
(up to 2,000 characters). The server sends only the selected field for a local revision
and rejects edits to any other ID. Server and client verify locked content, field
structure, numbers/citations and uncertainty/negation before applying a revision.

Checks: `node --import tsx tests/automaticWording.test.ts` covers automatic success,
no-op and fallback, selected-field isolation, unsafe-response rejection and rendered
revision controls, alongside the existing app build and regression checks.
