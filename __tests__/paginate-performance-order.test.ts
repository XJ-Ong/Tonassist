import { describe, it, expect } from 'vitest';
import { paginatePerformanceOrder } from '@/lib/tools/programme-notes/paginate-performance-order';

const defaultNameStyle = { fontFamily: 'Arial', fontSize: 22 };
const defaultCpStyle = { fontFamily: 'Arial', fontSize: 13 };

function makePerformers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Performer ${i + 1}`,
    composers: `Composer ${i + 1}`,
    pieces: `Piece ${i + 1}`,
  }));
}

describe('paginatePerformanceOrder', () => {
  it('returns a single page for a small number of performers', () => {
    const performers = makePerformers(3);
    const pages = paginatePerformanceOrder(performers, defaultNameStyle, defaultCpStyle);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
  });

  it('paginates when performers exceed a single page', () => {
    const performers = makePerformers(30);
    const pages = paginatePerformanceOrder(performers, defaultNameStyle, defaultCpStyle);
    expect(pages.length).toBeGreaterThan(1);
    const totalPerformers = pages.reduce((sum, page) => sum + page.length, 0);
    expect(totalPerformers).toBe(30);
  });

  it('preserves performer order across pages', () => {
    const performers = makePerformers(25);
    const pages = paginatePerformanceOrder(performers, defaultNameStyle, defaultCpStyle);
    const flatNames = pages.flat().map((b) => b.performer.name);
    expect(flatNames).toEqual(performers.map((p) => p.name));
  });

  it('handles empty performer list', () => {
    const pages = paginatePerformanceOrder([], defaultNameStyle, defaultCpStyle);
    expect(pages).toHaveLength(0);
  });

  it('positions performers with correct top coordinates', () => {
    const performers = makePerformers(2);
    const pages = paginatePerformanceOrder(performers, defaultNameStyle, defaultCpStyle);
    expect(pages[0][0].nameTop).toBeGreaterThan(0);
    expect(pages[0][0].cpTop).toBeGreaterThan(pages[0][0].nameTop);
    expect(pages[0][1].nameTop).toBeGreaterThan(pages[0][0].cpTop);
  });

  it('breaks page at correct performer index for large fonts', () => {
    const longNamePerformers = Array.from({ length: 20 }, (_, i) => ({
      name: `Very Long Performer Name ${i + 1} That Takes Up Space`,
      composers: `Composer ${i + 1}`,
      pieces: `Piece ${i + 1}`,
    }));
    const largeFontName = { fontFamily: 'Arial', fontSize: 40 };
    const pages = paginatePerformanceOrder(longNamePerformers, largeFontName, defaultCpStyle);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].length).toBeLessThan(20);
  });
});
