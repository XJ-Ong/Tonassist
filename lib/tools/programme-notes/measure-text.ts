// Shared text-measurement module. Used by BOTH the server-side PPTX builder
// (lib/tools/programme-notes/build-pptx.ts) and the client-side preview
// (components/tools/programme-notes/SlidePreview.tsx) so their layout math
// can never drift apart. Do not duplicate this logic elsewhere.

const PT_TO_PX = 96 / 72; // canvas measures in CSS px; pptx/our styling uses pt

interface MeasureResult {
  lines: number;
  heightIn: number; // rendered height in inches, ready to add to a Y cursor
}

// Lazily create a canvas 2D context that works in both Node and the browser.
let _ctx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D {
  if (_ctx) return _ctx;
  if (typeof window === 'undefined') {
    // Server (Node): use the `canvas` package.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas } = require('canvas');
    _ctx = createCanvas(1, 1).getContext('2d');
  } else {
    // Browser: use a detached canvas element.
    _ctx = document.createElement('canvas').getContext('2d');
  }
  if (!_ctx) throw new Error('Failed to acquire 2D canvas context for text measurement');
  return _ctx;
}

function wrapLineCount(text: string, fontFamily: string, fontSizePt: number, maxWidthIn: number, bold: boolean): number {
  if (!text) return 0;
  const ctx = getCtx();
  const fontPx = fontSizePt * PT_TO_PX;
  ctx.font = `${bold ? 'bold ' : ''}${fontPx}px ${fontFamily}`;
  const maxWidthPx = maxWidthIn * 96;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let lines = 1;
  let currentLineWidth = 0;
  for (const word of words) {
    const wordWidth = ctx.measureText(word + ' ').width;
    if (currentLineWidth + wordWidth > maxWidthPx && currentLineWidth > 0) {
      lines += 1;
      currentLineWidth = wordWidth;
    } else {
      currentLineWidth += wordWidth;
    }
  }
  return lines;
}

/**
 * Measures how tall a text block will render, given font size (pt, same unit
 * pptxgenjs uses), box width (inches), and whether it's bold.
 * lineHeightMultiplier defaults to 1.2, matching pptxgenjs's default line
 * spacing behavior closely enough for layout purposes.
 */
export function measureTextBlock(
  text: string,
  opts: { fontFamily: string; fontSizePt: number; maxWidthIn: number; bold?: boolean; lineHeightMultiplier?: number }
): MeasureResult {
  const { fontFamily, fontSizePt, maxWidthIn, bold = false, lineHeightMultiplier = 1.2 } = opts;
  const lines = wrapLineCount(text, fontFamily, fontSizePt, maxWidthIn, bold);
  const lineHeightIn = (fontSizePt * lineHeightMultiplier) / 72; // 72pt = 1 inch
  return { lines, heightIn: lines * lineHeightIn };
}
