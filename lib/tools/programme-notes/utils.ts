export const sanitiseKey = (name: string) => name.replace(/:/g, '-');

export interface PhotoRecord {
  name: string;
  base64: string;
}
