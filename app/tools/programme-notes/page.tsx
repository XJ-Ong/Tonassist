'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';

interface FormState {
  xlsx: File | null;
  background: File | null;
  edition: string;
  date: string;
  time: string;
  timezone: string;
}

async function compressImage(file: File): Promise<File> {
  const { default: Compressor } = await import('compressorjs');
  return new Promise((resolve) => {
    new Compressor(file, {
      width: 1920,
      quality: 0.85,
      mimeType: 'image/jpeg',
      success(result) {
        const compressed = new File([result], file.name, { type: 'image/jpeg' });
        if (compressed.size > 3.5 * 1024 * 1024) {
          new Compressor(file, {
            width: 1920,
            quality: 0.75,
            mimeType: 'image/jpeg',
            success(r2) { resolve(new File([r2], file.name, { type: 'image/jpeg' })); },
            error() { resolve(compressed); },
          });
        } else {
          resolve(compressed);
        }
      },
      error() { resolve(file); },
    });
  });
}

export default function ProgrammeNotesPage() {
  const [form, setForm] = useState<FormState>({
    xlsx: null, background: null, edition: '', date: '', time: '', timezone: 'UTC+8',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  async function handleBackgroundChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setForm((prev) => ({ ...prev, background: compressed }));
  }

  async function generate() {
    if (!form.xlsx || !form.background || !form.edition || !form.date || !form.time) {
      setError('Please fill in all fields.');
      return;
    }
    if (!form.xlsx.name.endsWith('.xlsx')) {
      setError('Please upload a valid .xlsx file.');
      return;
    }
    setLoading(true);
    setError('');
    setMissing([]);

    try {
      const fd = new FormData();
      fd.append('xlsx', form.xlsx);
      fd.append('background', form.background);
      fd.append('edition', form.edition);
      fd.append('date', form.date);
      fd.append('time', form.time);
      fd.append('timezone', form.timezone);

      const res = await fetch('/api/tools/programme-notes/generate', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Generation failed');
        if (data.missing) setMissing(data.missing);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `programme-notes-${form.edition}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleStartOver() {
    setForm({ xlsx: null, background: null, edition: '', date: '', time: '', timezone: 'UTC+8' });
    setSuccess(false);
    setError('');
    setMissing([]);
  }

  if (success) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="mb-4 text-[13px] text-[var(--color-text-primary)]">Programme notes generated successfully.</p>
          <button onClick={handleStartOver}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]">
            Start Over
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Programme Notes Generator
        </h1>
        <a href="/tools/programme-notes/admin"
          className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]">
          Manage Performers
        </a>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="flex flex-col gap-4">
        {/* XLSX upload */}
        <div>
          <label htmlFor="xlsx-upload" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Google Form Responses (.xlsx)</label>
          <input id="xlsx-upload" type="file" accept=".xlsx"
            onChange={(e) => setForm((prev) => ({ ...prev, xlsx: e.target.files?.[0] ?? null }))}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[var(--color-text-primary)] file:px-3 file:py-1 file:text-[13px] file:text-[var(--color-bg)]" />
        </div>

        {/* Background image */}
        <div>
          <label htmlFor="bg-upload" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Background Image</label>
          <input id="bg-upload" type="file" accept="image/*"
            onChange={handleBackgroundChange}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[var(--color-text-primary)] file:px-3 file:py-1 file:text-[13px] file:text-[var(--color-bg)]" />
        </div>

        {/* Edition */}
        <div>
          <label htmlFor="edition" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Edition Number</label>
          <input id="edition" type="text" value={form.edition} onChange={(e) => setForm((p) => ({ ...p, edition: e.target.value }))}
            placeholder="e.g. 16th"
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]" />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Performance Date</label>
          <input id="date" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]" />
        </div>

        {/* Time */}
        <div>
          <label htmlFor="time" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Performance Time</label>
          <input id="time" type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]" />
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Timezone</label>
          <input id="timezone" type="text" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]" />
        </div>

        {/* Error display */}
        {error && (
          <div role="alert" className="rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[13px] text-[var(--color-text-primary)]">
            {error}
          </div>
        )}

        {/* Missing photos */}
        {missing.length > 0 && (
          <div role="alert" className="rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[13px] text-[var(--color-text-primary)]">
            <p className="mb-1 font-medium">Missing profile photos for:</p>
            <ul className="list-inside list-disc">
              {missing.map((name) => <li key={name}>{name}</li>)}
            </ul>
            <p className="mt-1">Please upload these in the <a href="/tools/programme-notes/admin" className="underline">admin panel</a>.</p>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading} aria-busy={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-[6px] bg-[var(--color-text-primary)] text-[var(--color-bg)] px-4 py-2 text-[13px] font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] disabled:opacity-50">
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Generating…
            </>
          ) : 'Generate Programme Notes'}
        </button>
      </form>
    </AppShell>
  );
}
