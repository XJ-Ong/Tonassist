'use client';

import { useState } from 'react';
import type { AiReport } from '@/types/programme-notes';

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
  const [aiReport, setAiReport] = useState<AiReport | null>(null);

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

      const reportHeader = res.headers.get('X-Ai-Report');
      if (reportHeader) {
        const json = new TextDecoder('utf-8').decode(Uint8Array.from(atob(reportHeader), (c) => c.charCodeAt(0)));
        setAiReport(JSON.parse(json));
      }

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
    setAiReport(null);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="mb-4 text-[13px] text-[var(--color-text-primary)]">Programme notes generated successfully.</p>

        {aiReport && (aiReport.corrections.length > 0 || aiReport.qa.length > 0 || aiReport.drafts.length > 0 || aiReport.failed.length > 0) && (
          <div className="mb-4 w-full max-w-[520px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">AI Processing Report</p>

            {aiReport.corrections.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[13px] font-medium text-[var(--color-text-primary)]">Corrections</p>
                <ul className="space-y-1">
                  {aiReport.corrections.map((c, i) => (
                    <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                      <span className="font-medium text-[var(--color-text-primary)]">{c.performer}</span>
                      {' · '}
                      <span className="text-[var(--color-text-muted)]">{c.field}:</span>
                      {' '}
                      <span className="line-through">{c.original}</span>
                      {' → '}
                      <span>{c.corrected}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiReport.qa.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[13px] font-medium text-[var(--color-text-primary)]">Proofread Introductions</p>
                <ul className="space-y-2">
                  {aiReport.qa.map((q, i) => (
                    <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                      <span className="font-medium text-[var(--color-text-primary)]">{q.performer}</span>
                      <ul className="mt-0.5 space-y-1">
                        {q.changes.map((c, j) => (
                          <li key={j} className="rounded-[4px] bg-[var(--color-bg-subtle)] p-2">
                            {c.original && <p className="line-through text-[var(--color-text-muted)]">{c.original}</p>}
                            {c.corrected && <p className={c.original ? 'mt-0.5' : ''}>{c.corrected}</p>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiReport.drafts.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[13px] font-medium text-[var(--color-text-primary)]">Drafted Introductions</p>
                <ul className="space-y-2">
                  {aiReport.drafts.map((d, i) => (
                    <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                      <span className="font-medium text-[var(--color-text-primary)]">{d.performer}</span>
                      <p className="mt-0.5 rounded-[4px] bg-[var(--color-bg-subtle)] p-2">{d.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiReport.failed.length > 0 && (
              <div className="mt-3 rounded-[4px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[12px] text-[var(--color-text-primary)]">
                Some AI steps were rate-limited and used fallback text instead.
              </div>
            )}
          </div>
        )}

        <button onClick={handleStartOver}
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]">
          Start Over
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Programme Notes Generator
        </h1>
<a href="/dashboard/tools/programme-notes/admin"
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
            <p className="mt-1">Please upload these in the <a href="/dashboard/tools/programme-notes/admin" className="underline">admin panel</a>.</p>
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
    </>
  );
}
