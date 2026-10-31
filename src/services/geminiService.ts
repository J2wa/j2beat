// Credentials and prompt assembly live exclusively in the server function.
async function request(audioFile: File, options: Record<string, unknown>): Promise<string> {
  if (audioFile.size > 3 * 1024 * 1024) throw new Error("Choose an audio file under 3 MB for AI analysis. Export a compressed MP3 for longer tracks.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read this audio file."));
    reader.readAsDataURL(audioFile);
  });
  const response = await fetch('/api/annotate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: { data, type: audioFile.type || (audioFile.name.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg') }, ...options }),
  });
  const body = await response.json().catch(() => ({error: 'The server could not complete this request. Please try again.'}));
  if (!response.ok) throw new Error(body.error || 'Analysis failed. Please try again.');
  if (!body.text) throw new Error('The server returned an empty annotation. Please retry.');
  return body.text;
}
export function annotateAudio(audioFile: File, isSimplified = false, isHighAccuracy = false, creativeGuidance = '', audioDuration = 0, activeProfile = 'PRODUCER', annotationProfile = 'default') {
  return request(audioFile, {action:'annotate', isSimplified, isHighAccuracy, creativeGuidance, audioDuration, activeProfile, annotationProfile});
}
export function refineAnnotation(audioFile: File, previousResult: string, feedback: string, isSimplified = false, isHighAccuracy = false, creativeGuidance = '', audioDuration = 0, activeProfile = 'PRODUCER', annotationProfile = 'default') {
  return request(audioFile, {action:'refine', previousResult, feedback, isSimplified, isHighAccuracy, creativeGuidance, audioDuration, activeProfile, annotationProfile});
}
