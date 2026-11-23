import { useEffect, useRef, useState, type FormEvent } from 'react';
import { checkPaidGeminiKey, setPaidGeminiKey } from '../services/paidGemini';
import { Button } from './BrandSystem';

type Access = {neon: boolean} | null;

export function PaidGeminiSettings({ access, onAccessChange, disabled }: {
  access: Access;
  onAccessChange: (access: Access) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController>(null);
  const analysisBusy = useRef(disabled);
  analysisBusy.current = disabled;
  useEffect(() => () => pending.current?.abort(), []);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = input.current?.value.trim();
    if (!key || disabled || pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setChecking(true);
    setError('');
    try {
      const result = await checkPaidGeminiKey(key, AbortSignal.any([request.signal, AbortSignal.timeout(15000)]));
      if (request.signal.aborted) return;
      if (analysisBusy.current) throw new Error('Wait for the current analysis to finish, then connect your key.');
      setPaidGeminiKey(key);
      onAccessChange(result);
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'Could not check the Gemini key. Try again.');
      }
    } finally {
      pending.current = null;
      if (!request.signal.aborted) setChecking(false);
    }
  }

  return <details className="paid-gemini">
    <summary>Paid Gemini API key{access ? ' · Connected' : ''}</summary>
    {access ? <div className="paid-gemini-content">
      <p role="status">{access.neon ? 'Gemini 4 Neon is available in the model selector.' : 'Key connected. This project does not currently show Gemini 4 Neon access.'}</p>
      <Button disabled={disabled} onClick={() => { setPaidGeminiKey(); onAccessChange(null); }}>Disconnect key</Button>
    </div> : <form className="paid-gemini-content" onSubmit={connect}>
      <label htmlFor="paid-gemini-key">Gemini API key</label>
      <div className="paid-gemini-controls">
        <input ref={input} id="paid-gemini-key" type="password" autoComplete="off" spellCheck={false} maxLength={512} required disabled={disabled || checking} />
        <Button type="submit" disabled={disabled || checking}>{checking ? 'Checking…' : 'Connect key'}</Button>
      </div>
      <p>Use a key from a billing-enabled Google AI Studio project. Gemini requests are charged to that project. The key clears when you refresh or sign out.</p>
      {error && <p role="alert" className="paid-gemini-error">{error}</p>}
    </form>}
  </details>;
}
