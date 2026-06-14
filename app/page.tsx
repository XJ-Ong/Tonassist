'use client';
import { useState } from 'react';
import { Transition, TransitionChild } from '@headlessui/react';
import { StaffRule } from '@/components/layout/StaffRule';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[360px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8">
        <h1 className="mb-2 text-center text-[18px] font-semibold" style={{ fontFamily: 'var(--font-playfair)' }}>Tonassist</h1>
        <p className="mb-6 text-center text-[11px] text-[var(--color-text-muted)]">Internal tools for the Tonicist Association</p>
        <StaffRule className="mb-6" />
        <form onSubmit={handleSubmit}>
          <label htmlFor="password" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]"
            placeholder="Enter password" autoFocus required />
          <Transition show={!!error}>
            <TransitionChild
              enter="ease-out duration-200"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-1"
            >
              <div className="mb-4 rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[13px] text-[var(--color-text-primary)]">{error}</div>
            </TransitionChild>
          </Transition>
          <button type="submit" disabled={loading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-[6px] bg-[var(--color-text-primary)] text-[var(--color-bg)] px-4 py-2 text-[13px] font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] disabled:opacity-50">
            {loading ? 'Entering...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
