'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {BookmarkIcon, XIcon} from 'lucide-react';
import {API_BASE_URL} from '@/shared/api-url';
import {sessionCookie} from '@/components/cookies/cookies';
import {searchChips, searchParams} from '@/shared/search-state';

type SavedSearch = {id: number; name: string; filters: Record<string, string>};

export function SavedSearchSuggestions({returnUrl, onSelect, onClose}: {
    returnUrl: string;
    onSelect: (params: URLSearchParams) => void;
    onClose: () => void;
}) {
    const root = useRef<HTMLDivElement>(null);
    const [signedIn, setSignedIn] = useState(() => Boolean(sessionCookie.getSessionToken()));
    const [items, setItems] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(signedIn);
    const [error, setError] = useState('');

    useEffect(() => {
        const outside = (event: PointerEvent) => {
            if (!root.current?.parentElement?.contains(event.target as Node)) onClose();
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [onClose]);

    useEffect(() => {
        const token = sessionCookie.getSessionToken();
        if (!token) return;
        const controller = new AbortController();
        void fetch(`${API_BASE_URL}/ads/saved-searches`, {
            headers: {Authorization: `Bearer ${token}`}, cache: 'no-store', signal: controller.signal,
        }).then(async response => {
            if ([401, 403].includes(response.status)) { if (!controller.signal.aborted) setSignedIn(false); return; }
            if (!response.ok) throw new Error('Spremljene pretrage trenutačno nisu dostupne.');
            const searches = await response.json() as SavedSearch[];
            if (!controller.signal.aborted) setItems(searches);
        }).catch(error => {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Pretrage nisu dostupne.');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);

    return (
        <div ref={root} aria-label="Spremljene pretrage" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-900 shadow-xl">
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-semibold"><BookmarkIcon className="h-4 w-4" aria-hidden="true" />Spremljene pretrage</h2>
                <button type="button" onClick={onClose} aria-label="Zatvori spremljene pretrage" className="rounded p-1 hover:bg-slate-100"><XIcon className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            {!signedIn ? <p className="mt-3 text-slate-600">Spremite filtre i primajte obavijesti o novim oglasima. <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} className="font-medium text-[#a4473b] underline">Prijavite se</Link></p> : <>
                {loading && <p role="status" className="mt-3 text-slate-500">Učitavanje pretraga...</p>}
                {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
                {!loading && !error && !items.length && <p className="mt-3 text-slate-500">Još nemate spremljenih pretraga. Pretražite oglase pa odaberite „Spremi pretragu”.</p>}
                <ul className="mt-2 space-y-1">
                    {items.slice(0, 5).map(item => <li key={item.id}><button type="button" onClick={() => { onClose(); onSelect(searchParams(item.filters)); }} className="w-full min-w-0 rounded-lg px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#a4473b]">
                        <span className="block break-words font-medium">{item.name}</span>
                        <span className="mt-1 block break-words text-xs text-slate-500">{searchChips(new URLSearchParams(item.filters)).map(chip => chip.label).join(' · ') || 'Svi oglasi'}</span>
                    </button></li>)}
                </ul>
                {items.length > 0 && <Link href="/search#saved-searches" onClick={onClose} className="mt-2 inline-block px-3 py-2 font-medium text-[#a4473b] underline">Sve spremljene pretrage ({items.length})</Link>}
            </>}
        </div>
    );
}
