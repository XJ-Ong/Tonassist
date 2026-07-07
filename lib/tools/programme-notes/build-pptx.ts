import PptxGenJS from 'pptxgenjs';
import { PAGE_WIDTH_IN, PAGE_HEIGHT_IN, COVER, PERFORMANCE_ORDER, INDIVIDUAL } from './layout-constants';
import type { StylingConfig } from '@/types/programme-notes';
import { formatDate } from './format-date';
import { measureTextBlock } from './measure-text';
import { paginatePerformanceOrder } from './paginate-performance-order';

const WRAP_SAFETY_MARGIN = 0.95;

interface Performer {
  name: string;
  pieces: string;
  composers: string;
  introduction: string;
  photoBase64: string;
}

interface BuildPptxOptions {
  performers: Performer[];
  backgroundBase64: string;
  edition: string;
  date: string;
  time: string;
  timezone: string;
  styling?: StylingConfig;
}

function addOverlay(slide: PptxGenJS.Slide) {
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: 'FFFFFF', transparency: 50 },
    line: { color: 'FFFFFF', transparency: 100 },
  });
}

function addBackground(slide: PptxGenJS.Slide, bgBase64: string) {
  slide.addImage({ data: `data:image/jpeg;base64,${bgBase64}`, x: 0, y: 0, w: '100%', h: '100%' });
}

function buildCoverPage(pptx: PptxGenJS, bg: string, edition: string, date: string, time: string, tz: string, styling?: StylingConfig) {
  const slide = pptx.addSlide();
  addBackground(slide, bg);

  const titleText = 'Tonicist Association';
  const subtitleText = `${edition} Online Performance`;

  const titleStyle = { fontFamily: styling?.cover.title.fontFamily ?? 'Arial', fontSizePt: styling?.cover.title.fontSize ?? 32, bold: true };
  const subtitleStyle = { fontFamily: styling?.cover.subtitle.fontFamily ?? 'Arial', fontSizePt: styling?.cover.subtitle.fontSize ?? 22, bold: false };

  // LIMITATION: this measurement assumes a font that's actually available to
  // the `canvas` package on the server (e.g. Arial / standard system fonts).
  // If styling.cover.title.fontFamily is a custom Google Font loaded
  // client-side (see StylingPanel.tsx), this server-side measurement has no
  // knowledge of that font's real metrics and will silently fall back to a
  // generic font, producing an inaccurate wrap estimate. Not fixed in this
  // pass — would require downloading and registering the specific font file
  // server-side via canvas's registerFont() before measuring.

  const titleHeight = measureTextBlock(titleText, { ...titleStyle, maxWidthIn: COVER.titleBox.w * WRAP_SAFETY_MARGIN }).heightIn;
  const titleBoxH = Math.max(COVER.titleBox.h, titleHeight);

  const titleBackingH = Math.max(COVER.titleBacking.h, titleHeight + (COVER.titleBox.y - COVER.titleBacking.y) + 0.15);
  const subtitleY = COVER.titleBox.y + titleBoxH + 0.1;

  slide.addShape('rect', { x: COVER.titleBacking.x, y: COVER.titleBacking.y, w: COVER.titleBacking.w, h: titleBackingH, fill: { color: '000000', transparency: 50 }, line: { width: 0 } });
  slide.addText(titleText, { x: COVER.titleBox.x, y: COVER.titleBox.y, w: COVER.titleBox.w, h: titleBoxH, fontSize: titleStyle.fontSizePt, fontFace: titleStyle.fontFamily, bold: true, color: styling?.cover.title.color ?? 'FFFFFF', margin: 0 });
  slide.addText(subtitleText, { x: COVER.subtitleBox.x, y: subtitleY, w: COVER.subtitleBox.w, h: COVER.subtitleBox.h, fontSize: subtitleStyle.fontSizePt, fontFace: subtitleStyle.fontFamily, color: styling?.cover.subtitle.color ?? 'FFFFFF', margin: 0 });

  const formattedDate = formatDate(date);
  slide.addShape('rect', { x: COVER.dateBacking.x, y: COVER.dateBacking.y, w: COVER.dateBacking.w, h: COVER.dateBacking.h, fill: { color: '000000', transparency: 50 }, line: { width: 0 } });
  slide.addText(formattedDate, { x: COVER.dateBox.x, y: COVER.dateBox.y, w: COVER.dateBox.w, h: COVER.dateBox.h, fontSize: styling?.cover.date.fontSize ?? 20, fontFace: styling?.cover.date.fontFamily ?? 'Arial', color: styling?.cover.date.color ?? 'FFFFFF', align: 'center', margin: 0 });
  slide.addText(`${time}  ${tz}`, { x: COVER.timeBox.x, y: COVER.timeBox.y, w: COVER.timeBox.w, h: COVER.timeBox.h, fontSize: styling?.cover.time.fontSize ?? 20, fontFace: styling?.cover.time.fontFamily ?? 'Arial', color: styling?.cover.time.color ?? 'FFFFFF', align: 'center', margin: 0 });
}

function buildPerformanceOrderPages(pptx: PptxGenJS, bg: string, performers: Performer[], styling?: StylingConfig) {
  const nameStyle = { fontFamily: styling?.performanceOrder.name.fontFamily ?? 'Arial', fontSize: styling?.performanceOrder.name.fontSize ?? 22 };
  const cpStyle = { fontFamily: styling?.performanceOrder.composerPiece.fontFamily ?? 'Arial', fontSize: styling?.performanceOrder.composerPiece.fontSize ?? 13 };
  const textWidth = PAGE_WIDTH_IN - PERFORMANCE_ORDER.margin * 2;

  const pages = paginatePerformanceOrder(performers, nameStyle, cpStyle);

  for (const page of pages) {
    const slide = pptx.addSlide();
    addBackground(slide, bg);
    addOverlay(slide);

    for (const block of page) {
      slide.addText(block.performer.name, {
        x: PERFORMANCE_ORDER.margin,
        y: block.nameTop,
        w: textWidth,
        h: block.nameHeight,
        fontSize: nameStyle.fontSize,
        fontFace: nameStyle.fontFamily,
        bold: true,
        color: styling?.performanceOrder.name.color ?? '333333',
        align: 'center',
        margin: 0,
      });

      const cpText = `${block.performer.composers} / ${block.performer.pieces}`;
      slide.addText(cpText, {
        x: PERFORMANCE_ORDER.margin,
        y: block.cpTop,
        w: textWidth,
        h: block.cpHeight,
        fontSize: cpStyle.fontSize,
        fontFace: cpStyle.fontFamily,
        bold: true,
        color: styling?.performanceOrder.composerPiece.color ?? '555555',
        align: 'center',
        margin: 0,
      });
    }
  }
}

function addPerformerBlock(slide: PptxGenJS.Slide, performer: Performer, photoOnLeft: boolean, startY: number, maxHeight: number, styling?: StylingConfig) {
  const PS = INDIVIDUAL.photoSize;
  const ml = INDIVIDUAL.margin;
  const gap = 0.3;
  const px = photoOnLeft ? ml : PAGE_WIDTH_IN - ml - PS;
  const tx = photoOnLeft ? ml + PS + gap : ml;
  const tw = PAGE_WIDTH_IN - ml * 2 - PS - gap;

  const nameStyle = { fontFamily: styling?.individual.name.fontFamily ?? 'Arial', fontSizePt: styling?.individual.name.fontSize ?? 20, bold: true };
  const composerStyle = { fontFamily: styling?.individual.composer.fontFamily ?? 'Arial', fontSizePt: styling?.individual.composer.fontSize ?? 13, bold: true };
  const pieceStyle = { fontFamily: styling?.individual.piece.fontFamily ?? 'Arial', fontSizePt: styling?.individual.piece.fontSize ?? 13, bold: true };

  const nameHeight = measureTextBlock(performer.name, { ...nameStyle, maxWidthIn: tw * WRAP_SAFETY_MARGIN }).heightIn;
  const composerHeight = measureTextBlock(performer.composers, { ...composerStyle, maxWidthIn: tw * WRAP_SAFETY_MARGIN }).heightIn;
  const pieceHeight = measureTextBlock(performer.pieces, { ...pieceStyle, maxWidthIn: tw * WRAP_SAFETY_MARGIN }).heightIn;

  const BLOCK_PADDING = 0.05;
  const headerHeight = nameHeight + composerHeight + pieceHeight + 2 * BLOCK_PADDING;

  let cursorY = startY;
  slide.addImage({ data: `data:image/jpeg;base64,${performer.photoBase64}`, x: px, y: startY, w: PS, h: PS });

  slide.addText(performer.name, { x: tx, y: cursorY, w: tw, h: nameHeight, fontSize: nameStyle.fontSizePt, fontFace: nameStyle.fontFamily, bold: true, color: styling?.individual.name.color ?? '333333', margin: 0 });
  cursorY += nameHeight + BLOCK_PADDING;

  slide.addText(performer.composers, { x: tx, y: cursorY, w: tw, h: composerHeight, fontSize: composerStyle.fontSizePt, fontFace: composerStyle.fontFamily, bold: true, color: styling?.individual.composer.color ?? '555555', margin: 0 });
  cursorY += composerHeight + BLOCK_PADDING;

  slide.addText(performer.pieces, { x: tx, y: cursorY, w: tw, h: pieceHeight, fontSize: pieceStyle.fontSizePt, fontFace: pieceStyle.fontFamily, bold: true, color: styling?.individual.piece.color ?? '555555', margin: 0 });
  cursorY += pieceHeight + BLOCK_PADDING;

  if (performer.introduction && headerHeight <= maxHeight) {
    const PIECE_TO_INTRO_GAP = 0.075;
    const introTop = cursorY + PIECE_TO_INTRO_GAP;
    slide.addText(performer.introduction, { x: tx, y: introTop, w: tw, h: Math.max(0.2, maxHeight - (introTop - startY)), fontSize: styling?.individual.introduction.fontSize ?? 11, fontFace: styling?.individual.introduction.fontFamily ?? 'Arial', color: styling?.individual.introduction.color ?? '444444', valign: 'top', margin: 0 });
  } else if (performer.introduction && headerHeight > maxHeight) {
    console.warn(`[build-pptx] Header height (${headerHeight.toFixed(2)}in) exceeds available space (${maxHeight.toFixed(2)}in) for performer "${performer.name}" — skipping introduction`);
  }
}

function buildIndividualPages(pptx: PptxGenJS, bg: string, performers: Performer[], styling?: StylingConfig) {
  for (let i = 0; i < performers.length; i++) {
    const slide = pptx.addSlide();
    addBackground(slide, bg);
    addOverlay(slide);
    const photoOnLeft = (i + 1) % 2 === 1;
    addPerformerBlock(slide, performers[i], photoOnLeft, INDIVIDUAL.startY, PAGE_HEIGHT_IN - INDIVIDUAL.margin - INDIVIDUAL.startY, styling);
  }
}

export async function buildPptx(options: BuildPptxOptions): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'A4_P', width: PAGE_WIDTH_IN, height: PAGE_HEIGHT_IN });
  pptx.layout = 'A4_P';
  buildCoverPage(pptx, options.backgroundBase64, options.edition, options.date, options.time, options.timezone, options.styling);
  buildPerformanceOrderPages(pptx, options.backgroundBase64, options.performers, options.styling);
  buildIndividualPages(pptx, options.backgroundBase64, options.performers, options.styling);
  const raw = await pptx.stream();
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
}
