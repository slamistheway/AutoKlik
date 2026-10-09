'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import type { AdFullData } from '@/types/types';
import { toAdFullData } from '@/shared/ad-data';
import { resolve_api_ad_img } from '@/shared/functions';
import { sessionCookie } from '@/components/cookies/cookies';
import { API_BASE_URL, getResponseMessage } from '@/pages/myProfile/account-api';

const fields = [
  ['title', 'Naslov', 'text'], ['brand', 'Marka', 'text'], ['model', 'Model', 'text'],
  ['year', 'Godina', 'number'], ['price', 'Cijena (€)', 'number'], ['kilometrage', 'Kilometraža', 'number'],
  ['fuel', 'Gorivo', 'text'], ['condition', 'Stanje', 'text'], ['county', 'Županija', 'text'],
  ['sellerType', 'Vrsta prodavača', 'text'], ['buyOrLease', 'Kupnja ili leasing', 'text'],
  ['gearType', 'Mjenjač', 'text'], ['color', 'Boja', 'text'], ['doorNumber', 'Broj vrata', 'number'],
  ['drivingLicence', 'Vozačka dozvola', 'text'], ['weight', 'Težina', 'number'],
  ['payload', 'Nosivost', 'number'], ['volume', 'Zapremina', 'number'],
] as const;
type Field = typeof fields[number][0];

export default function EditAdForm({ ad, onSaved, onCancel }: {
  ad: AdFullData; onSaved: (updated: AdFullData) => void; onCancel: () => void;
}) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([key]) => [key, String(ad[key] ?? '')])) as Record<Field, string>);
  const [description, setDescription] = useState(ad.description);
  const [retainedImages, setRetainedImages] = useState([...ad.images]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const moveImage = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= retainedImages.length) return;
    const next = [...retainedImages];
    [next[index], next[target]] = [next[target], next[index]];
    setRetainedImages(next);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const token = sessionCookie.getSessionToken();
    if (!token) { setError('Niste prijavljeni.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      for (const [key, , type] of fields) {
        if (type === 'number' && !values[key]) {
          if (['doorNumber', 'weight', 'payload', 'volume'].includes(key)) body.append(key, '');
          continue;
        }
        body.append(key, values[key]);
      }
      body.append('description', description);
      body.append('retainedImages', JSON.stringify(retainedImages));
      files.forEach(file => body.append('images', file));
      const response = await fetch(`${API_BASE_URL}/ads/${ad.id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body,
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Promjene oglasa nisu spremljene.'));
      onSaved(toAdFullData(await response.json()));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Promjene oglasa nisu spremljene.');
    } finally { setSaving(false); }
  };

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 text-gray-900 sm:p-6" aria-label="Uređivanje oglasa">
      <h2 className="mb-4 text-xl font-bold">Uredi oglas</h2>
      <form onSubmit={save}>
        <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type]) => (
              <label key={key} className="block text-sm font-medium">
                {label}
                <input type={type} value={values[key]} required={['title', 'brand', 'model', 'year'].includes(key)}
                  min={type === 'number' ? key === 'year' ? 1886 : 0 : undefined}
                  max={key === 'year' ? 2100 : undefined} step={key === 'price' ? '0.01' : type === 'number' ? 1 : undefined}
                  maxLength={key === 'title' ? 200 : type === 'text' ? 100 : undefined}
                  onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
            ))}
          </div>
          <label className="block text-sm font-medium">Opis
            <textarea value={description} maxLength={10000} rows={6} onChange={event => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <div>
            <p className="mb-2 font-medium">Slike (najviše 10, do 5 MB po slici)</p>
            <div className="flex flex-wrap gap-3">
              {retainedImages.map((url, index) => (
                <div key={url} className="rounded-md border p-2">
                  <Image src={resolve_api_ad_img(url)} alt={`Slika ${index + 1}`} width={120} height={90} unoptimized className="h-24 object-cover" />
                  <div className="mt-2 flex gap-2 text-sm">
                    <button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Pomakni sliku lijevo">←</button>
                    <button type="button" disabled={index === retainedImages.length - 1} onClick={() => moveImage(index, 1)} aria-label="Pomakni sliku desno">→</button>
                    <button type="button" onClick={() => setRetainedImages(current => current.filter(image => image !== url))}>Ukloni</button>
                  </div>
                </div>
              ))}
            </div>
            {files.map((file, index) => <div key={`${file.name}-${index}`} className="mt-2 text-sm">{file.name} <button type="button" onClick={() => setFiles(current => current.filter((_, position) => position !== index))}>Ukloni</button></div>)}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-3" onChange={event => {
              const selected = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (selected.some(file => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
                setError('Odaberite JPEG, PNG ili WebP slike do 5 MB.'); return;
              }
              if (retainedImages.length + files.length + selected.length > 10) { setError('Oglas može imati najviše 10 slika.'); return; }
              setFiles(current => [...current, ...selected]); setError('');
            }} />
          </div>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white">{saving ? 'Spremanje...' : 'Spremi promjene'}</button>
            <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2">Odustani</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
