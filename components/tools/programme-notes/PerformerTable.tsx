'use client';

import { useRef, useState } from 'react';
import type { Photo } from '@/types/programme-notes';

interface PerformerTableProps {
  performers: Photo[];
  onUpdate: (name: string, file: File) => void;
  onDelete: (name: string) => void;
  onPhotoClick: (photo: Photo) => void;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function SortIndicator({ column, sortColumn, sortDirection }: { column: 'name' | 'created_at' | 'last_updated'; sortColumn: 'name' | 'created_at' | 'last_updated' | null; sortDirection: 'asc' | 'desc' }) {
  if (sortColumn !== column) return null;
  return (
    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  );
}

export function PerformerTable({ performers, onUpdate, onDelete, onPhotoClick }: PerformerTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'created_at' | 'last_updated' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filtered = performers.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      formatTimestamp(p.created_at).toLowerCase().includes(term) ||
      formatTimestamp(p.last_updated).toLowerCase().includes(term)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal = '';
    let bVal = '';
    if (sortColumn === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else {
      if (!a[sortColumn] && !b[sortColumn]) return 0;
      if (!a[sortColumn]) return 1;
      if (!b[sortColumn]) return -1;
      aVal = a[sortColumn]!;
      bVal = b[sortColumn]!;
    }
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  function handleSort(column: 'name' | 'created_at' | 'last_updated') {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search performers…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-3 w-full rounded-[6px] border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]"
      />

      <p className="mb-2 text-[11px] text-[var(--color-text-muted)]">
        Showing {sorted.length} of {performers.length} performers
      </p>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            <th className="px-2 py-2 text-left">Photo</th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-[var(--color-text-primary)]"
              onClick={() => handleSort('name')}
            >
              Name<SortIndicator column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-[var(--color-text-primary)]"
              onClick={() => handleSort('created_at')}
            >
              Created At<SortIndicator column="created_at" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-[var(--color-text-primary)]"
              onClick={() => handleSort('last_updated')}
            >
              Last Updated<SortIndicator column="last_updated" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th className="px-2 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((performer) => (
            <PerformerRow
              key={performer.name}
              performer={performer}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onPhotoClick={onPhotoClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerformerRow({
  performer,
  onUpdate,
  onDelete,
  onPhotoClick,
}: {
  performer: Photo;
  onUpdate: (name: string, file: File) => void;
  onDelete: (name: string) => void;
  onPhotoClick: (photo: Photo) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpdate(performer.name, file);
    }
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  return (
    <tr className="border-b border-[var(--color-border)] py-3">
      <td className="px-2 py-3">
        <img
          src={performer.base64}
          alt={performer.name}
          className="h-10 w-10 cursor-pointer rounded object-cover"
          onClick={() => onPhotoClick(performer)}
        />
      </td>
      <td className="px-2 py-3 text-[var(--color-text-primary)]">{performer.name}</td>
      <td className="px-2 py-3 text-[var(--color-text-secondary)]">{formatTimestamp(performer.created_at)}</td>
      <td className="px-2 py-3 text-[var(--color-text-secondary)]">{formatTimestamp(performer.last_updated)}</td>
      <td className="px-2 py-3">
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-3 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
          >
            Update
          </button>
          <button
            onClick={() => onDelete(performer.name)}
            className="rounded-[6px] border border-[var(--color-brand-red)]/30 bg-transparent px-3 py-1 text-[11px] text-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-red)]"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
