'use client';

import { useEffect } from 'react';
import type { StylingConfig, TextStyle } from '@/types/programme-notes';
import type { PreviewMode } from './SlidePreview';
import { FontCombobox } from './FontCombobox';

const GOOGLE_FONTS = [
  'Arial',
  'ABeeZee',
  'Abril Fatface',
  'Alegreya',
  'Alex Brush',
  'Alice',
  'Allura',
  'Anton',
  'Architects Daughter',
  'Asset',
  'Bad Script',
  'Barlow',
  'Barriecito',
  'Barrio',
  'Bebas Neue',
  'Berkshire Swash',
  'Big Shoulders Display',
  'Birthstone',
  'Black Ops One',
  'Bungee',
  'Caladea',
  'Carter One',
  'Caveat',
  'Caveat Brush',
  'Cherry Bomb One',
  'Cinzel',
  'Climate Crisis',
  'Comforter',
  'Crafty Girls',
  'Crimson Text',
  'Dancing Script',
  'Dr Sugiyama',
  'Emblema One',
  'Engagement',
  'Erica One',
  'Euphoria Script',
  'Fascinate',
  'Fascinate Inline',
  'Freckle Face',
  'Fredoka',
  'Gamja Flower',
  'Germania One',
  'Give You Glory',
  'Glass Antiqua',
  'Gloria Hallelujah',
  'Gochi Hand',
  'Great Vibes',
  'Hachi Maru Pop',
  'Herr Von Muellerhoff',
  'Inter',
  'Josefin Sans',
  'Josefin Slab',
  'Just Another Hand',
  'Kalam',
  'Kavoon',
  'Knewave',
  'Kolker Brush',
  'Lato',
  'League Spartan',
  'Leckerli One',
  'Life Savers',
  'Lilita One',
  'Limelight',
  'Liu Jian Mao Cao',
  'Lobster',
  'Lobster Two',
  'Londrina Shadow',
  'Long Cang',
  'Luckiest Guy',
  'Ma Shan Zheng',
  'Major Mono Display',
  'Mansalva',
  'Marck Script',
  'Megrim',
  'Merriweather',
  'Monoton',
  'Montserrat',
  'Moo Lah Lah',
  'Mrs Saint Delafield',
  'Nunito',
  'Oleo Script',
  'Open Sans',
  'Open Sans Condensed',
  'Open Sans SemiCondensed',
  'Oregano',
  'Oswald',
  'Over The Rainbow',
  'PT Serif',
  'Pacifico',
  'Parisienne',
  'Passion One',
  'Permanent Marker',
  'Pinyon Script',
  'Pirata One',
  'Playfair Display',
  'Pompiere',
  'Poppins',
  'Purple Purse',
  'Quintessential',
  'Raleway',
  'Raleway Dots',
  'Red Hat Display',
  'Redressed',
  'Ribeye',
  'Roboto',
  'Roboto Condensed',
  'Roboto Mono',
  'Roboto Slab',
  'Rubik',
  'Sacramento',
  'Sassy Frass',
  'Shrikhand',
  'Sigmar One',
  'Six Caps',
  'Source Sans Pro',
  'Special Elite',
  'Srisakdi',
  'Sue Ellen Francisco',
  'Tangerine',
  'The Nautigal',
  'Train One',
  'Ubuntu',
  'UnifrakturMaguntia',
  'Vast Shadow',
  'Yellowtail',
  'Yuji Syuku',
  'Zhi Mang Xing',
] as const;

function TextStyleControl({ label, value, onChange }: { label: string; value: TextStyle; onChange: (v: TextStyle) => void }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[13px] font-semibold text-[var(--color-brand-green)]">{label}</p>
      <div className="flex flex-col gap-2">
        <div>
          <label className="mb-1 block text-[12px] text-[var(--color-text-secondary)]">Font Family</label>
          <FontCombobox fonts={GOOGLE_FONTS} value={value.fontFamily} onChange={(font) => onChange({ ...value, fontFamily: font })} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[12px] text-[var(--color-text-secondary)]">Size</label>
            <input
              type="number"
              min={8}
              max={72}
              value={value.fontSize}
              onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value) })}
              className="w-full rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[12px] text-[var(--color-text-secondary)]">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={`#${value.color}`}
                onChange={(e) => onChange({ ...value, color: e.target.value.replace('#', '') })}
                className="h-[38px] w-[38px] cursor-pointer rounded-[6px] border border-[var(--color-border)] bg-transparent"
              />
              <input
                type="text"
                value={value.color}
                onChange={(e) => onChange({ ...value, color: e.target.value.replace('#', '') })}
                className="flex-1 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-green)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StylingPanel({ styling, onChange, activeSection }: { styling: StylingConfig; onChange: (s: StylingConfig) => void; activeSection: PreviewMode }) {
  // Deduplicate font families and inject Google Fonts <link> tags
  useEffect(() => {
    const fonts = new Set<string>();
    const collect = (obj: Record<string, TextStyle>) => {
      for (const v of Object.values(obj)) {
        if (v.fontFamily && v.fontFamily !== 'Arial') fonts.add(v.fontFamily);
      }
    };
    collect(styling.cover as Record<string, TextStyle>);
    collect(styling.performanceOrder as Record<string, TextStyle>);
    collect(styling.individual as Record<string, TextStyle>);

    const links: HTMLLinkElement[] = [];
    for (const font of fonts) {
      const existing = document.querySelector(`link[href*="family=${font.replace(/ /g, '+')}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap`;
        document.head.appendChild(link);
        links.push(link);
      }
    }

    return () => {
      for (const link of links) link.remove();
    };
  }, [styling]);

  const sectionLabel = activeSection === 'cover' ? 'Cover Page' : activeSection === 'order' ? 'Performance Order' : 'Individual Pages';

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">Styling</p>
      <p className="mb-4 text-[15px] font-semibold text-[var(--color-text-primary)]">{sectionLabel}</p>

      {activeSection === 'cover' && (
        <div>
          <TextStyleControl label="Title" value={styling.cover.title} onChange={(v) => onChange({ ...styling, cover: { ...styling.cover, title: v } })} />
          <TextStyleControl label="Subtitle" value={styling.cover.subtitle} onChange={(v) => onChange({ ...styling, cover: { ...styling.cover, subtitle: v } })} />
          <TextStyleControl label="Date" value={styling.cover.date} onChange={(v) => onChange({ ...styling, cover: { ...styling.cover, date: v } })} />
          <TextStyleControl label="Time" value={styling.cover.time} onChange={(v) => onChange({ ...styling, cover: { ...styling.cover, time: v } })} />
        </div>
      )}

      {activeSection === 'order' && (
        <div>
          <TextStyleControl label="Name" value={styling.performanceOrder.name} onChange={(v) => onChange({ ...styling, performanceOrder: { ...styling.performanceOrder, name: v } })} />
          <TextStyleControl label="Composer / Piece" value={styling.performanceOrder.composerPiece} onChange={(v) => onChange({ ...styling, performanceOrder: { ...styling.performanceOrder, composerPiece: v } })} />
        </div>
      )}

      {activeSection === 'individual' && (
        <div>
          <TextStyleControl label="Name" value={styling.individual.name} onChange={(v) => onChange({ ...styling, individual: { ...styling.individual, name: v } })} />
          <TextStyleControl label="Composer" value={styling.individual.composer} onChange={(v) => onChange({ ...styling, individual: { ...styling.individual, composer: v } })} />
          <TextStyleControl label="Piece" value={styling.individual.piece} onChange={(v) => onChange({ ...styling, individual: { ...styling.individual, piece: v } })} />
          <TextStyleControl label="Introduction" value={styling.individual.introduction} onChange={(v) => onChange({ ...styling, individual: { ...styling.individual, introduction: v } })} />
        </div>
      )}
    </div>
  );
}
