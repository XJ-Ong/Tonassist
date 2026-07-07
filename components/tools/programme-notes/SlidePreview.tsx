'use client';

import { useState, useMemo, useEffect, useReducer } from 'react';
import type { ParsedPerformer, StylingConfig } from '@/types/programme-notes';
import { PAGE_WIDTH_IN, PAGE_HEIGHT_IN, COVER, PERFORMANCE_ORDER, INDIVIDUAL } from '@/lib/tools/programme-notes/layout-constants';
import { formatDate } from '@/lib/tools/programme-notes/format-date';
import { measureTextBlock } from '@/lib/tools/programme-notes/measure-text';
import { paginatePerformanceOrder } from '@/lib/tools/programme-notes/paginate-performance-order';

const WRAP_SAFETY_MARGIN = 0.95;

export type PreviewMode = 'cover' | 'order' | 'individual';

function pct(inches: number, totalInches: number): string {
  return `${(inches / totalInches) * 100}%`;
}

// fontSize is in points (pt), same unit pptxgenjs uses. Converting to `cqw`
// (container query width units, 1cqw = 1% of the nearest container's width)
// keeps the preview's font size proportional to the canvas exactly the way
// pptx points are proportional to the PAGE_WIDTH_IN-wide slide, at any
// preview render size. Requires `containerType: 'inline-size'` on the
// canvas div (see 1.1.c below).
function fontSizeCqw(pt: number): string {
  return `${(pt / 72 / PAGE_WIDTH_IN) * 100}cqw`;
}

export function SlidePreview({ performers, styling, backgroundBase64, mode, onModeChange, edition, date, time, timezone }: { performers: ParsedPerformer[]; styling: StylingConfig; backgroundBase64: string | null; mode: PreviewMode; onModeChange: (m: PreviewMode) => void; edition: string; date: string; time: string; timezone: string }) {
  const [performerIndex, setPerformerIndex] = useState(0);
  const [orderPageIndex, setOrderPageIndex] = useState(0);
  const [fontsReady, dispatchFontsReady] = useReducer(
    (state: boolean, action: 'reset' | 'ready') => action === 'ready',
    false,
  );

  const fontFamilies = useMemo(() => {
    const fonts = new Set<string>();
    const collect = (obj: Record<string, { fontFamily: string }>) => {
      for (const v of Object.values(obj)) {
        if (v.fontFamily && v.fontFamily !== 'Arial') fonts.add(v.fontFamily);
      }
    };
    collect(styling.cover as Record<string, { fontFamily: string }>);
    collect(styling.performanceOrder as Record<string, { fontFamily: string }>);
    collect(styling.individual as Record<string, { fontFamily: string }>);
    return Array.from(fonts);
  }, [styling]);

  useEffect(() => {
    dispatchFontsReady('reset');

    if (fontFamilies.length === 0) {
      dispatchFontsReady('ready');
      return;
    }

    const promises = fontFamilies.map((f) => document.fonts.load(`16px "${f}"`));
    Promise.all(promises).then(() => {
      dispatchFontsReady('ready');
    });
  }, [fontFamilies]);

  const currentPerformer = performers[performerIndex] ?? performers[0];

  const orderPages = useMemo(() => {
    const nameStyle = { fontFamily: styling.performanceOrder.name.fontFamily, fontSize: styling.performanceOrder.name.fontSize };
    const cpStyle = { fontFamily: styling.performanceOrder.composerPiece.fontFamily, fontSize: styling.performanceOrder.composerPiece.fontSize };
    return paginatePerformanceOrder(performers, nameStyle, cpStyle);
  }, [performers, styling]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => onModeChange('cover')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition-colors ${mode === 'cover' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' : 'border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
          Cover
        </button>
        <button onClick={() => onModeChange('order')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition-colors ${mode === 'order' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' : 'border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
          Performance Order
        </button>
        <button onClick={() => onModeChange('individual')}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] transition-colors ${mode === 'individual' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' : 'border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
          Individual
        </button>
      </div>

      {mode === 'individual' && performers.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => setPerformerIndex((i) => Math.max(0, i - 1))} disabled={performerIndex === 0}
            className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-2 py-1 text-[12px] text-[var(--color-text-secondary)] disabled:opacity-50">
            ←
          </button>
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            {performerIndex + 1} / {performers.length}
          </span>
          <button onClick={() => setPerformerIndex((i) => Math.min(performers.length - 1, i + 1))} disabled={performerIndex === performers.length - 1}
            className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-2 py-1 text-[12px] text-[var(--color-text-secondary)] disabled:opacity-50">
            →
          </button>
        </div>
      )}

      {mode === 'order' && orderPages.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => setOrderPageIndex((i) => Math.max(0, i - 1))} disabled={orderPageIndex === 0}
            className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-2 py-1 text-[12px] text-[var(--color-text-secondary)] disabled:opacity-50">
            ←
          </button>
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            Page {orderPageIndex + 1} / {orderPages.length}
          </span>
          <button onClick={() => setOrderPageIndex((i) => Math.min(orderPages.length - 1, i + 1))} disabled={orderPageIndex === orderPages.length - 1}
            className="rounded-[6px] border border-[var(--color-border)] bg-transparent px-2 py-1 text-[12px] text-[var(--color-text-secondary)] disabled:opacity-50">
            →
          </button>
        </div>
      )}

      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
        <div style={{ aspectRatio: `${PAGE_WIDTH_IN} / ${PAGE_HEIGHT_IN}`, position: 'relative', background: backgroundBase64 ? `url(${backgroundBase64}) center/cover no-repeat` : '#1a1a1a', borderRadius: '6px', overflow: 'hidden', containerType: 'inline-size' }}>
          {(mode === 'order' || mode === 'individual') && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }} />
          )}
          {fontsReady && mode === 'cover' && (() => {
            const titleStyle = { fontFamily: styling.cover.title.fontFamily, fontSizePt: styling.cover.title.fontSize, bold: true };
            // LIMITATION: this measurement assumes a font that's actually available to
            // the `canvas` package on the server (e.g. Arial / standard system fonts).
            // If styling.cover.title.fontFamily is a custom Google Font loaded
            // client-side (see StylingPanel.tsx), this server-side measurement has no
            // knowledge of that font's real metrics and will silently fall back to a
            // generic font, producing an inaccurate wrap estimate. Not fixed in this
            // pass — would require downloading and registering the specific font file
            // server-side via canvas's registerFont() before measuring.
            const WRAP_SAFETY_MARGIN = 0.95;
            const titleHeight = measureTextBlock('Tonicist Association', { ...titleStyle, maxWidthIn: COVER.titleBox.w * WRAP_SAFETY_MARGIN }).heightIn;
            const titleBoxH = Math.max(COVER.titleBox.h, titleHeight);
            const titleBackingH = Math.max(COVER.titleBacking.h, titleHeight + (COVER.titleBox.y - COVER.titleBacking.y) + 0.15);
            const subtitleY = COVER.titleBox.y + titleBoxH + 0.1;

            return (
              <>
                <div style={{ position: 'absolute', left: pct(COVER.titleBacking.x, PAGE_WIDTH_IN), top: pct(COVER.titleBacking.y, PAGE_HEIGHT_IN), width: pct(COVER.titleBacking.w, PAGE_WIDTH_IN), height: pct(titleBackingH, PAGE_HEIGHT_IN), background: 'rgba(0,0,0,0.5)', borderRadius: '4px' }} />
                <div style={{ position: 'absolute', left: pct(COVER.titleBox.x, PAGE_WIDTH_IN), top: pct(COVER.titleBox.y, PAGE_HEIGHT_IN), width: pct(COVER.titleBox.w, PAGE_WIDTH_IN), height: pct(titleBoxH, PAGE_HEIGHT_IN), fontFamily: styling.cover.title.fontFamily, fontSize: fontSizeCqw(styling.cover.title.fontSize), fontWeight: 'bold', color: `#${styling.cover.title.color}`, display: 'flex', alignItems: 'center' }}>
                  Tonicist Association
                </div>
                <div style={{ position: 'absolute', left: pct(COVER.subtitleBox.x, PAGE_WIDTH_IN), top: pct(subtitleY, PAGE_HEIGHT_IN), width: pct(COVER.subtitleBox.w, PAGE_WIDTH_IN), height: pct(COVER.subtitleBox.h, PAGE_HEIGHT_IN), fontFamily: styling.cover.subtitle.fontFamily, fontSize: fontSizeCqw(styling.cover.subtitle.fontSize), color: `#${styling.cover.subtitle.color}`, display: 'flex', alignItems: 'center' }}>
                  {edition ? `${edition} Online Performance` : 'Edition Online Performance'}
                </div>
                <div style={{ position: 'absolute', left: pct(COVER.dateBacking.x, PAGE_WIDTH_IN), top: pct(COVER.dateBacking.y, PAGE_HEIGHT_IN), width: pct(COVER.dateBacking.w, PAGE_WIDTH_IN), height: pct(COVER.dateBacking.h, PAGE_HEIGHT_IN), background: 'rgba(0,0,0,0.5)', borderRadius: '4px' }} />
                <div style={{ position: 'absolute', left: pct(COVER.dateBox.x, PAGE_WIDTH_IN), top: pct(COVER.dateBox.y, PAGE_HEIGHT_IN), width: pct(COVER.dateBox.w, PAGE_WIDTH_IN), height: pct(COVER.dateBox.h, PAGE_HEIGHT_IN), fontFamily: styling.cover.date.fontFamily, fontSize: fontSizeCqw(styling.cover.date.fontSize), color: `#${styling.cover.date.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {date ? formatDate(date) : '1st January 2026'}
                </div>
                <div style={{ position: 'absolute', left: pct(COVER.timeBox.x, PAGE_WIDTH_IN), top: pct(COVER.timeBox.y, PAGE_HEIGHT_IN), width: pct(COVER.timeBox.w, PAGE_WIDTH_IN), height: pct(COVER.timeBox.h, PAGE_HEIGHT_IN), fontFamily: styling.cover.time.fontFamily, fontSize: fontSizeCqw(styling.cover.time.fontSize), color: `#${styling.cover.time.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {time ? `${time}  ${timezone}` : '7:30 PM UTC+8'}
                </div>
              </>
            );
          })()}

          {fontsReady && mode === 'order' && (
            <>
              {orderPages[orderPageIndex]?.map((block) => (
                <div key={block.performer.name}>
                  <div style={{ position: 'absolute', left: pct(PERFORMANCE_ORDER.margin, PAGE_WIDTH_IN), top: pct(block.nameTop, PAGE_HEIGHT_IN), width: pct(PAGE_WIDTH_IN - PERFORMANCE_ORDER.margin * 2, PAGE_WIDTH_IN), textAlign: 'center', fontFamily: styling.performanceOrder.name.fontFamily, fontSize: fontSizeCqw(styling.performanceOrder.name.fontSize), fontWeight: 'bold', color: `#${styling.performanceOrder.name.color}` }}>
                    {block.performer.name}
                  </div>
                  <div style={{ position: 'absolute', left: pct(PERFORMANCE_ORDER.margin, PAGE_WIDTH_IN), top: pct(block.cpTop, PAGE_HEIGHT_IN), width: pct(PAGE_WIDTH_IN - PERFORMANCE_ORDER.margin * 2, PAGE_WIDTH_IN), textAlign: 'center', fontFamily: styling.performanceOrder.composerPiece.fontFamily, fontSize: fontSizeCqw(styling.performanceOrder.composerPiece.fontSize), fontWeight: 'bold', color: `#${styling.performanceOrder.composerPiece.color}` }}>
                    {block.performer.composers} / {block.performer.pieces}
                  </div>
                </div>
              ))}
            </>
          )}

          {fontsReady && mode === 'individual' && currentPerformer && (
            <>
              {(() => {
                const photoOnLeft = (performerIndex + 1) % 2 === 1;
                const PS = INDIVIDUAL.photoSize;
                const gap = 0.3;
                const px = photoOnLeft ? INDIVIDUAL.margin : PAGE_WIDTH_IN - INDIVIDUAL.margin - PS;
                const tx = photoOnLeft ? INDIVIDUAL.margin + PS + gap : INDIVIDUAL.margin;
                const tw = PAGE_WIDTH_IN - INDIVIDUAL.margin * 2 - PS - gap;

                const nameHeight = measureTextBlock(currentPerformer.name, { fontFamily: styling.individual.name.fontFamily, fontSizePt: styling.individual.name.fontSize, maxWidthIn: tw * WRAP_SAFETY_MARGIN, bold: true }).heightIn;
                const composerHeight = measureTextBlock(currentPerformer.composers, { fontFamily: styling.individual.composer.fontFamily, fontSizePt: styling.individual.composer.fontSize, maxWidthIn: tw * WRAP_SAFETY_MARGIN, bold: true }).heightIn;
                const pieceHeight = measureTextBlock(currentPerformer.pieces, { fontFamily: styling.individual.piece.fontFamily, fontSizePt: styling.individual.piece.fontSize, maxWidthIn: tw * WRAP_SAFETY_MARGIN, bold: true }).heightIn;
                const BLOCK_PADDING = 0.05;
                const headerHeight = nameHeight + composerHeight + pieceHeight + 2 * BLOCK_PADDING;
                const maxHeight = PAGE_HEIGHT_IN - INDIVIDUAL.margin - INDIVIDUAL.startY;
                const nameTop = INDIVIDUAL.startY;
                const composerTop = nameTop + nameHeight + BLOCK_PADDING;
                const pieceTop = composerTop + composerHeight + BLOCK_PADDING;
                const PIECE_TO_INTRO_GAP = 0.075;
                const introTop = pieceTop + pieceHeight + BLOCK_PADDING + PIECE_TO_INTRO_GAP;
                const showIntroduction = currentPerformer.introduction && headerHeight <= maxHeight;

                return (
                  <>
                    {/* Photo */}
                    {currentPerformer.photoBase64 ? (
                      <img
                        src={currentPerformer.photoBase64}
                        alt={currentPerformer.name}
                        style={{ position: 'absolute', left: pct(px, PAGE_WIDTH_IN), top: pct(INDIVIDUAL.startY, PAGE_HEIGHT_IN), width: pct(PS, PAGE_WIDTH_IN), height: pct(PS, PAGE_HEIGHT_IN), objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ position: 'absolute', left: pct(px, PAGE_WIDTH_IN), top: pct(INDIVIDUAL.startY, PAGE_HEIGHT_IN), width: pct(PS, PAGE_WIDTH_IN), height: pct(PS, PAGE_HEIGHT_IN), background: '#333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '10px' }}>
                        📷
                      </div>
                    )}
                    {/* Name */}
                    <div style={{ position: 'absolute', left: pct(tx, PAGE_WIDTH_IN), top: pct(nameTop, PAGE_HEIGHT_IN), width: pct(tw, PAGE_WIDTH_IN), fontFamily: styling.individual.name.fontFamily, fontSize: fontSizeCqw(styling.individual.name.fontSize), fontWeight: 'bold', color: `#${styling.individual.name.color}` }}>
                      {currentPerformer.name}
                    </div>
                    {/* Composer */}
                    <div style={{ position: 'absolute', left: pct(tx, PAGE_WIDTH_IN), top: pct(composerTop, PAGE_HEIGHT_IN), width: pct(tw, PAGE_WIDTH_IN), fontFamily: styling.individual.composer.fontFamily, fontSize: fontSizeCqw(styling.individual.composer.fontSize), fontWeight: 'bold', color: `#${styling.individual.composer.color}` }}>
                      {currentPerformer.composers}
                    </div>
                    {/* Piece */}
                    <div style={{ position: 'absolute', left: pct(tx, PAGE_WIDTH_IN), top: pct(pieceTop, PAGE_HEIGHT_IN), width: pct(tw, PAGE_WIDTH_IN), fontFamily: styling.individual.piece.fontFamily, fontSize: fontSizeCqw(styling.individual.piece.fontSize), fontWeight: 'bold', color: `#${styling.individual.piece.color}` }}>
                      {currentPerformer.pieces}
                    </div>
                    {/* Introduction */}
                    {showIntroduction && (
                      <div style={{ position: 'absolute', left: pct(tx, PAGE_WIDTH_IN), top: pct(introTop, PAGE_HEIGHT_IN), width: pct(tw, PAGE_WIDTH_IN), fontFamily: styling.individual.introduction.fontFamily, fontSize: fontSizeCqw(styling.individual.introduction.fontSize), color: `#${styling.individual.introduction.color}` }}>
                        {currentPerformer.introduction}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
