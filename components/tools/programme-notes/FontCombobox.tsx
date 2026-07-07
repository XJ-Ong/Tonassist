'use client';

import { useState } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';

export function FontCombobox({ fonts, value, onChange }: { fonts: readonly string[]; value: string; onChange: (font: string) => void }) {
  const [query, setQuery] = useState('');

  const filtered = query === ''
    ? fonts
    : fonts.filter((font) => font.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={(font) => { if (font) onChange(font); }} onClose={() => setQuery('')}>
      <div className="relative">
        <ComboboxInput
          className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]"
          displayValue={(font: string) => font}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fonts..."
        />
        <ComboboxOptions
          anchor="bottom start"
          className="z-50 max-h-60 w-[var(--input-width)] overflow-auto rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-1 shadow-lg empty:invisible"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">No fonts found</div>
          ) : (
            filtered.map((font) => (
              <ComboboxOption
                key={font}
                value={font}
                className="cursor-pointer px-3 py-2 text-[13px] text-[var(--color-text-primary)] data-[focus]:bg-[var(--color-bg-subtle)]"
              >
                {font}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
