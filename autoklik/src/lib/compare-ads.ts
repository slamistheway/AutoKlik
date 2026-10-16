'use client';

import { useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'autoklik.compare-ads';
const CHANGE_EVENT = 'autoklik:compare-ads';

export function parseComparisonIds(raw: string): number[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))].slice(0, 3) : [];
  } catch { return []; }
}

function getSnapshot() {
  try { return window.localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key === STORAGE_KEY) callback(); };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

export function useComparisonIds() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => '');
  return useMemo(() => parseComparisonIds(snapshot), [snapshot]);
}

export function toggleComparisonAd(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Neispravan oglas.');
  const ids = parseComparisonIds(getSnapshot());
  if (!ids.includes(id) && ids.length >= 3) throw new Error('Možete usporediti najviše 3 oglasa. Najprije uklonite jedan oglas.');
  const next = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { throw new Error('Odabir nije moguće spremiti u ovom pregledniku.'); }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearComparisonAds() {
  try { window.localStorage.removeItem(STORAGE_KEY); }
  catch { throw new Error('Odabir nije moguće obrisati.'); }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
