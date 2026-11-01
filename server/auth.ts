import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
const COOKIE = 'aces_music_session';
const TTL = 60 * 60 * 12;
export const configured = () => Boolean(process.env.USER_PASSWORD);
const digest = (value: string) => createHash('sha256').update(value).digest();
export const passwordMatches = (value: string) => configured() && timingSafeEqual(digest(value), digest(process.env.USER_PASSWORD!));
const sign = (value: string) => createHmac('sha256', process.env.USER_PASSWORD!).update('aces-music-session:v1:' + value).digest('base64url');
export function sessionCookie(name: string) {
 const payload = Buffer.from(JSON.stringify({ name, exp: Date.now() + TTL * 1000 })).toString('base64url');
 return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
export function session(req: any): {name: string; exp: number} | null {
 if (!configured()) return null;
 try {
  const token = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!token || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !timingSafeEqual(digest(signature), digest(sign(payload)))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 80 && typeof data.exp === 'number' && data.exp > Date.now() ? data : null;
 } catch { return null; }
}
export function sameOrigin(req: any) {
 const origin = req.headers.origin;
 if (!origin) return true;
 try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
export function requireSession(req: any, res: any) {
 res.setHeader('Cache-Control', 'no-store');
 if (!sameOrigin(req)) { res.status(403).json({ error: 'Request origin is not allowed.' }); return false; }
 if (!session(req)) { res.status(401).json({ error: 'Please sign in to continue.' }); return false; }
 return true;
}
