'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, getResponseMessage } from '@/lib/account-api';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function AppealPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return <><Navbar /><main className="mx-auto min-h-[60vh] max-w-lg px-5 py-12 text-gray-900"><h1 className="mb-4 text-2xl font-bold">Žalba na ograničenje računa</h1><p className="mb-5">Za suspendirane i zabranjene račune. Podaci za prijavu potvrđuju da je račun vaš; ovim se ne otvara sesija.</p><form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const values = new FormData(form);
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/appeals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: values.get('identifier'), password: values.get('password'), reason: values.get('reason') }) });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Žalba nije poslana.'));
      const result = await response.json(); setNotice(result.message); form.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Slanje nije uspjelo.'); }
    finally { setBusy(false); }
  }}><label className="block">Korisničko ime ili e-mail<input name="identifier" required maxLength={255} autoComplete="username" className="mt-2 block w-full rounded-lg border p-3" /></label><label className="block">Lozinka<input name="password" required type="password" autoComplete="current-password" className="mt-2 block w-full rounded-lg border p-3" /></label><label className="block">Obrazloženje žalbe<textarea name="reason" required maxLength={1000} className="mt-2 block min-h-32 w-full rounded-lg border p-3" /></label>{error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={busy} className="rounded-lg bg-[#a4473b] px-5 py-3 text-white disabled:opacity-50">{busy ? 'Slanje…' : 'Pošalji žalbu'}</button><Link href="/forgot-password" className="block w-fit underline
    sm:ml-4 sm:inline-block">Zaboravljena lozinka</Link></form></main><Footer /></>;
}
