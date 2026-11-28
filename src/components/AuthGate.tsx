import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn, Sliders, AudioWaveform, Sparkles } from 'lucide-react';
import { Button, Input } from './BrandSystem';
import { AcesDistortionLoader } from './AcesDistortionLoader';

const App = lazy(() => import('../App'));

const LANDING_PILLARS = [
  {
    icon: AudioWaveform,
    title: 'Precision waveform deck',
    detail: 'Inspect dynamics, loop A/B passages, and drop frame-accurate split markers.',
  },
  {
    icon: Sparkles,
    title: 'Golden annotation matrix',
    detail: 'Structured global descriptors and section-by-section narrative breakdowns.',
  },
  {
    icon: Sliders,
    title: 'Automatic & manual modes',
    detail: 'Draft with AI listening and search context, or annotate step by step by ear.',
  },
] as const;

export default function AuthGate() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  const check = async () => {
    try {
      const r = await fetch('/api/auth');
      if (!r.ok) throw Error('Unable to check your session. Please retry.');
      const data = await r.json();
      setUser(data.user);
      if (!data.configured) {
        setError('Sign-in is not configured. Ask the owner to set USER_PASSWORD in Vercel and redeploy.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void check();
    const logout = async () => {
      try {
        const r = await fetch('/api/auth', { method: 'DELETE' });
        if (!r.ok) throw Error();
        setUser(null);
        setPassword('');
        setError('');
      } catch {
        window.alert('Could not sign out. Please retry.');
      }
    };
    const focus = () => void check();
    window.addEventListener('aces-signout', logout);
    window.addEventListener('focus', focus);
    const timer = window.setInterval(check, 60000);
    return () => {
      window.removeEventListener('aces-signout', logout);
      window.removeEventListener('focus', focus);
      clearInterval(timer);
    };
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Could not sign in.');
      setUser(data.user);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="login-page login-page--loading">
        <AcesDistortionLoader variant="splash" stage="Verifying session" subtitle="ACES Music Studio" />
      </main>
    );
  }

  if (user) {
    return (
      <Suspense
        fallback={
          <main className="login-page login-page--loading">
            <AcesDistortionLoader variant="splash" stage="Opening Studio" subtitle="Loading annotation workspace" />
          </main>
        }
      >
        <App />
      </Suspense>
    );
  }

  return (
    <main className="login-page">
      <div className="landing-shell">
        <section className="landing-hero" aria-label="ACES Music overview">
          <div className="landing-logo-stage">
            <aces-logo size="228" theme="dark" track="on" label="Aces Intelligence" />
          </div>
          <div className="landing-copy">
            <p className="landing-eyebrow">Aces Intelligence · Music Studio</p>
            <h1 className="landing-headline">
              Focused music annotation, built for critical listening.
            </h1>
            <p className="landing-lead">
              Analyze arrangement, instrumentation, harmonic feel, and section boundaries in one studio workspace designed for human review.
            </p>
          </div>
          <ul className="landing-pillars">
            {LANDING_PILLARS.map(({ icon: Icon, title, detail }) => (
              <li key={title} className="landing-pillar">
                <span className="landing-pillar-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="landing-acoustic-bars" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => (
              <span
                key={i}
                style={
                  {
                    '--bar-h': `${22 + Math.round(Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.23)) * 78)}%`,
                    '--bar-d': `${(i * 0.09).toFixed(2)}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </section>

        <section className="landing-auth" aria-label="Studio sign in">
          <form className="login-card" onSubmit={login}>
            <div className="login-brand">
              <aces-logo size="52" theme="dark" wordmark="hide" intro="off" track="on" label="Aces Intelligence" />
              <div className="login-brand-copy">
                <span className="login-brand-title">ACES Music</span>
                <span className="login-brand-sub">Studio Access</span>
              </div>
            </div>
            <div className="login-heading">
              <h2>Sign in</h2>
              <p>Enter your studio credentials to open the workspace.</p>
            </div>
            <div className="login-field">
              <label htmlFor="login-name">Name</label>
              <Input
                id="login-name"
                autoComplete="username"
                placeholder="Your name"
                value={name}
                maxLength={80}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password">
                <Input
                  id="login-password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter studio password"
                  value={password}
                  maxLength={1024}
                  required
                  aria-describedby={error ? 'login-error' : undefined}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="login-toggle-password"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            {error && (
              <p id="login-error" role="alert" className="login-error">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" className="login-submit" disabled={busy}>
              <LogIn size={18} />
              {busy ? 'Signing in…' : 'Sign in to Studio'}
            </Button>
            <p className="login-footnote">Authorized Aces Intelligence annotators</p>
          </form>
        </section>
      </div>
    </main>
  );
}
