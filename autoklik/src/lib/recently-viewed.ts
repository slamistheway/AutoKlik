const STORAGE_KEY = 'autoklik.recently-viewed';

export function getRecentlyViewedIds(): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? [...new Set(stored.filter((id): id is number => Number.isSafeInteger(id) && id > 0))] : [];
  } catch { return []; }
}

export function recordAdView(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([id, ...getRecentlyViewedIds().filter(previous => previous !== id)]));
  } catch {}
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
}
