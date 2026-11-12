export const IMPORT_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const IMPORTED_AUDIO_PATH = /^music\/[a-f0-9-]{36}\.mp3$/;

export function importedAudioExpiresAt(uploadedAt: Date | string): number {
  return new Date(uploadedAt).getTime() + IMPORT_LIFETIME_MS;
}
