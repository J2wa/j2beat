# ACES MUSIC — extracted concepts and prompts

Source: J2wa/j2beatsv1, commit cbb2d390b2f4b476ec7a88f965e16a3f6276f280.

The repository does not contain the original app-building conversation or an original design prompt. The following extraction is based on its actual code and annotation instructions, not a recovered conversation.

## Current prompt inventory
- `src/constants.ts`: complete SYSTEM_PROMPT for the annotation schema, segment boundaries, instrument and vocal descriptions, global musical matrix, and permitted musical terminology.
- `src/knowledgeBase.ts`: reference knowledge used with both generation and refinement.
- `server/annotation.ts`: generation/refinement requests, duration constraints, and shared natural-writing guidance. The legacy profile and brief-mode overrides have been removed.
- `Music_Annotation_SOP.md` and `Human_Music_Annotation_Template.md`: original human annotation workflow and template, preserved.

## Core concept
An audio-first annotation workstation: upload and listen, add any listening notes, generate a structured draft, check the global musical matrix and timestamped sections against the recording, correct details, and export.

## Preserved functionality
- File picker and drag/drop audio input; local playback, seek, segment playback, mute and volume.
- Automatic natural prose with independently varied segment construction; simplified vocabulary and detailed segmentation remain optional.
- Optional guidance for segment counts, timestamps, instruments, vocal identity and creative direction.
- Gemini generation and feedback-based refinement using the complete prompt and knowledge base.
- Parsing global matrix and timestamped segments, form and raw editing, per-field copy, full analysis copy, and PDF export.
- Original local credit accounting/reset logic. Stored legacy writing preferences are ignored. These are browser convenience counters, not enforced billing or authentication.

## New implementation
- Shared ACES Brand, Header, Footer, Button, Input, and SectionContainer.
- Actual reference tokens inspected from acesintelligence.xyz and chrome.css: #1548ED, #101E40, #54627C, #F7F9FF, #D5DFF3; Clash Display and Satoshi; square A. brand mark.
- Functional guidelines and browser-local archive (30 successful results; audio not stored).
- Vercel server functions keep GEMINI_API_KEY out of the browser bundle. Missing configuration and failed responses do not report success or deduct credits.
- Corrected unsupported “verified” and fixed bitrate claims.

## Operational limits
- No authentication or database existed in the source. No external account or stored server data was migrated. Browser storage does not transfer between domains.
- AI input is limited to 3 MB to fit Vercel's request payload ceiling after base64 encoding. Local audio playback accepts larger files; longer tracks should use compressed MP3. Larger AI uploads require a storage/upload integration.
- The model is the original gemini-3-flash-preview, overridable with GEMINI_MODEL. Live provider access requires GEMINI_API_KEY and an available model.
- AI timestamps and musical classifications require human review; the original animated visualizer is illustrative, not a computed waveform.

## Dark studio redesign
The current interface uses a minimalist dark navy palette with blue controls, compact Studio/Guide/Library navigation, and a persistent transport bar. It removes the former marketing headline, duplicate footer navigation, profile descriptions in the sidebar, and decorative processing statistics.

The player now derives its waveform from decoded audio, supports pointer/keyboard scrubbing, 10-second skips, 0.5×–2× playback, volume/mute, full-track repeat, A–B section loops, and jumps to annotated segment timestamps. Space toggles playback and Left/Right seek five seconds when focus is outside interactive fields. Audio is decoded locally for the waveform; AI upload behavior is unchanged.

## Natural music writing

The profile picker, Standard/Brief control and profile wizard are removed. The runtime
knowledge base no longer includes fill-in-the-blank narrative sentences or fixed
instrument-to-vocal writing formulas. The original SOP/template documents remain
reference material; their sentence templates are not injected into generation.

`shared/naturalMusicWriting.ts` supplies one shared writing policy for analysis,
refinement and the music humanizer. The final writer receives independently shuffled,
nonbinding construction cues for each validated segment. These are editing suggestions,
not sentences to paste or musical evidence. If preliminary listening is unavailable,
the audio-grounded writer chooses independently from shuffled suggestions. All required
musical detail and output labels retain priority. Audio QA preserves the draft wording
except where corrections are needed.

Variation changes subjects, clause order, openings and sentence lengths. It never
shuffles events, substitutes arbitrary musical terms or invents differences between
repeated sections. Naturalness is model-dependent and still needs listening review.
