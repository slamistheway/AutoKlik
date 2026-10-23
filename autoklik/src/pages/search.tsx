'use client';
import { API_BASE_URL } from '@/shared/api-url';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {Navbar} from '@/components/navbar';
import {Footer} from '@/components/footer';
import {SearchFilterFields} from '@/components/search-filter-fields';
import {SavedSearches} from '@/components/saved-searches';
import type {AdCardData} from '@/types/types';
import {AdCard} from '@/components/adCard';
import {resolve_api_ad_img} from '@/shared/functions';
import {toAdCardData} from '@/shared/ad-data';
import {fetchCurrentUser} from '@/app/auth/auth-guards';
import {sessionCookie} from '@/components/cookies/cookies';
import {getAdPath} from '@/shared/ad-seo';
import {removeSearchFilter, searchChips, searchParams, sortOptions} from '@/shared/search-state';


type Results = {items: unknown[]; total: number; page: number; pageSize: number; totalPages: number};

export default function Search() {
    const router = useRouter();
    const [currentUserId, setCurrentUserId] = useState<number | string | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [ads, setAds] = useState<AdCardData[]>([]);
    const [result, setResult] = useState<Omit<Results, 'items'>>({total: 0, page: 1, pageSize: 24, totalPages: 0});
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const query = router.isReady ? router.asPath.split('?')[1]?.split('#')[0] ?? '' : '';
    const applied = searchParams(Object.fromEntries(new URLSearchParams(query)), true);
    const appliedFilters = searchParams(Object.fromEntries(applied)).toString();
    const chips = searchChips(applied);
    const navigate = (params: URLSearchParams) => { void router.push('/search?' + params.toString()); };

    useEffect(() => {
        let active = true;
        if (sessionCookie.getSessionToken()) void fetchCurrentUser().then(user => {
            if (active) setCurrentUserId(user.id);
        }).catch(() => undefined);
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!router.isReady) return;
        const controller = new AbortController();
        const load = async () => {
            const params = searchParams(Object.fromEntries(new URLSearchParams(query)), true);
            setDraft(Object.fromEntries(params));
            setLoading(true); setErrorMessage(''); setAds([]);
            try {
                const token = sessionCookie.getSessionToken();
                const response = await fetch(`${API_BASE_URL}/ads/search?${params}`, {
                    signal: controller.signal, headers: token ? {Authorization: `Bearer ${token}`} : {},
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message ?? 'Oglasi nisu dostupni.');
                if (controller.signal.aborted) return;
                const data = payload as Results;
                setAds(data.items.map(toAdCardData).map(ad => ({...ad, previewImg: resolve_api_ad_img(ad.previewImg)})));
                setResult({total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages});
            } catch (error) {
                if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Oglasi nisu dostupni.');
            } finally { if (!controller.signal.aborted) setLoading(false); }
        };
        void load();
        return () => controller.abort();
    }, [router.isReady, query, currentUserId]);

    const page = (value: number) => {
        const params = new URLSearchParams(applied);
        params.set('page', String(value));
        navigate(params);
    };

    return (
        <>
            <header><Navbar /></header>
            <main>
                <section className="mx-auto mt-5 w-11/12 max-w-6xl rounded-2xl border border-gray-200 bg-gray-100 p-5
                  md:p-8">
                    <h1 className="text-2xl font-bold">Pretraživanje</h1>
                    <p className="mt-1 text-gray-600">Odaberite filtre i primijenite ih za prikaz oglasa.</p>
                    <SavedSearches filters={appliedFilters} signedIn={currentUserId !== null} />
                    <hr className="my-6 border-gray-300" />
                    <form onSubmit={event => {
                        event.preventDefault();
                        const params = searchParams({...draft, sort: applied.get('sort') ?? 'newest'}, true);
                        params.delete('page');
                        navigate(params);
                    }}>
                        <h2 className="mb-5 text-xl font-semibold">Filteri</h2>
                        <SearchFilterFields draft={draft} setDraft={setDraft} />
                        <button type="submit" className="mt-6 rounded-md bg-blue-700 px-5 py-2 font-semibold text-white">Primijeni filtre</button>
                    </form>
                </section>
                <section className="mx-auto my-10 w-11/12 max-w-6xl" aria-busy={loading}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-2xl font-bold">Oglasi{!loading && !errorMessage && ` (${result.total})`}</h2>
                        <label className="flex w-full flex-col gap-2 text-sm
                          sm:w-auto sm:flex-row sm:items-center">Sortiranje <select value={applied.get('sort') ?? 'newest'} onChange={event => {
                            const params = new URLSearchParams(applied); params.set('sort', event.target.value); params.delete('page'); navigate(params);
                        }} className="rounded-md border border-gray-300 bg-white px-3 py-2">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    </div>
                    {chips.length > 0 && <div className="mb-5 flex flex-wrap gap-2" aria-label="Primijenjeni filtri">
                        {chips.map(chip => <button key={chip.key + chip.value} type="button" aria-label={`Ukloni ${chip.label}`} onClick={() => navigate(removeSearchFilter(applied, chip.key, chip.value))} className="max-w-full break-words rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-sm">{chip.label} ×</button>)}
                        <button type="button" onClick={() => navigate(new URLSearchParams())} className="px-3 py-1 text-sm text-blue-700 underline">Ukloni sve filtre</button>
                    </div>}
                    {loading && <p role="status">Učitavanje oglasa...</p>}
                    {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}
                    {!loading && !errorMessage && ads.length === 0 && <p>Nema oglasa za odabrane filtre{result.total > 0 ? '. Odaberite prethodnu stranicu.' : '.'}</p>}
                    <div className="grid grid-cols-1 gap-5
                      sm:grid-cols-2
                      lg:grid-cols-4">
                        {ads.map(ad => <AdCard key={ad.id} currentUserId={currentUserId} ad={ad} href={getAdPath(ad)} />)}
                    </div>
                    {!loading && !errorMessage && result.totalPages > 0 && <nav aria-label="Stranice rezultata" className="mt-6 flex flex-wrap items-center justify-center gap-4">
                        <button type="button" disabled={result.page <= 1} onClick={() => page(result.page - 1)} className="rounded-md border px-3 py-2 disabled:opacity-40">Prethodna</button>
                        <span>Stranica {result.page} od {result.totalPages} · {ads.length ? (result.page - 1) * result.pageSize + 1 : 0}–{Math.min(result.page * result.pageSize, result.total)} od {result.total}</span>
                        <button type="button" disabled={result.page >= result.totalPages} onClick={() => page(result.page + 1)} className="rounded-md border px-3 py-2 disabled:opacity-40">Sljedeća</button>
                    </nav>}
                </section>
            </main>
            <Footer />
        </>
    );
}
