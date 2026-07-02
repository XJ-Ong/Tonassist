'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { PhotoCard } from '@/components/tools/programme-notes/PhotoCard';
import { PerformerTable } from '@/components/tools/programme-notes/PerformerTable';
import type { Photo } from '@/types/programme-notes';

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [addName, setAddName] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<'card' | 'table'>('card');
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetch('/api/tools/programme-notes/photos')
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos ?? []))
      .catch(() => setFetchError('Failed to load photos'))
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
        setPhotos((prev) => [
          { name: data.name, base64: data.base64, created_at: data.created_at ?? null, last_updated: data.last_updated ?? null },
          ...prev,
        ]);
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

  function handleCardUpdate(name: string, newBase64: string, lastUpdated: string) {
    setPhotos((prev) =>
      prev.map((p) =>
        p.name === name ? { ...p, base64: newBase64, last_updated: lastUpdated } : p
      )
    );
  }

  async function handleTableUpdate(name: string, file: File) {
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('photo', file);
      const res = await fetch('/api/tools/programme-notes/photos', { method: 'PUT', body: fd });
      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) =>
          prev.map((p) =>
            p.name === name ? { ...p, base64: data.base64, last_updated: data.last_updated ?? p.last_updated } : p
          )
        );
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update photo');
      }
    } catch {
      setError('Something went wrong');
    }
  }

  function handleDeleteIntent(name: string) {
    setDeleteTarget(name);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/tools/programme-notes/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deleteTarget }),
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.name !== deleteTarget));
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Failed to delete photo');
      }
    } catch {
      setDeleteError('Something went wrong');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-[20px] font-medium text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
        Manage Performers
      </h1>

      {/* View toggle */}
      <div className="mb-6 flex gap-1 rounded-[6px] bg-[var(--color-bg-subtle)] p-1">
        <button
          onClick={() => setView('card')}
          className="flex-1 rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{
            backgroundColor: view === 'card' ? 'var(--color-text-primary)' : 'transparent',
            color: view === 'card' ? 'var(--color-bg)' : 'var(--color-text-secondary)',
          }}
        >
          Card View
        </button>
        <button
          onClick={() => setView('table')}
          className="flex-1 rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{
            backgroundColor: view === 'table' ? 'var(--color-text-primary)' : 'transparent',
            color: view === 'table' ? 'var(--color-bg)' : 'var(--color-text-secondary)',
          }}
        >
          Table View
        </button>
      </div>

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

      {/* Content area */}
      {loading ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">Loading…</p>
      ) : fetchError ? (
        <div role="alert" className="rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[13px]">{fetchError}</div>
      ) : photos.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">No photos uploaded yet.</p>
      ) : view === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.name}
              name={photo.name}
              base64={photo.base64}
              created_at={photo.created_at}
              last_updated={photo.last_updated}
              onUpdate={handleCardUpdate}
              onDelete={handleDeleteIntent}
              onClick={setLightboxPhoto}
            />
          ))}
        </div>
      ) : (
        <PerformerTable
          performers={photos}
          onUpdate={handleTableUpdate}
          onDelete={handleDeleteIntent}
          onPhotoClick={setLightboxPhoto}
        />
      )}

      {/* Delete confirmation dialog */}
      <Transition show={deleteTarget !== null}>
        <Dialog onClose={() => !deleting && setDeleteTarget(null)} className="relative z-50">
          <TransitionChild
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-[400px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Delete Photo</p>
                <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
                  Are you sure you want to delete the photo for <strong>{deleteTarget}</strong>?
                </p>
                {deleteError && (
                  <div role="alert" className="mt-2 rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[13px]">{deleteError}</div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="rounded-[6px] bg-[var(--color-brand-red)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-red)] focus:ring-offset-2 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {/* Lightbox dialog */}
      <Transition show={lightboxPhoto !== null}>
        <Dialog onClose={() => setLightboxPhoto(null)} className="relative z-50">
          <TransitionChild
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-[500px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 flex flex-col items-center gap-4">
                {lightboxPhoto && (
                  <>
                    <img
                      src={lightboxPhoto.base64}
                      alt={lightboxPhoto.name}
                      className="w-full max-w-[400px] aspect-square object-cover rounded-[6px]"
                    />
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      {lightboxPhoto.name}
                    </p>
                  </>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
