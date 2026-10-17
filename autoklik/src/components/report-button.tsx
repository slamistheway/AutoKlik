'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { sessionCookie } from '@/components/cookies/cookies';
import { API_BASE_URL, getResponseMessage } from '@/pages/myProfile/account-api';

export function ReportButton({ targetType, targetId }: { targetType: 'ad' | 'user' | 'message'; targetId: number }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit() {
    const token = sessionCookie.getSessionToken();
    if (!token || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId, reason }) });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Prijava nije spremljena.'));
      setReason(''); setNotice('Prijava je poslana osoblju.'); dialog.current?.close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Slanje nije uspjelo.'); }
    finally { setBusy(false); }
  }
  return <span className="inline-block text-xs"><button type="button" className="rounded px-2 py-1 underline opacity-80 hover:opacity-100" onClick={() => {
    if (!sessionCookie.getSessionToken()) { void router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`); return; }
    setError(''); setNotice(''); dialog.current?.showModal();
  }}>Prijavi {targetType === 'ad' ? 'oglas' : targetType === 'user' ? 'korisnika' : 'poruku'}</button>{notice && <span role="status">{notice}</span>}<dialog ref={dialog} aria-label="Prijava sadržaja" className="m-auto w-[min(460px,calc(100%_-_32px))] rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/50" onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={event => { event.preventDefault(); void submit(); }}><h2 className="mb-4 text-lg font-bold">Prijava sadržaja</h2><label className="block text-sm">Razlog prijave<textarea required maxLength={1000} className="mt-2 block min-h-28 w-full rounded-lg border border-gray-300 p-3" value={reason} onChange={event => setReason(event.target.value)} /></label>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}<div className="mt-4 flex justify-end gap-3"><button type="button" disabled={busy} className="rounded-lg border px-4 py-2" onClick={() => dialog.current?.close()}>Odustani</button><button disabled={busy || !reason.trim()} className="rounded-lg bg-[#a4473b] px-4 py-2 text-white disabled:opacity-50">{busy ? 'Slanje…' : 'Pošalji prijavu'}</button></div></form></dialog></span>;
}
