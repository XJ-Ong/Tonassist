import PptxGenJS from 'pptxgenjs';

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

function buildCoverPage(pptx: PptxGenJS, bg: string, edition: string, date: string, time: string, tz: string) {
  const slide = pptx.addSlide();
  addBackground(slide, bg);

  slide.addShape('rect', { x: 0.3, y: 0.3, w: 3.2, h: 0.6, fill: { color: '000000', transparency: 50 }, line: { width: 0 } });
  slide.addText(edition, { x: 0.4, y: 0.4, w: 3, h: 0.5, fontSize: 28, fontFace: 'Arial', bold: true, color: 'FFFFFF' });

  slide.addShape('rect', { x: 1.4, y: 7.7, w: 4.7, h: 1.1, fill: { color: '000000', transparency: 50 }, line: { width: 0 } });
  slide.addText(date, { x: 1.5, y: 7.8, w: 4.5, h: 0.4, fontSize: 20, fontFace: 'Arial', color: 'FFFFFF', align: 'center' });
  slide.addText(`${time}  ${tz}`, { x: 1.5, y: 8.3, w: 4.5, h: 0.4, fontSize: 20, fontFace: 'Arial', color: 'FFFFFF', align: 'center' });
}

function buildPerformanceOrderPages(pptx: PptxGenJS, bg: string, performers: Performer[]) {
  const slide = pptx.addSlide();
  addBackground(slide, bg);
  addOverlay(slide);
  const PAGE_HEIGHT = 10.63;
  const MARGIN = 0.5;
  let currentY = 0.6;
  let currentSlide = slide;
  const blockHeight = 0.8;

  for (const performer of performers) {
    if (currentY + blockHeight > PAGE_HEIGHT - MARGIN) {
      currentSlide = pptx.addSlide();
      addBackground(currentSlide, bg);
      addOverlay(currentSlide);
      currentY = 0.6;
    }
    currentSlide.addText(performer.name, { x: MARGIN, y: currentY, w: 7.5 - MARGIN * 2, h: 0.3, fontSize: 22, fontFace: 'Arial', bold: true, color: '333333', align: 'center' });
    currentSlide.addText(`${performer.composers} / ${performer.pieces}`, { x: MARGIN, y: currentY + 0.3, w: 7.5 - MARGIN * 2, h: 0.3, fontSize: 13, fontFace: 'Arial', bold: true, color: '555555', align: 'center' });
    currentY += blockHeight;
  }
}

function addPerformerBlock(slide: PptxGenJS.Slide, performer: Performer, photoOnLeft: boolean, ml: number, startY: number, maxHeight: number) {
  const PS = 1.5;
  const tx = photoOnLeft ? ml + PS + 0.3 : ml;
  const px = photoOnLeft ? ml : 7.5 - ml - PS;
  const tw = 7.5 - ml * 2 - PS - 0.3;

  slide.addImage({ data: `data:image/jpeg;base64,${performer.photoBase64}`, x: px, y: startY, w: PS, h: PS });
  slide.addText(performer.name, { x: tx, y: startY, w: tw, h: 0.35, fontSize: 20, fontFace: 'Arial', bold: true, color: '333333' });
  slide.addText(performer.composers, { x: tx, y: startY + 0.4, w: tw, h: 0.25, fontSize: 13, fontFace: 'Arial', bold: true, color: '555555' });
  slide.addText(performer.pieces, { x: tx, y: startY + 0.65, w: tw, h: 0.25, fontSize: 13, fontFace: 'Arial', bold: true, color: '555555' });
  if (performer.introduction) {
    slide.addText(performer.introduction, { x: tx, y: startY + 0.95, w: tw, h: maxHeight - 0.95, fontSize: 11, fontFace: 'Arial', color: '444444', valign: 'top' });
  }
}

function buildIndividualPages(pptx: PptxGenJS, bg: string, performers: Performer[]) {
  const SHORT = 300;
  const ML = 0.5;
  const PAGE_HEIGHT = 10.63;
  const MARGIN_BOTTOM = 0.5;
  let i = 0;
  while (i < performers.length) {
    const p = performers[i];
    const isLong = p.introduction.length > SHORT;
    if (isLong) {
      const slide = pptx.addSlide();
      addBackground(slide, bg);
      addOverlay(slide);
      addPerformerBlock(slide, p, (i + 1) % 2 === 1, ML, 1.5, PAGE_HEIGHT - MARGIN_BOTTOM - 1.5);
      i++;
    } else {
      const next = i + 1 < performers.length ? performers[i + 1] : null;
      if (next && next.introduction.length <= SHORT) {
        const slide = pptx.addSlide();
        addBackground(slide, bg);
        addOverlay(slide);
        addPerformerBlock(slide, performers[i], (i + 1) % 2 === 1, ML, 0.6, 5.0 - 0.6);
        addPerformerBlock(slide, performers[i + 1], (i + 2) % 2 === 1, ML, 5.0, PAGE_HEIGHT - MARGIN_BOTTOM - 5.0);
        i += 2;
      } else {
        const slide = pptx.addSlide();
        addBackground(slide, bg);
        addOverlay(slide);
        addPerformerBlock(slide, p, (i + 1) % 2 === 1, ML, 1.5, PAGE_HEIGHT - MARGIN_BOTTOM - 1.5);
        i++;
      }
    }
  }
}

export async function buildPptx(options: BuildPptxOptions): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'A4_P', width: 7.5, height: 10.63 });
  pptx.layout = 'A4_P';
  buildCoverPage(pptx, options.backgroundBase64, options.edition, options.date, options.time, options.timezone);
  buildPerformanceOrderPages(pptx, options.backgroundBase64, options.performers);
  buildIndividualPages(pptx, options.backgroundBase64, options.performers);
  const raw = await pptx.stream();
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
}
