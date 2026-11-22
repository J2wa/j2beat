import { SECTION_GROUPS, SECTION_TYPES } from '../../shared/annotationSections';
import { LYRICAL_EVOCATION_RULE, TEMPO_BUCKETS } from '../../shared/goldenAnnotation';
import { Button, SectionContainer } from './BrandSystem';

const sectionChecks = [
  ['Start time', 'Start at 0:00, even if the first sound enters later. Note the delayed entrance in the description and mark each subsequent section at the point where it begins.'],
  ['Section type', 'Choose the label that fits the passage’s musical function. The first row may be a Chorus, Bridge, or any other supported label. Give a returning section its own row and reuse its label when the musical function is the same.'],
  ['Narrative description', 'Write a complete, standalone description of each passage. Say what each part does, how it is played, how it interacts with other parts, and what changes within the row. For repeated passages, restate the audible arrangement and describe any differences inside that row. In the last row, describe how the track ends, such as a fade, a sudden stop, or a sustained note.'],
  ['Instrument tags', 'Tag the core parts audible in the current row, including lead or backing vocals when present. Aim for four to six parts when the arrangement supports that many. Every tagged part needs a description, and every part named in the description needs a matching tag.'],
  ['Vibe tags', 'Use short, consistent mood or energy words that fit this passage. Keep genre names in the genre field.'],
  ['Melody', 'Use a full sentence for a memorable melody played by a tagged instrument. Describe the shape of the notes. Leave rhythm, groove, key, chords, and time signature to their own fields. Describe vocal melody only for a cappella, aria, or choral music. Leave this field blank if the melody is unclear.'],
] as const;

const globalChecks = [
  ['Genre, Era & Scene', 'Name the genre or subgenre and point to the musical evidence for it. Add the original release era and relevant cultural scene when you can support them. Scene describes the music community, such as disco or hip-hop. Save the possible listening environment for Setting.'],
  ['Tempo, Rhythm & Groove', `Choose a supported tempo label from ${TEMPO_BUCKETS.join(', ')}. Describe the rhythmic feel and explain how the beat, accents, and interaction between parts create the groove.`],
  ['Harmony, Chords & Key', 'Describe the harmonic color and how the chords move. Name an exact key or progression only when it is established. Otherwise describe a supported major or minor feel, or leave the tonal center uncertain.'],
  ['Instrumentation', 'Tag the main instruments and explain each part’s role in the arrangement, such as carrying the melody, anchoring the beat, or supplying harmony.'],
  ['Playing Style', 'Describe how the parts are played, such as legato strings, palm-muted guitar, or slapped bass. Keep the focus on performance techniques you can hear.'],
  ['Wow Factor', 'Describe a specific moment or trait that stands out and explain why. If nothing stands out, say so in a complete sentence.'],
  ['Emotion, Vibe & Setting', 'Cover the emotional response, the overall atmosphere and what creates it, and a plausible listening setting such as a café, a club, or a drive.'],
  ['Mix & Production', 'Describe where the sounds sit, which parts are up front, how wide or dry the mix sounds, and any audible effects or movement across the stereo field.'],
  ['Sonic Fidelity', 'Describe audio quality through what you hear, such as clarity, noise, distortion, or a part being masked.'],
  ['Vocal Expression', 'Describe pitch range, timbre, and delivery. Note audible processing, ad-libs, runs, and changes in delivery when relevant. Identify vocal roles without guessing gender or identity.'],
  ['Lyrical Evocation', `${LYRICAL_EVOCATION_RULE} For an instrumental, also enter exactly N/A in Vocal Expression and leave both tag lists empty.`],
] as const;

const labelComparisons = [
  ['Transition, Interlude, Bridge', 'A transition connects two passages. An interlude has a recognizable musical idea of its own between larger sections. A bridge provides a more substantial contrast within the form.'],
  ['Chorus, Hook, Refrain', 'A chorus is a recurring main section. A hook is a memorable line or riff and only gets its own row when it forms a distinct passage. A refrain is a recurring phrase that can sit inside a larger section.'],
  ['Break, Breakdown, Drum Break', 'A break briefly interrupts the groove. A breakdown changes or reduces the broader arrangement. A drum break puts percussion in the foreground.'],
  ['Outro, Coda, Tag', 'An outro is a distinct closing passage. A coda is a formal ending after the main form. A tag is a short phrase added or repeated at a section’s close.'],
] as const;

function ReferenceList({items}: {items: readonly (readonly [string, string])[]}) {
  return (
    <dl className="grid divide-y divide-border-subtle">
      {items.map(([label, text]) => (
        <div className="py-3" key={label}>
          <dt className="mb-1 font-semibold">{label}</dt>
          <dd className="muted">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AnnotationGuidelines({onOpenStudio}: {onOpenStudio: () => void}) {
  return (
    <div className="grid gap-4">
      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Guidelines contents">
        <a className="underline underline-offset-4" href="#golden-annotation">Golden Annotation</a>
        <a className="underline underline-offset-4" href="#section-handbook">Section Handbook</a>
        <a className="underline underline-offset-4" href="#studio-workflow">Studio workflow</a>
      </nav>

      <SectionContainer className="document-view">
        <h2 id="golden-annotation" className="scroll-mt-6">How to Annotate a Golden Annotation</h2>
        <p>Use short keywords for tags and full sentences for written descriptions. Check each claim against the audio.</p>
        <h3 className="font-semibold">Section-by-section requirements</h3>
        <ReferenceList items={sectionChecks} />
        <p className="rounded-lg border border-border-dim p-4">
          <strong>Example narrative</strong> — The acoustic guitar fingerpicks a rising figure beneath the lead vocal. A shaker enters on the backbeat, giving the passage a steadier pulse.
        </p>
        <h3 className="font-semibold">Whole-song requirements</h3>
        <ReferenceList items={globalChecks} />
        <h3 className="mt-3 font-semibold">Before you submit</h3>
        <ul className="muted mt-2 list-disc space-y-1 pl-5">
          <li>Replay the boundaries and make sure the final description covers the ending.</li>
          <li>Check that the instrument tags and narration match within each row.</li>
          <li>Complete the applicable fields with specific observations. Mark uncertainty where the evidence is unclear.</li>
          <li>Check spelling, grammar, and consistency across tags and descriptions.</li>
        </ul>
      </SectionContainer>

      <SectionContainer className="document-view">
        <h2 id="section-handbook" className="scroll-mt-6">Music Section Annotation Handbook</h2>
        <p>Listen for changes in arrangement, texture, musical role, or energy. Use the most specific supported label. A brief fill or a small variation can usually stay in the current row.</p>
        <h3 className="font-semibold">Labels that are easy to confuse</h3>
        <ReferenceList items={labelComparisons} />
        <h3 className="mb-3 mt-3 font-semibold">All {SECTION_TYPES.length} section labels</h3>
        <div className="grid gap-2">
          {SECTION_GROUPS.map(({label, sections}) => (
            <details key={label} className="rounded-lg border border-border-dim px-4">
              <summary className="cursor-pointer py-3 font-semibold">{label} <span className="muted ml-1 text-sm">({sections.length})</span></summary>
              <ReferenceList items={sections.map(([name, cue]) => [name.charAt(0).toUpperCase() + name.slice(1), cue])} />
            </details>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="document-view">
        <h2 id="studio-workflow" className="scroll-mt-6">Use the guidelines in Studio</h2>
        <ol className="muted list-decimal space-y-3 pl-5">
          <li>Upload audio or import a Spotify link. Play the track to check that it’s the version you want to annotate.</li>
          <li>Mark the section starts on the waveform. In Automatic mode, use <strong>Use in specific timestamps</strong> to send the marks to the guidance fields. In Manual mode, add listening notes to each section and complete the whole-song fields.</li>
          <li>Review the AI draft against the recording. In Automatic mode, enter the timestamp and specific correction in <strong>Correction instructions</strong>, then select <strong>Apply Correction</strong>. Review the changes before exporting.</li>
        </ol>
        <Button className="mt-5" variant="primary" onClick={onOpenStudio}>Open Studio</Button>
      </SectionContainer>
    </div>
  );
}
