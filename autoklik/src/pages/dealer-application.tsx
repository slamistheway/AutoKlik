'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, getResponseMessage } from './myProfile/account-api';
import { sessionCookie } from '@/components/cookies/cookies';
import { authGuard } from '@/app/auth/auth-guards';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

function DealerApplication() {
  const [profile, setProfile] = useState({ businessName: '', registrationNumber: '', address: '', website: '' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() { try {
      const response = await fetch(`${API_BASE_URL}/dealer/profile`, { headers: { Authorization: `Bearer ${sessionCookie.getSessionToken()}` }, signal: controller.signal });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Profil nije dostupan.'));
      const result = await response.json(); setStatus(result.dealerStatus); if (result.dealerProfile) setProfile(result.dealerProfile);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Dohvat nije uspio.'); } }
    void load(); return () => controller.abort();
  }, []);
  return <><Navbar /><main className="mx-auto min-h-[60vh] max-w-lg px-5 py-12 text-gray-900"><h1 className="mb-4 text-2xl font-bold">Profil trgovca</h1><p className="mb-4">Status: {status || 'učitavanje'}. Novi podaci i izmjene šalju se osoblju na odobrenje. Odobreni poslovni podaci prikazuju se na javnom profilu.</p><form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/dealer/profile`, { method: 'POST', headers: { Authorization: `Bearer ${sessionCookie.getSessionToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Zahtjev nije spremljen.'));
      const result = await response.json(); setStatus(result.status); setNotice(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Spremanje nije uspjelo.'); }
    finally { setBusy(false); }
  }}>{(['businessName', 'registrationNumber', 'address', 'website'] as const).map((key, index) => <label className="block" key={key}>{['Naziv tvrtke', 'Registracijski broj', 'Adresa', 'Web stranica (neobavezno)'][index]}<input className="mt-2 block w-full rounded-lg border p-3" value={profile[key]} required={key !== 'website'} type={key === 'website' ? 'url' : 'text'} maxLength={key === 'website' ? 500 : 200} onChange={event => setProfile(current => ({ ...current, [key]: event.target.value }))} /></label>)}{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={busy || !status} className="rounded-lg bg-[#a4473b] px-5 py-3 text-white disabled:opacity-50">Pošalji na odobrenje</button><Link href="/myProfile" className="block w-fit underline
    sm:ml-4 sm:inline-block">Moj profil</Link></form></main><Footer /></>;
}

export default authGuard(DealerApplication);
