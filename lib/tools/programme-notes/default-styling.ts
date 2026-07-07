import type { StylingConfig } from '@/types/programme-notes';

export const DEFAULT_STYLING: StylingConfig = {
  cover: {
    title: { fontFamily: 'Arial', fontSize: 32, color: 'FFFFFF' },
    subtitle: { fontFamily: 'Arial', fontSize: 22, color: 'FFFFFF' },
    date: { fontFamily: 'Arial', fontSize: 20, color: 'FFFFFF' },
    time: { fontFamily: 'Arial', fontSize: 20, color: 'FFFFFF' },
  },
  performanceOrder: {
    name: { fontFamily: 'Arial', fontSize: 22, color: '333333' },
    composerPiece: { fontFamily: 'Arial', fontSize: 13, color: '555555' },
  },
  individual: {
    name: { fontFamily: 'Arial', fontSize: 20, color: '333333' },
    composer: { fontFamily: 'Arial', fontSize: 13, color: '555555' },
    piece: { fontFamily: 'Arial', fontSize: 13, color: '555555' },
    introduction: { fontFamily: 'Arial', fontSize: 11, color: '444444' },
  },
};
