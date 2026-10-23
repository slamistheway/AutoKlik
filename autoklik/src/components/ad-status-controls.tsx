import { useEffect, useState } from 'react';
import type { AdCardData } from '@/types/types';
import { API_BASE_URL, getResponseMessage } from '@/lib/account-api';
import { sessionCookie } from '@/components/cookies/cookies';
import { toAdCardData } from '@/shared/ad-data';
import { getAdStatus } from '@/shared/ad-status';

export function AdStatusControls({ ad, onChange }: { ad: AdCardData; onChange: (ad: AdCardData) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const status = getAdStatus(ad);
  const expired = Boolean(ad.expiresAt && Date.parse(ad.expiresAt) <= now);

  useEffect(() => {
    if (!ad.expiresAt) return;
    const remaining = Date.parse(ad.expiresAt) - Date.now();
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [ad.expiresAt]);

  const changeStatus = async (next: 'sold' | 'hidden' | 'active') => {
    setBusy(true);
    setError('');
    try {
      const token = sessionCookie.getSessionToken();
      if (!token) throw new Error('Prijavite se ponovno.');
      const response = await fetch(`${API_BASE_URL}/ads/${ad.id}/status`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Promjena statusa nije uspjela.'));
      onChange(toAdCardData(await response.json()));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Promjena statusa nije uspjela.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== 'sold' && <button type="button" disabled={busy} onClick={() => void changeStatus('sold')} className="rounded-md bg-green-700 px-3 py-2 text-sm text-white disabled:opacity-50">Označi kao prodano</button>}
        {status === 'active' && <button type="button" disabled={busy} onClick={() => void changeStatus('hidden')} className="rounded-md border border-gray-400 px-3 py-2 text-sm disabled:opacity-50">Privremeno sakrij</button>}
        {(status === 'hidden' || status === 'sold') && !expired && <button type="button" disabled={busy} onClick={() => void changeStatus('active')} className="rounded-md border border-gray-400 px-3 py-2 text-sm disabled:opacity-50">Ponovno prikaži</button>}
      </div>
      <p className="text-xs opacity-70">Oglas automatski istječe 3 dana nakon objave. Promjena statusa ne produljuje rok.</p>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
