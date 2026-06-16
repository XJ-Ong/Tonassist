import { RawPerformer } from './parse-excel';

export function sortPerformers<T extends RawPerformer>(performers: T[]): T[] {
  return [...performers].sort((a, b) => {
    const orderDiff = a.orderPreference - b.orderPreference;
    if (orderDiff !== 0) return orderDiff;
    return a.duration - b.duration;
  });
}
