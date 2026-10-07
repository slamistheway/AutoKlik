'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { guestOnlyAuthGuard } from '@/app/auth/auth-guards';
import {sessionCookie} from '@/components/cookies/cookies';

type ApiResponse = { message?: string; token?: string };

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
}

function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (retryAfter === 0) return;
    const interval = window.setInterval(() => setRetryAfter(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [retryAfter]);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || retryAfter > 0) return;

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setErrorMessage('Forma nije validna.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`http://localhost:3001/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedIdentifier, password }),
      });
      const payload: ApiResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429) {
          const seconds = Number(response.headers.get('Retry-After') ?? response.headers.get('Retry-After-burst'));
          setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60);
        }
        throw new Error(getErrorMessage(payload, 'Prijava nije uspjela.'));
      }

      if (payload.token) {
        sessionCookie.setSessionToken(payload.token);
        const returnUrl = router.query.returnUrl;
        const destination = typeof returnUrl === 'string' && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : '/';
        await router.replace(destination);

        setErrorMessage('');
        setSuccessMessage(payload.message ?? 'Prijava uspješna.');
        setIdentifier('');
        setPassword('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Prijava nije uspjela.');
      setSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header><Navbar /></header>
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Prijavi se na AutoKlik</h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Nemaš račun?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">Registriraj se ovdje</Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={login}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-1 block text-sm font-medium">Email ili korisničko ime</label>
                <input id="identifier" name="identifier" type="text" maxLength={255} value={identifier}
                  onChange={event => setIdentifier(event.target.value)} autoComplete="username" required
                  className="relative block w-full rounded-md border border-[var(--border-color)] px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-[var(--border-color)] focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Unesi email ili korisničko ime" />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">Lozinka</label>
                <input id="password" name="password" type="password" maxLength={72} value={password}
                  onChange={event => setPassword(event.target.value)} autoComplete="current-password" required
                  className="relative block w-full rounded-md border border-[var(--border-color)] px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-[var(--border-color)] focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Unesi lozinku" />
              </div>
            </div>

            {errorMessage && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
            {successMessage && <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</p>}

            <button type="submit" disabled={isSubmitting || retryAfter > 0}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
              {retryAfter > 0 ? `Pokušaj ponovno za ${retryAfter} s` : isSubmitting ? 'Prijava u tijeku...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default guestOnlyAuthGuard(LoginPage);
