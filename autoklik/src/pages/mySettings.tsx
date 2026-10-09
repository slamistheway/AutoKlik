'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { clearSessionToken, fetchCurrentUser } from '@/app/auth/auth-guards';
import type { CurrentUser } from '@/types/types';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { API_BASE_URL, getResponseMessage } from './myProfile/account-api';
import {sessionCookie} from '@/components/cookies/cookies';
import {resolve_api_pfp_img} from "@/shared/functions";

type ProfileField = 'firstName' | 'lastName' | 'phone' | 'city' | 'country';
type ProfileValues = Record<ProfileField, string>;

const fields: { key: ProfileField; label: string; autocomplete: string }[] = [
  { key: 'firstName', label: 'Ime', autocomplete: 'given-name' },
  { key: 'lastName', label: 'Prezime', autocomplete: 'family-name' },
  { key: 'phone', label: 'Telefon', autocomplete: 'tel' },
  { key: 'city', label: 'Grad', autocomplete: 'address-level2' },
  { key: 'country', label: 'Država', autocomplete: 'country-name' },
];

const emptyProfile: ProfileValues = {
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  country: '',
};

const accountNavigation = [
  { href: '/myProfile', label: 'Moj profil' },
  { href: '/myMessages', label: 'Poruke' },
  { href: '/mySavedAds', label: 'Spremljeni oglasi' },
  { href: '/mySettings', label: 'Postavke' },
];


export default function MySettings() {
  const shellRouter = useRouter();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<ProfileValues>(emptyProfile);
  const [editing, setEditing] = useState<Partial<Record<ProfileField, boolean>>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  const [tab, setTab] = useState<'profile' | 'account'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then(currentUser => {
        if (!active) return;
        setUser(currentUser);
        setProfile({
          firstName: currentUser.firstName ?? '',
          lastName: currentUser.lastName ?? '',
          phone: currentUser.phone ?? '',
          city: currentUser.city ?? '',
          country: currentUser.country ?? '',
        });
      })
      .catch(() => { if (active) setLoadError('Nije moguće učitati korisnički profil.'); });
    return () => { active = false; };
  }, []);




  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveMessage('Odaberite slikovnu datoteku.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage('Slika može imati najviše 5 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSaveMessage('');
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    const token = sessionCookie.getSessionToken();
    if (!token) {
      setSaveMessage('Niste prijavljeni.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Greška pri spremanju promjena.'));
      let updatedUser = await response.json() as CurrentUser;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadResponse = await fetch(`${API_BASE_URL}/users/me/upload-pfp`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadResponse.ok) throw new Error(await getResponseMessage(uploadResponse, 'Greška pri učitavanju profilne slike.'));
        const uploadResult = await uploadResponse.json() as { pfp: string };
        updatedUser = { ...updatedUser, pfp: uploadResult.pfp };
        setSelectedFile(null);
        setPreviewUrl('');
        if (fileInput.current) fileInput.current.value = '';
      }

      setUser(updatedUser);
      setEditing({});
      setSaveMessage('Promjene su uspješno spremljene.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Greška pri spremanju promjena.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (isDeleting || isSaving) return;
    if (!window.confirm('Jeste li sigurni da želite trajno izbrisati račun? Ovu radnju nije moguće poništiti.')) return;

    const token = sessionCookie.getSessionToken();
    if (!token) {
      setDeleteMessage('Niste prijavljeni.');
      return;
    }

    setIsDeleting(true);
    setDeleteMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Greška pri brisanju računa.'));
      clearSessionToken();
      await router.push('/');
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : 'Greška pri brisanju računa.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
      <>
        <header><Navbar /></header>
        <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row">
          <aside className="h-fit w-full shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-md md:w-56"><nav aria-label="Korisnički izbornik" className="flex flex-col gap-2">
            {accountNavigation.map(item => <Link key={item.href} href={item.href} aria-current={shellRouter.pathname === item.href ? 'page' : undefined} className={`rounded px-3 py-2 text-sm font-medium transition ${shellRouter.pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}>{item.label}</Link>)}
          </nav></aside>
          <section className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">Postavke profila</h1>
            {loadError && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
            <div className="mt-5 flex border-b border-gray-200">
              <button type="button" onClick={() => setTab('profile')} className={`flex-1 px-4 py-3 text-sm font-medium ${tab === 'profile' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Moji podaci</button>
              <button type="button" onClick={() => setTab('account')} className={`flex-1 px-4 py-3 text-sm font-medium ${tab === 'account' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Upravljanje računom</button>
            </div>

            {tab === 'profile' ? (
                <form onSubmit={saveProfile} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block font-medium text-gray-700">Profilna slika</label>
                    <button type="button" onClick={() => fileInput.current?.click()} disabled={isSaving} className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-200 disabled:opacity-60">
                      <Image src={previewUrl || resolve_api_pfp_img(user?.pfp)} alt="Pregled profilne slike" width={96} height={96} unoptimized className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 right-0 rounded-full bg-blue-600 px-2 py-1 text-xs text-white">Uredi</span>
                    </button>
                    <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border-b px-1 py-3"><p className="text-sm font-medium text-gray-700">Korisničko ime</p><p className="mt-1 text-gray-900">{user?.username ?? '...'}</p></div>
                    <div className="rounded-md border-b px-1 py-3"><p className="text-sm font-medium text-gray-700">Email</p><p className="mt-1 text-gray-900">{user?.email ?? '...'}</p></div>
                  </div>

                  {fields.map(field => (
                      <div key={field.key} className="border-b py-3">
                        <label htmlFor={field.key} className="mb-2 block font-medium text-gray-700">{field.label}</label>
                        <div className="flex items-center gap-2">
                          <input
                              id={field.key}
                              name={field.key}
                              type="text"
                              maxLength={field.key === 'phone' ? 20 : 100}
                              autoComplete={field.autocomplete}
                              value={profile[field.key]}
                              readOnly={!editing[field.key] || isSaving}
                              onChange={event => setProfile(current => ({ ...current, [field.key]: event.target.value }))}
                              className={`w-full rounded-md border px-3 py-2 ${editing[field.key] ? 'border-blue-400 bg-white' : 'cursor-not-allowed border-gray-300 bg-gray-100'}`}
                          />
                          <button type="button" onClick={() => setEditing(current => ({ ...current, [field.key]: !current[field.key] }))} disabled={isSaving} aria-label={`Uredi ${field.label.toLocaleLowerCase()}`} className="h-10 w-10 shrink-0 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-60">
                            ✎
                          </button>
                        </div>
                      </div>
                  ))}

                  <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? 'Spremanje...' : 'Spremi promjene'}
                  </button>
                  {saveMessage && <p role="status" className={`rounded-md px-4 py-3 text-sm ${saveMessage.includes('uspješno') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{saveMessage}</p>}
                </form>
            ) : (
                <div className="mt-6">
                  <p className="text-sm text-gray-600">Trajno brisanje računa uklonit će vaš profil i povezane oglase.</p>
                  <button type="button" onClick={deleteAccount} disabled={isDeleting || isSaving} className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {isDeleting ? 'Brisanje računa...' : 'Izbriši račun'}
                  </button>
                  {deleteMessage && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{deleteMessage}</p>}
                </div>
            )}
          </section>
        </div></main>
        <Footer />
      </>


  );
}
