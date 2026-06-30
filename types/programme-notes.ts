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
  base64: string;
}
