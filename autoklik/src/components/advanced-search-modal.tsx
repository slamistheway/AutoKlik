'use client';

import {useEffect, useRef, useState} from 'react';
import {XIcon} from 'lucide-react';
import {SearchFilterFields} from '@/components/search-filter-fields';
import {filterLabels, searchParams, searchRanges, sortOptions} from '@/shared/search-state';

export function AdvancedSearchModal({initialFilters, onClose, onSearch}: {
    initialFilters: Record<string, string>;
    onClose: () => void;
    onSearch: (params: URLSearchParams) => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [draft, setDraft] = useState(initialFilters);
    const [error, setError] = useState('');

    useEffect(() => {
        const element = dialog.current;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        element?.showModal();
        return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus({preventScroll: true}); };
    }, []);

    return (
        <dialog ref={dialog} aria-labelledby="advanced-search-title" onCancel={event => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto h-[90dvh] max-h-[52rem] w-[calc(100%-1rem)] max-w-6xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/60 open:flex open:flex-col
          sm:w-[90vw]">
            <header className="shrink-0 border-b border-gray-200 px-4 py-4
              sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div><h2 id="advanced-search-title" className="text-xl font-bold
                      sm:text-2xl">Napredno pretraživanje</h2><p className="mt-1 text-sm text-gray-600">Svi filtri za pronalazak vozila.</p></div>
                    <button type="button" onClick={onClose} aria-label="Zatvori napredno pretraživanje" className="rounded-md p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2"><XIcon aria-hidden="true" className="h-6 w-6" /></button>
                </div>
            </header>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => {
                event.preventDefault();
                for (const field of searchRanges) {
                    const min = draft[field + 'Min']?.trim();
                    const max = draft[field + 'Max']?.trim();
                    const invalid = [min, max].some(value => value && (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value)) || field !== 'price' && !Number.isInteger(Number(value))));
                    if (invalid || min && max && Number(min) > Number(max)) { setError(`${filterLabels[field]}: unesite ispravan raspon od–do.`); return; }
                }
                setError('');
                const params = searchParams(draft, true);
                params.delete('page');
                onSearch(params);
            }}>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6
                  sm:px-8">
                    <div className="mx-auto max-w-6xl pb-48">
                        <SearchFilterFields draft={draft} setDraft={setDraft} />
                        <label className="mt-6 block text-sm font-medium">Sortiranje<select value={draft.sort ?? 'newest'} onChange={event => setDraft(current => ({...current, sort: event.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2
                          sm:max-w-xs">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    </div>
                </div>
                <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3
                  sm:px-8">
                    <div className="mx-auto max-w-6xl">
                        {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button type="button" onClick={() => { setDraft({}); setError(''); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Očisti filtre</button>
                            <button type="submit" className="rounded-md bg-[var(--color-navbar)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-navbar-hover)]">Pretraži oglase</button>
                        </div>
                    </div>
                </footer>
            </form>
        </dialog>
    );
}
