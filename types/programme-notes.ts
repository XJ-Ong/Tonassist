export interface FormState {
  xlsx: File | null;
  background: File | null;
  edition: string;
  date: string;
  time: string;
  timezone: string;
}

export interface AiCorrection {
  performer: string;
  field: 'composer' | 'piece';
  original: string;
  corrected: string;
}

export interface AiQaChange {
  original: string;
  corrected: string;
}

export interface AiQaItem {
  performer: string;
  changes: AiQaChange[];
}

export interface AiReport {
  corrections: AiCorrection[];
  qa: AiQaItem[];
  drafts: { performer: string; text: string }[];
  failed: string[];
}

export interface Photo {
  name: string;
  base64: string; // with data:image/jpeg;base64, prefix
  created_at: string | null;
  last_updated: string | null;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string; // hex, no '#', matches pptxgenjs convention
}

export interface StylingConfig {
  cover: {
    title: TextStyle;
    subtitle: TextStyle;
    date: TextStyle;
    time: TextStyle;
  };
  performanceOrder: {
    name: TextStyle;
    composerPiece: TextStyle;
  };
  individual: {
    name: TextStyle;
    composer: TextStyle;
    piece: TextStyle;
    introduction: TextStyle;
  };
}

export interface ParsedPerformer {
  name: string;
  pieces: string;
  composers: string;
  introduction: string;
  photoBase64: string; // data URI, Step 1/2 only — stripped before /build
}
