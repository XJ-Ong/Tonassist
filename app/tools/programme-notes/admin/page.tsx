'use client';

import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PhotoCard } from '@/components/tools/programme-notes/PhotoCard';

interface Photo {
  name: string;
  base64: string;
}

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/tools/programme-notes/photos')
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName || !addFile) return;
    setAdding(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', addName);
      fd.append('photo', addFile);
      const res = await fetch('/api/tools/programme-notes/photos', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) => [{ name: data.name, base64: data.base64 }, ...prev]);
        setAddName('');
        setAddFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add photo');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setAdding(false);
    }
  }

  function handleUpdate(name: string, newBase64: string) {
    setPhotos((prev) => prev.map((p) => (p.name === name ? { ...p, base64: newBase64 } : p)));
  }

  function handleDelete(name: string) {
    setPhotos((prev) => prev.filter((p) => p.name !== name));
  }

  return (
    <AppShell>
      <h1 className="mb-6 text-[20px] font-medium text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
        Photo Admin
      </h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Add New Photo</p>
        <div>
          <label htmlFor="add-name" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Performer Name</label>
          <input id="add-name" type="text" value={addName} onChange={(e) => setAddName(e.target.value)}
            placeholder="Exact match to Google Form dropdown"
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]" />
        </div>
        <div>
          <label htmlFor="add-photo" className="mb-1 block text-[13px] text-[var(--color-text-secondary)]">Profile Photo</label>
          <input id="add-photo" ref={fileInputRef} type="file" accept="image/*"
            onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[var(--color-text-primary)] file:px-3 file:py-1 file:text-[13px] file:text-[var(--color-bg)]" />
        </div>
        {error && (
          <div role="alert" className="rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[13px]">{error}</div>
        )}
        <button type="submit" disabled={adding || !addName || !addFile} aria-busy={adding}
          className="inline-flex items-center justify-center rounded-[6px] bg-[var(--color-text-primary)] text-[var(--color-bg)] px-4 py-2 text-[13px] font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] disabled:opacity-50">
          {adding ? 'Adding…' : 'Add Photo'}
        </button>
      </form>

      {/* Photo grid */}
      {loading ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">No photos uploaded yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((photo) => (
            <PhotoCard key={photo.name} name={photo.name} base64={photo.base64} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
