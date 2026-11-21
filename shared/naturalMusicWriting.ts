/** Wording guidance for descriptions based on listening evidence or supplied notes. */
export const PLAIN_MUSIC_PROSE = `
Use plain, direct English. Start with what can be heard or what the notes say a part does. Use concrete verbs such as plays, repeats, strums, holds, enters, and drops out.
Aim for one or two short sentences per description. Add a sentence when needed to keep a distinct supported detail. Keep related parts together when their roles are clear.
Work from four observations when describing a section: what each instrument or voice does, how it is played or delivered, what changes, and how those sounds shape or change the feel. Keep familiar musical terms when they are the clearest option.
Tie the feel to a specific sound or change. For example, what makes the music feel atmospheric, happy, or groovy? Use the feel that fits the evidence or the supplied notes. If the feel stays steady, say what keeps it steady when useful. Skip mood wording when it has no clear support or does not answer the field.
Cut filler, stacked adjectives, ornate metaphors, and vague praise. Preserve uncertainty.
`;

/** Shared policy for fresh annotation prose, separate from the locked data schema. */
export const NATURAL_MUSIC_WRITING = `
NATURAL MUSIC WRITING
${PLAIN_MUSIC_PROSE}
Write each segment from its own musical evidence, with fresh sentence construction rather than a reusable prose template.
Choose the most informative supported observation to lead; there is no fixed order for instruments, rhythm, vocals, texture or changes.
Vary grammatical subjects, opening words, clause order and sentence lengths across adjacent segments.
Describe every tagged part's role. Add clear playing techniques, rhythmic patterns or interactions where they help explain the part, including vocal phrasing and arrangement changes.
Keep returning sections self-contained. Describe their audible details directly without comparing them to another row. Never invent a difference for variety.
Avoid stock openings, forced contrasts, filler transitions, vague praise, artificial errors and first-person listening claims.
Preserve meaning, uncertainty, chronology, timestamps, labels, tags and the required output format.
Wording variety applies only to prose. Never shuffle musical events, change facts, or shorten away observations to satisfy a style cue.
Before returning, compare neighboring narratives and revise repeated openings or sentence skeletons when a clearer construction fits.
`;

// Editorial cues contain no sample sentences or musical facts. Sampling a shuffled
// bag gives each segment an independent, nonbinding nudge without a sentence bank.
const editorialCues = [
  'Consider a direct subject-verb opening and a different grammatical subject in the next sentence.',
  'Consider a short opening observation followed by a fuller explanation of a related detail.',
  'Consider joining closely related observations with a clear clause while leaving unrelated details separate.',
  'Consider giving a dense observation more than one sentence instead of stacking parallel phrases.',
  'If a change is documented, consider leading with that change before describing the continuing parts.',
  'Consider putting a concrete action before its supporting context, with a different clause order from the neighboring row.',
];
export function segmentWritingHints(count: number, random: () => number = Math.random): string {
  if (!Number.isInteger(count) || count < 0 || count > 200) throw new Error('Invalid segment count');
  const hints: string[] = [];
  let previous: string | undefined;
  while (hints.length < (count || editorialCues.length)) {
    const bag = [...editorialCues];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bag[i],bag[j]] = [bag[j],bag[i]];
    }
    if (bag[0] === previous) [bag[0],bag[1]] = [bag[1],bag[0]];
    for (const hint of bag) {
      if (hints.length >= (count || editorialCues.length)) break;
      hints.push(hint); previous = hint;
    }
  }
  return '\nOPTIONAL WORDING CUES (editorial guidance only; not evidence or text to copy). Use only when natural; do not force these constructions or omit detail.\n'
    + (count ? hints.map((hint,i)=>`Segment ${i+1}: ${hint}`).join('\n')
      : 'Choose independently for each segment from these shuffled suggestions; do not cycle through a fixed order.\n'+hints.join('\n'));
}
