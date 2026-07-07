// Shared pagination logic for Performance Order slides.
// Used by both the server-side PPTX builder (build-pptx.ts) and the
// client-side preview (SlidePreview.tsx) so page breaks never diverge.

import { PAGE_WIDTH_IN, PAGE_HEIGHT_IN, PERFORMANCE_ORDER } from './layout-constants';
import { measureTextBlock } from './measure-text';

interface TextStyleMinimal {
  fontFamily: string;
  fontSize: number;
}

export interface PositionedPerformer {
  nameTop: number;
  cpTop: number;
  nameHeight: number;
  cpHeight: number;
  performer: { name: string; composers: string; pieces: string };
}

export type PerformanceOrderPage = PositionedPerformer[];

/**
 * Paginate performers into pages, matching the exact overflow math used by
 * buildPerformanceOrderPages in build-pptx.ts.
 *
 * Returns an array of pages; each page is an array of positioned performer
 * blocks ready to render.
 */
export function paginatePerformanceOrder(
  performers: { name: string; composers: string; pieces: string }[],
  nameStyle: TextStyleMinimal,
  cpStyle: TextStyleMinimal,
): PerformanceOrderPage[] {
  const textWidth = PAGE_WIDTH_IN - PERFORMANCE_ORDER.margin * 2;
  const BLOCK_PADDING = 0.05;
  const BETWEEN_PERFORMERS_GAP = 0.15;
  const maxY = PAGE_HEIGHT_IN - PERFORMANCE_ORDER.margin;

  const pages: PerformanceOrderPage[] = [];
  let currentPage: PerformanceOrderPage = [];
  let currentY = PERFORMANCE_ORDER.startY;

  for (const performer of performers) {
    const nameHeight = measureTextBlock(performer.name, {
      fontFamily: nameStyle.fontFamily,
      fontSizePt: nameStyle.fontSize,
      maxWidthIn: textWidth,
      bold: true,
    }).heightIn;

    const cpText = `${performer.composers} / ${performer.pieces}`;
    const cpHeight = measureTextBlock(cpText, {
      fontFamily: cpStyle.fontFamily,
      fontSizePt: cpStyle.fontSize,
      maxWidthIn: textWidth,
      bold: true,
    }).heightIn;

    const blockTotalHeight = nameHeight + BLOCK_PADDING + cpHeight + BETWEEN_PERFORMERS_GAP;

    // Check if this performer fits on the current page
    if (currentPage.length > 0 && currentY + blockTotalHeight > maxY) {
      // Start a new page
      pages.push(currentPage);
      currentPage = [];
      currentY = PERFORMANCE_ORDER.startY;
    }

    const nameTop = currentY;
    const cpTop = nameTop + nameHeight + BLOCK_PADDING;

    currentPage.push({
      nameTop,
      cpTop,
      nameHeight,
      cpHeight,
      performer,
    });

    currentY = cpTop + cpHeight + BETWEEN_PERFORMERS_GAP;
  }

  // Push the last page if it has performers
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}
