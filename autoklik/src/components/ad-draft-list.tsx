import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { deleteAdDraft, getAdDrafts, type AdDraft } from '@/lib/ad-drafts';
import * as checkoutState from '@/pages/checkout/lib/checkout-state';

export function AdDraftList() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<AdDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    setError('');
    try {
      await deleteAdDraft(id);
      setDrafts(current => current.filter(draft => draft.id !== id));
    } catch {
      setError('Skicu nije moguće obrisati. Pokušajte ponovno.');
    } finally {
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
          <li key={draft.id} className="flex items-center justify-between gap-3 border-t border-gray-100 py-2">
            <span>{draft.details.title || [draft.details.brand, draft.details.model].filter(Boolean).join(' ') || 'Nedovršeni oglas'}<small className="block text-gray-500">{new Date(draft.savedAt).toLocaleString('hr-HR')}</small></span>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" disabled={loading} onClick={() => void resume(draft.id)} className="rounded-md bg-[#a4473b] px-4 py-2 text-white disabled:opacity-50">Nastavi unos</button>
              <button type="button" disabled={loading} onClick={() => void deleteDraft(draft.id)} className="rounded-md border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50">Obriši</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
