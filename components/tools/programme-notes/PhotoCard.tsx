'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import type { Photo } from '@/types/programme-notes';

interface PhotoCardProps {
  name: string;
  base64: string;
  created_at?: string | null;
  last_updated?: string | null;
  onUpdate: (name: string, newBase64: string, lastUpdated: string) => void;
  onDelete: (name: string) => void;
  onClick?: (photo: Photo) => void;
}

export function PhotoCard({ name, base64, created_at, last_updated, onUpdate, onDelete, onClick }: PhotoCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  async function handleUpdate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdating(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('photo', file);
      const res = await fetch('/api/tools/programme-notes/photos', { method: 'PUT', body: fd });
      if (res.ok) {
        const data = await res.json();
        onUpdate(name, data.base64, data.last_updated);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update photo');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setUpdating(false);
    }
  }

  async function confirmDelete() {
    setError('');
    try {
      const res = await fetch('/api/tools/programme-notes/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        onDelete(name);
        setDeleteOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete photo');
      }
    } catch {
      setError('Something went wrong');
    }
  }

  return (
    <>
      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
        <img src={base64} alt={name} loading="lazy" className={`mb-2 h-[120px] w-[120px] object-cover ${onClick ? 'cursor-pointer' : ''}`} onClick={() => onClick?.({ name, base64, created_at: created_at ?? null, last_updated: last_updated ?? null })} />
        <p className="mb-2 text-[13px] text-[var(--color-text-primary)]">{name}</p>
        {error && (
          <p role="alert" className="mb-2 rounded-[6px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-2 py-1 text-[11px] text-[var(--color-text-primary)]">{error}</p>
        )}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpdate} />
          <button onClick={() => fileRef.current?.click()} disabled={updating}
            className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-3 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] disabled:opacity-50">
            {updating ? 'Uploading…' : 'Update'}
          </button>
          <button onClick={() => setDeleteOpen(true)}
            className="rounded-[6px] border border-[var(--color-brand-red)]/30 bg-transparent px-3 py-1 text-[11px] text-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-red)]">
            Delete
          </button>
        </div>
      </div>

      <Transition show={deleteOpen}>
        <Dialog onClose={() => setDeleteOpen(false)} className="relative z-50">
          <TransitionChild enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <DialogPanel className="w-full max-w-[400px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
                <DialogTitle className="text-[13px] font-medium text-[var(--color-text-primary)]">Delete Photo</DialogTitle>
                <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
                  Are you sure you want to delete the photo for <strong>{name}</strong>?
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setDeleteOpen(false)}
                    className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]">
                    Cancel
                  </button>
                  <button onClick={confirmDelete}
                    className="rounded-[6px] bg-[var(--color-brand-red)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-red)] focus:ring-offset-2">
                    Delete
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
