# ACES MUSIC — extracted concepts and prompts

Source: J2wa/j2beatsv1, commit cbb2d390b2f4b476ec7a88f965e16a3f6276f280.

The repository does not contain the original app-building conversation or an original design prompt. The following extraction is based on its actual code and annotation instructions, not a recovered conversation.

## Prompt inventory (verbatim source retained)
- `src/constants.ts`: complete SYSTEM_PROMPT for the annotation schema, segment boundaries, instrument and vocal descriptions, global musical matrix, and permitted musical terminology.
- `src/knowledgeBase.ts`: reference knowledge used with both generation and refinement.
- `server/annotation.ts`: the original ten profile directives, brief-mode override, generation/refinement requests, duration constraints, and quality mandates, moved server-side without rewriting their musical content.
- `Music_Annotation_SOP.md` and `Human_Music_Annotation_Template.md`: original human annotation workflow and template, preserved.

## Core concept
An audio-first annotation workstation: upload and listen, select an analytical perspective, generate a structured draft, check the global musical matrix and timestamped sections against the recording, correct details, and export.

## Preserved functionality
- File picker and drag/drop audio input; local playback, seek, segment playback, mute and volume.
- Ten profiles: Producer, Vocal, R&B, Soloist, Acoustic, Texture, Rhythm, Expert, Ambient, Dynamics. Legacy profile identifiers continue migrating.
- Standard and brief/concise output; simplified tone; granular/high-accuracy segmentation.
- Optional guidance for segment counts, timestamps, instruments, vocal identity and creative direction.
- Gemini generation and feedback-based refinement using the complete prompt and knowledge base.
- Parsing global matrix and timestamped segments, form and raw editing, per-field copy, full analysis copy, and PDF export.
- Original local credit accounting/reset logic and profile preference keys. These are browser convenience counters, not enforced billing or authentication.

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
