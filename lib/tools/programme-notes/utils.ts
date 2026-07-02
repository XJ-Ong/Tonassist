export const sanitiseKey = (name: string) => name.replace(/:/g, '-');

export interface PhotoRecord {
  name: string;
  base64: string;
  created_at: string | null;
  last_updated: string | null;
}
