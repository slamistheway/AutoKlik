'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { guestOnlyAuthGuard } from '@/app/auth/auth-guards';

const usernameRegex = /^(?!.*@)[A-Za-z0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ApiResponse = { message?: string };

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
}

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (retryAfter === 0) return;
    const interval = window.setInterval(() => setRetryAfter(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [retryAfter]);

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || retryAfter > 0) return;

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmedUsername) {
      setErrorMessage('Unesite korisničko ime.');
      return;
    }
    if (!usernameRegex.test(trimmedUsername)) {
      setErrorMessage('Korisničko ime može sadržavati samo slova i brojeve i ne smije sadržavati @.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Unesite ispravnu email adresu.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`http://localhost:3001/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          password
        }),
      });
      const payload: ApiResponse = await response.json().catch(() => ({}));

      console.log('Register response payload:', payload);

      if (!response.ok) {
        if (response.status === 429) {
          const seconds = Number(response.headers.get('Retry-After') ?? response.headers.get('Retry-After-burst'));
          setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 900);
        }
        throw new Error(getErrorMessage(payload, 'Registracija nije uspjela.'));
      }

      setSuccessMessage(payload.message ?? 'Registracija uspješna.');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registracija nije uspjela.');
      setSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'block w-full rounded-md border border-[var(--border-color)] px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 sm:text-sm';

  return (
    <>
      <header><Navbar /></header>
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Registriraj se na AutoKlik</h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Već imaš račun?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">Prijavi se ovdje</Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={register}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="username" className="mb-1 block text-sm font-medium">Korisničko ime</label>
                <input id="username" name="username" type="text" maxLength={50} pattern="[A-Za-z0-9]+" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required className={inputClass} placeholder="Unesi korisničko ime" />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">Email adresa</label>
                <input id="email" name="email" type="email" maxLength={255} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required className={inputClass} placeholder="Unesi email adresu" />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">Lozinka</label>
                <input id="password" name="password" type="password" minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required className={inputClass} placeholder="Unesi lozinku" />
              </div>
            </div>

            {errorMessage && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
            {successMessage && <p role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</p>}

            <button type="submit" disabled={isSubmitting || retryAfter > 0}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
              {retryAfter > 0 ? `Pokušaj ponovno za ${retryAfter} s` : isSubmitting ? 'Registracija u tijeku...' : 'Registriraj se'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default guestOnlyAuthGuard(RegisterPage);
