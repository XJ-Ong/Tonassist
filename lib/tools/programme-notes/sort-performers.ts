import { RawPerformer } from './parse-excel';

export function sortPerformers<T extends RawPerformer>(performers: T[]): T[] {
  return [...performers].sort((a, b) => {
    const aEmpty = a.orderPreference === 0;
    const bEmpty = b.orderPreference === 0;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    if (!aEmpty && !bEmpty) {
      const orderDiff = a.orderPreference - b.orderPreference;
      if (orderDiff !== 0) return orderDiff;
    }
    const durDiff = a.duration - b.duration;
    if (durDiff !== 0) return durDiff;
    return a.name.localeCompare(b.name);
  });
}
