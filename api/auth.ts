import { configured, session, sessionCookie, clearCookie, passwordMatches, sameOrigin } from '../server/auth.js';
// Best-effort per-instance throttle; the shared password should be long and unique.
const attempts = new Map<string, {count: number; until: number}>();
export default async function handler(req: any, res: any) {
 res.setHeader('Cache-Control', 'no-store');
 if (req.method === 'GET') return res.status(200).json({ configured: configured(), user: session(req)?.name || null });
 if (!['POST', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).end(); }
 if (!sameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
 if (req.method === 'DELETE') { res.setHeader('Set-Cookie', clearCookie()); return res.status(200).json({ ok: true }); }
 if (!configured()) return res.status(503).json({ error: 'Sign-in is not configured. The owner must set USER_PASSWORD in Vercel and redeploy.' });
 const ip = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
 const now = Date.now();
 for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
 const entry = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
 if (entry.count >= 10) { res.setHeader('Retry-After', String(Math.ceil((entry.until-now)/1000))); return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'}); }
 const { name, password } = req.body || {};
 if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || typeof password !== 'string' || password.length > 1024) return res.status(400).json({error:'Enter your name and password.'});
 if (!passwordMatches(password)) {
  if (attempts.size < 10000) attempts.set(ip, { ...entry, count: entry.count + 1 });
  await new Promise(resolve => setTimeout(resolve, 600));
  return res.status(401).json({error:'Incorrect password.'});
 }
 attempts.delete(ip);
 res.setHeader('Set-Cookie', sessionCookie(name.trim()));
 return res.status(200).json({user:name.trim()});
}
