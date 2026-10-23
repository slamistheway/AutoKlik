import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { deleteAdDraft, getAdDrafts, type AdDraft } from '@/lib/ad-drafts';
import * as checkoutState from '@/lib/checkout-state';

export function AdDraftList() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<AdDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdDraft | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleting = useRef(false);

  useEffect(() => {
    if (pendingDelete) deleteDialog.current?.showModal();
  }, [pendingDelete]);

  useEffect(() => {
    let active = true;
    getAdDrafts().then(items => { if (active) setDrafts(items); }).catch(() => {
      if (active) setError('Skice nije moguće učitati.');
    });
    return () => { active = false; };
  }, []);

  const resume = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const draft = (await getAdDrafts()).find(item => item.id === id);
      if (!draft) throw new Error('Draft unavailable');
      checkoutState.setCategoryState(draft.category);
      checkoutState.setDetailsState(draft.details);
      checkoutState.setCurrentStep(draft.step);
      checkoutState.setDraftId(draft.id);
      await router.push(draft.step === 3 ? '/checkout/payment-options' : '/checkout/details');
    } catch {
      setError('Skicu nije moguće otvoriti. Pokušajte ponovno.');
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (id: string) => {
    if (deleting.current) return;
    deleting.current = true;
    setLoading(true);
    setError('');
    try {
      await deleteAdDraft(id);
      setDrafts(current => current.filter(draft => draft.id !== id));
      setPendingDelete(null);
    } catch {
      setError('Skicu nije moguće obrisati. Pokušajte ponovno.');
    } finally {
      deleting.current = false;
      setLoading(false);
    }
  };

  if (!drafts.length && !error) return null;
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4" aria-label="Spremljene skice">
      <h3 className="font-semibold text-gray-900">Spremljene skice</h3>
      <p className="mt-1 text-sm text-gray-500">Skice su spremljene u ovom pregledniku.</p>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      <ul className="mt-3 space-y-2">
        {drafts.map(draft => (
          <li key={draft.id} className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 py-2
            sm:flex-row sm:items-center">
            <span className="min-w-0 break-words">{draft.details.title || [draft.details.brand, draft.details.model].filter(Boolean).join(' ') || 'Nedovršeni oglas'}<small className="block text-gray-500">{new Date(draft.savedAt).toLocaleString('hr-HR')}</small></span>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" disabled={loading} onClick={() => void resume(draft.id)} className="rounded-md bg-[#a4473b] px-4 py-2 text-white disabled:opacity-50">Nastavi unos</button>
              <button type="button" disabled={loading} onClick={() => { setError(''); setPendingDelete(draft); }} className="rounded-md border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50">Obriši</button>
            </div>
          </li>
        ))}
      </ul>
      {pendingDelete && <dialog ref={deleteDialog} aria-labelledby="delete-draft-title" onCancel={event => { event.preventDefault(); if (!deleting.current) setPendingDelete(null); }} className="m-auto max-h-[90dvh] overflow-y-auto break-words w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50">
        <h2 id="delete-draft-title" className="text-xl font-bold text-gray-900">Obrisati skicu?</h2>
        <p className="mt-3 text-gray-600">Skica „{pendingDelete.details.title || 'Nedovršeni oglas'}” bit će trajno obrisana zajedno sa spremljenim fotografijama. Ovu radnju nije moguće poništiti.</p>
        {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" autoFocus disabled={loading} onClick={() => setPendingDelete(null)} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Odustani</button>
          <button type="button" disabled={loading} onClick={() => void deleteDraft(pendingDelete.id)} className="rounded-md bg-red-700 px-4 py-2 text-white disabled:opacity-50">{loading ? 'Brisanje…' : 'Obriši skicu'}</button>
        </div>
      </dialog>}
    </section>
  );
}
