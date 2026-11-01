import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { AudioLines, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button, Input } from './BrandSystem';
const App = lazy(() => import('../App'));
export default function AuthGate() {
 const [user,setUser]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState('');
 const [password,setPassword]=useState('');
 const [visible,setVisible]=useState(false);
 const [error,setError]=useState('');
 const check=async()=>{
  try { const r=await fetch('/api/auth'); if(!r.ok)throw Error('Unable to check your session. Please retry.'); const data=await r.json(); setUser(data.user); if(!data.configured)setError('Sign-in is not configured. Ask the owner to set USER_PASSWORD in Vercel and redeploy.'); }
  catch(e){setError(e instanceof Error?e.message:'Unable to connect.');}finally{setLoading(false);}
 };
 useEffect(()=>{void check(); const logout=async()=>{try{const r=await fetch('/api/auth',{method:'DELETE'});if(!r.ok)throw Error();setUser(null);setPassword('');setError('');}catch{window.alert('Could not sign out. Please retry.');}}; const focus=()=>void check();window.addEventListener('aces-signout',logout);window.addEventListener('focus',focus); const timer=window.setInterval(check,60000);return()=>{window.removeEventListener('aces-signout',logout);window.removeEventListener('focus',focus);clearInterval(timer);};},[]);
 async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,password})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not sign in.');setUser(data.user);setPassword('');}catch(e){setError(e instanceof Error?e.message:'Could not connect. Please retry.');}finally{setBusy(false);}}
 if(loading)return <main className="login-page"><p role="status">Loading…</p></main>;
 if(user)return <Suspense fallback={<main className="login-page"><p role="status">Opening Studio…</p></main>}><App/></Suspense>;
 return <main className="login-page"><form className="login-card" onSubmit={login}><div className="login-brand"><AudioLines size={28}/><span>ACES Music</span></div><h1>Sign in</h1><label htmlFor="login-name">Name</label><Input id="login-name" autoComplete="username" value={name} maxLength={80} required onChange={e=>setName(e.target.value)}/><label htmlFor="login-password">Password</label><div className="login-password"><Input id="login-password" type={visible?'text':'password'} autoComplete="current-password" value={password} maxLength={1024} required aria-describedby={error?'login-error':undefined} onChange={e=>setPassword(e.target.value)}/><Button aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</Button></div>{error&&<p id="login-error" role="alert" className="login-error">{error}</p>}<Button type="submit" variant="primary" disabled={busy}><LogIn size={20}/>{busy?'Signing in…':'Sign in'}</Button></form></main>;
}
