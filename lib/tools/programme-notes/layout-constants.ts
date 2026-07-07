// Page dimensions (inches) — matches pptx.defineLayout in build-pptx.ts
export const PAGE_WIDTH_IN = 7.5;
export const PAGE_HEIGHT_IN = 10.63;

// Cover page layout
export const COVER = {
  titleBacking: { x: 0.3, y: 0.3, w: 5.5, h: 1.2 },
  titleBox: { x: 0.4, y: 0.35, w: 5.3, h: 0.6 },
  subtitleBox: { x: 0.4, y: 0.9, w: 5.3, h: 0.5 },
  dateBacking: { x: 1.4, y: 7.7, w: 4.7, h: 1.1 },
  dateBox: { x: 1.5, y: 7.8, w: 4.5, h: 0.4 },
  timeBox: { x: 1.5, y: 8.3, w: 4.5, h: 0.4 },
} as const;

// Performance order page layout
export const PERFORMANCE_ORDER = {
  margin: 0.5,
  startY: 0.6,
} as const;

// Individual performer page layout
export const INDIVIDUAL = {
  margin: 0.5,
  photoSize: 1.5,
  startY: 1.5,
} as const;
