'use client';

import { useRef, useState, type FormEvent } from 'react';
import FilterBrands from '@/components/filters/filter-brands';
import FilterModels from '@/components/filters/filter-models';
import FilterNumeric from '@/components/filters/filter-numeric';
import { VehicleExtraFields } from '@/components/vehicle-extra-fields';
import FilterChoose from '@/components/filters/filter-choose';
import FilterCounty from '@/components/filters/filter-county';
import type { AdFullData } from '@/types/types';
import { toAdFullData } from '@/shared/ad-data';
import { resolve_api_ad_img } from '@/shared/functions';
import { sessionCookie } from '@/components/cookies/cookies';
import { API_BASE_URL, getResponseMessage } from '@/pages/myProfile/account-api';

const fields = [
  ['engineSize', 'Obujam motora (cc)', 'number'],
  ['vin', 'VIN', 'text'],
  ['title', 'Naslov', 'text'], ['brand', 'Marka', 'text'], ['model', 'Model', 'text'],
  ['year', 'Godina', 'number'], ['price', 'Cijena (€)', 'number'], ['kilometrage', 'Kilometraža', 'number'], ['enginePower', 'Snaga motora', 'number'],
  ['fuel', 'Gorivo', 'text'], ['condition', 'Stanje', 'text'], ['county', 'Županija', 'text'],
  ['sellerType', 'Vrsta prodavača', 'text'], ['buyOrLease', 'Kupnja ili leasing', 'text'],
  ['driveType', 'Vrsta pogona', 'text'], ['gearCount', 'Broj brzina', 'number'],
  ['fuelConsumption', 'Potrošnja goriva (L/100 km)', 'number'], ['warranty', 'Jamstvo', 'text'],
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<{ url: string; file?: File }[]>(() => ad.images.map(url => ({ url })));
  const updateField = (key: Field, value: string) => setValues(current => ({ ...current, [key]: value }));
  const [saving, setSaving] = useState(false);
  const [readingImages, setReadingImages] = useState(false);
  const [error, setError] = useState('');

  const moveImage = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || readingImages) return;
    const token = sessionCookie.getSessionToken();
    if (!token) { setError('Niste prijavljeni.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      for (const [key, , type] of fields) {
        if (type === 'number' && !values[key]) {
          if (['engineSize', 'doorNumber', 'weight', 'payload', 'volume', 'gearCount', 'fuelConsumption'].includes(key)) body.append(key, '');
          continue;
        }
        body.append(key, values[key]);
      }
      body.append('description', description);
      const files = images.filter(image => image.file).map(image => image.file!);
      body.append('retainedImages', JSON.stringify(images.filter(image => !image.file).map(image => image.url)));
      body.append('imageOrder', JSON.stringify(images.map(image => image.file ? `new:${files.indexOf(image.file)}` : image.url)));
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
      {ad.moderationStatus && ad.moderationStatus !== 'approved' && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Oglas je ograničen moderacijom. {ad.moderationReason} Izmjene možete spremiti; za ponovnu objavu potrebno je odobrenje osoblja.</p>}
      <form onSubmit={save}>
        <fieldset disabled={saving || readingImages} className="space-y-4 disabled:opacity-60">
          <div>
            <h1 className="block text-sm font-medium text-gray-700">Opći podaci</h1>
            <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm text-gray-700">VIN (neobavezno)<input className="mt-2 block w-full rounded-lg border border-gray-200 p-3" value={values.vin} maxLength={17} pattern="[A-HJ-NPR-Za-hj-npr-z0-9]{17}" onChange={event => updateField('vin', event.target.value.toUpperCase())} /></label>
              <FilterBrands title="Marka" selectedVehicle_type={ad.category || 'cars'} mode="single" value={values.brand ? [values.brand] : []} onChange={value => updateField('brand', value[0] ?? '')} />
              <FilterModels title="Model" selectedVehicle_type={ad.category || 'cars'} selectedBrands={values.brand ? [values.brand] : []} mode="single" value={values.model ? [values.model] : []} onChange={value => updateField('model', value[0] ?? '')} />
              <FilterNumeric filterType="enginePower" mode="single" value={values.enginePower} onChange={value => updateField('enginePower', value)} />
              <FilterNumeric filterType="engineSize" mode="single" value={values.engineSize} onChange={value => updateField('engineSize', value)} />
              <FilterNumeric filterType="price" mode="single" value={values.price} onChange={value => updateField('price', value)} />
              <FilterNumeric filterType="year" mode="single" value={values.year} onChange={value => updateField('year', value)} />
              <FilterNumeric filterType="kilometrage" mode="single" value={values.kilometrage} onChange={value => updateField('kilometrage', value)} />
              <FilterChoose filterType="condition" value={values.condition} onChange={value => updateField('condition', value)} />
              <FilterCounty mode="single" value={values.county ? [values.county] : []} onChange={value => updateField('county', value[0] ?? '')} />
              <VehicleExtraFields values={values} onChange={updateField} />
              <FilterChoose filterType="gear" value={values.gearType} onChange={value => updateField('gearType', value)} />
              <FilterChoose filterType="sellerType" value={values.sellerType} onChange={value => updateField('sellerType', value)} />
              <FilterChoose filterType="fuel" value={values.fuel} onChange={value => updateField('fuel', value)} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition w-fit">Odaberite slike</button>
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async event => {
              const selected = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (selected.some(file => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
                setError('Odaberite JPEG, PNG ili WebP slike do 5 MB.'); return;
              }
              if (images.length + selected.length > 10) { setError('Oglas može imati najviše 10 slika.'); return; }
              setReadingImages(true);
              try {
                const previews = await Promise.all(selected.map(file => new Promise<{ url: string; file: File }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({ url: String(reader.result), file });
                  reader.onerror = () => reject(new Error('Slika se nije mogla učitati.'));
                  reader.readAsDataURL(file);
                })));
                setImages(current => [...current, ...previews]); setError('');
              } catch (error) { setError(error instanceof Error ? error.message : 'Slike se nisu mogle učitati.'); }
              finally { setReadingImages(false); }
            }} />
            <div className="rounded-lg border-2 border-dashed p-4 min-h-[220px] bg-gray-50 border-gray-300">
              {images.length > 0 ? <>
                <h1 className="mb-3 font-medium">Fotografije pridružene uz oglas</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => <div key={`${image.url}-${index}`} className="border rounded-lg overflow-hidden p-2 bg-white shadow-sm">
                    <div className="w-full aspect-[4/3] border rounded-lg overflow-hidden bg-black flex items-center justify-center">
                      <img src={image.file ? image.url : resolve_api_ad_img(image.url)} alt={`Fotografija ${index + 1}`} className="w-full h-full object-contain" />
                    </div>
                    <div className="mt-2 flex w-full flex-wrap items-center gap-2 overflow-hidden">
                      <span className={`px-4 py-1 border rounded ${index === 0 ? 'bg-amber-300' : ''}`}>{index + 1}</span>
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Pomakni sliku lijevo" className="px-4 py-1 border rounded disabled:opacity-50">←</button>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="Pomakni sliku desno" className="px-4 py-1 border rounded disabled:opacity-50">→</button>
                      <button type="button" onClick={() => setImages(current => current.filter((_, position) => position !== index))} className="px-4 py-1 border rounded text-red-600 max-w-full">Delete</button>
                    </div>
                  </div>)}
                </div>
              </> : <div className="flex min-h-[170px] items-center justify-center text-gray-500">Priložite fotografije.</div>}
            </div>
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Naslov</label>
            <input id="title" name="title" type="text" required minLength={5} maxLength={200} value={values.title} onChange={event => updateField('title', event.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:border-red-600 focus:outline-none border-gray-300" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" name="description" required minLength={10} maxLength={10000} rows={5} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:border-red-600 focus:outline-none border-gray-300" />
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
