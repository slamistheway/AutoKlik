'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { API_BASE_URL, getResponseMessage } from '@/lib/account-api';
import { sessionCookie } from '@/components/cookies/cookies';

export default function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const invalidLink = reset && !message && router.isReady && (!token || Boolean(router.query.error));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError('');
    setMessage('');
    if (reset && password !== confirmation) { setError('Lozinke se ne podudaraju.'); return; }
    if (reset && !token) { setError('Poveznica za promjenu lozinke nije ispravna.'); return; }
    setPending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${reset ? 'reset-password' : 'forgot-password'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reset ? { token, newPassword: password } : { email: email.trim() }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const retry = Number(response.headers.get('Retry-After') ?? response.headers.get('Retry-After-burst') ?? 60);
          throw new Error(`Previše pokušaja. Pokušajte ponovno za ${Number.isFinite(retry) ? retry : 60} s.`);
        }
        throw new Error(await getResponseMessage(response, 'Zahtjev nije uspio. Pokušajte ponovno.'));
      }
      const result = await response.json() as { message: string };
      setMessage(result.message);
      if (reset) {
        sessionCookie.removeSessionToken(); setPassword(''); setConfirmation('');
        void router.replace('/reset-password', undefined, {shallow: true});
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Zahtjev nije uspio.'); }
    finally { setPending(false); }
  };

  return <>
    <Head><title>{reset ? 'Promjena lozinke' : 'Zaboravljena lozinka'} | AutoKlik</title><meta name="referrer" content="no-referrer" /></Head>
    <header><Navbar /></header>
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4
      sm:px-6
      lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">{reset ? 'Promjena lozinke' : 'Zaboravili ste lozinku?'}</h1>
        {!reset && <p className="text-sm text-gray-600">Unesite email adresu svojeg računa. Poslat ćemo vam poveznicu za promjenu lozinke.</p>}
        {invalidLink ? <div role="alert" className="rounded-md bg-red-50 p-4 text-red-700">Poveznica nije ispravna ili je istekla. <Link href="/forgot-password" className="underline">Zatražite novu poveznicu.</Link></div> : (!reset || !message) && <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={pending || (reset && !router.isReady)} className="space-y-4">
            {reset ? <>
              <label className="block text-sm font-medium text-gray-700">Nova lozinka
                <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Ponovite novu lozinku
                <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <p className="text-sm text-gray-600">Lozinka mora imati najmanje 8 znakova. Nakon promjene potrebno je ponovno se prijaviti.</p>
            </> : <label className="block text-sm font-medium text-gray-700">Email adresa
              <input type="email" autoComplete="email" required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
            </label>}
            <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Slanje...' : reset ? 'Spremi novu lozinku' : 'Pošalji poveznicu'}</button>
          </fieldset>
        </form>}
        {error && <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</p>}
        {reset && error && <Link href="/forgot-password" className="block text-sm text-blue-600 underline">Zatražite novu poveznicu</Link>}
        <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">Povratak na prijavu</Link>
      </div>
    </main>
    <Footer />
  </>;
}
