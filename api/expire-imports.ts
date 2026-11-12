import { timingSafeEqual } from 'node:crypto';
import { del, list } from '@vercel/blob';
import { IMPORTED_AUDIO_PATH, importedAudioExpiresAt } from '../shared/importExpiry.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET.' });

  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'Import cleanup is not configured.' });
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(String(req.headers.authorization ?? ''));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const now = Date.now();
  let cursor: string | undefined;
  let deleted = 0;
  try {
    do {
      const page = await list({ prefix: 'music/', cursor, limit: 500 });
      const expired = page.blobs.filter(blob =>
        IMPORTED_AUDIO_PATH.test(blob.pathname) && importedAudioExpiresAt(blob.uploadedAt) <= now
      ).map(blob => blob.pathname);
      if (expired.length) {
        await del(expired);
        deleted += expired.length;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    console.info('Expired audio import cleanup completed', { deleted });
    return res.status(200).json({ deleted });
  } catch {
    console.error('Expired audio import cleanup failed', { deleted });
    return res.status(502).json({ error: 'Import cleanup could not finish.' });
  }
}
