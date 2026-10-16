import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAdDraft } from '@/lib/ad-drafts';

export function useCheckoutLeaveModal() {
  const [pending, setPending] = useState<{ leave: () => void } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (pending) dialog.current?.showModal();
  }, [pending]);

  const requestLeave = useCallback((leave: () => void) => {
    setError('');
    setPending(current => current ?? { leave });
  }, []);
  const cancel = () => { if (!busy.current) setPending(null); };
  const finish = async (save: boolean) => {
    if (!pending || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (save) await saveAdDraft();
      pending.leave();
      setPending(null);
    } catch {
      setError('Spremanje ili odlazak nije uspio. Podaci su zadržani. Pokušajte ponovno.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const leaveModal = pending ? (
    <dialog ref={dialog} aria-labelledby="checkout-leave-title" onCancel={event => { event.preventDefault(); cancel(); }} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50">
      <h2 id="checkout-leave-title" className="text-xl font-bold text-gray-900">Napustiti unos oglasa?</h2>
      <p className="mt-3 text-gray-600">Spremite oglas kao skicu ili napustite unos bez spremanja.</p>
      <p className="mt-2 text-sm text-gray-500">Skice i fotografije čuvaju se u ovom pregledniku. Nastavite unos na stranici za kreiranje oglasa.</p>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" autoFocus disabled={saving} onClick={cancel} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Odustani od odlaska</button>
        <button type="button" disabled={saving} onClick={() => void finish(true)} className="rounded-md bg-[#a4473b] px-4 py-2 text-white disabled:opacity-50">{saving ? 'Spremanje…' : 'Spremi skicu i napusti'}</button>
        <button type="button" disabled={saving} onClick={() => void finish(false)} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Napusti bez spremanja</button>
      </div>
    </dialog>
  ) : null;

  return { requestLeave, leaveModal };
}
