'use client';
import { API_BASE_URL } from '@/shared/api-url';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {sessionCookie} from '@/components/cookies/cookies';
import {searchChips} from '@/shared/search-state';

type SavedSearch = {id: number; name: string; filters: Record<string, string>; alertsEnabled: boolean};


export function SavedSearches({filters, signedIn}: {filters: string; signedIn: boolean}) {
    const router = useRouter();
    const [items, setItems] = useState<SavedSearch[]>([]);
    const [nameDraft, setNameDraft] = useState<{filters: string; value: string} | null>(null);
    const summary = searchChips(new URLSearchParams(filters)).map(chip => chip.label).join(' · ') || 'Svi oglasi';
    const name = nameDraft?.filters === filters ? nameDraft.value : summary.slice(0, 100);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function request<T>(path = '', method = 'GET', body?: object, signal?: AbortSignal): Promise<T> {
        const token = sessionCookie.getSessionToken();
        if (!token) throw new Error('Prijavite se za spremanje pretrage.');
        const response = await fetch(`${API_BASE_URL}/ads/saved-searches${path}`, {
            method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: body ? JSON.stringify(body) : undefined, signal, cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? 'Pretrage nisu dostupne.');
        return payload;
    }

    useEffect(() => {
        if (!signedIn) return;
        const controller = new AbortController();
        void request<SavedSearch[]>('', 'GET', undefined, controller.signal).then(setItems).catch(error => {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Pretrage nisu dostupne.');
        });
        return () => controller.abort();
    }, [signedIn]);

    const change = async (action: () => Promise<unknown>) => {
        if (busy) return;
        setBusy(true); setError(''); setNotice('');
        try {
            await action();
            setItems(await request<SavedSearch[]>());
            window.dispatchEvent(new Event('saved-searches-changed'));
        } catch (error) { setError(error instanceof Error ? error.message : 'Pretraga nije spremljena.'); }
        finally { setBusy(false); }
    };

    return (
        <section id="saved-searches" className="mt-5 rounded-xl border border-gray-200 bg-white p-4
          sm:p-5" aria-labelledby="saved-searches-title">
            <h2 id="saved-searches-title" className="text-lg font-semibold">Spremite ovu pretragu</h2>
            <p className="mt-1 text-sm text-gray-600">Sačuvajte odabrane filtre i primajte obavijesti kada se pojave odgovarajući oglasi.</p>
            <p className="mt-2 break-words text-sm font-medium text-gray-800">{summary}</p>
            {!signedIn ? <button type="button" onClick={() => { void router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`); }} className="mt-3 text-blue-700 underline">Prijavite se i spremite pretragu</button> : <>
                <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => {
                    event.preventDefault();
                    void change(async () => {
                        await request('', 'POST', {name, filters: Object.fromEntries(new URLSearchParams(filters))});
                        setNotice('Pretraga je spremljena. Obavijesti su uključene.');
                    });
                }}>
                    <input aria-label="Naziv spremljene pretrage" required maxLength={100} value={name} onChange={event => setNameDraft({filters, value: event.target.value})} placeholder="Golf, dizel, do 15.000 €" className="min-w-0 w-full rounded-md border border-gray-300 bg-white px-3 py-2
                      sm:w-auto sm:flex-1" />
                    <button disabled={busy || !name.trim()} className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Spremi pretragu</button>
                </form>
                {items.length > 0 && <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">Moje spremljene pretrage ({items.length})</summary>
                <ul className="mt-3 space-y-2">
                    {items.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-3">
                        <div className="min-w-0 basis-full break-words
                          sm:basis-0 sm:flex-1"><button type="button" className="font-semibold text-blue-700 underline" onClick={() => { void router.push('/search?' + new URLSearchParams(item.filters)); }}>{item.name}</button><p className="mt-1 text-xs text-gray-600">{searchChips(new URLSearchParams(item.filters)).map(chip => chip.label).join(' · ') || 'Svi oglasi'}</p></div>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={item.alertsEnabled} onChange={() => { void change(() => request(`/${item.id}`, 'PATCH', {alertsEnabled: !item.alertsEnabled})); }} />Obavijesti</label>
                        <button type="button" disabled={busy} className="text-sm text-red-700 underline" onClick={() => { if (window.confirm(`Izbrisati spremljenu pretragu „${item.name}”?`)) void change(() => request(`/${item.id}`, 'DELETE')); }}>Izbriši</button>
                    </li>)}
                </ul>
                </details>}
            </>}
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="mt-2 text-sm text-green-700">{notice}</p>}
        </section>
    );
}
