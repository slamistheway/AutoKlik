import * as checkoutState from '@/pages/checkout/lib/checkout-state';
import { fetchCurrentUser } from '@/app/auth/auth-guards';

export interface AdDraft {
  id: string;
  userId: number;
  savedAt: string;
  category: checkoutState.CheckoutCategoryState;
  details: checkoutState.CheckoutDetailsState;
  step: number;
}

async function draftStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('autoklik-ad-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction('drafts', mode);
    const request = action(transaction.objectStore('drafts'));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export async function saveAdDraft() {
  const user = await fetchCurrentUser();
  if (!user.id) throw new Error('Prijavite se kako biste spremili skicu.');
  const draftId = checkoutState.getDraftId();
  const existing = draftId ? await draftStore<AdDraft | undefined>('readonly', store => store.get(draftId)) : undefined;
  const draft: AdDraft = {
    id: existing?.userId === Number(user.id) ? existing.id : crypto.randomUUID(),
    userId: Number(user.id), savedAt: new Date().toISOString(),
    category: checkoutState.getCategoryState(), details: checkoutState.getDetailsState(),
    step: checkoutState.getCurrentStep(),
  };
  await draftStore('readwrite', store => store.put(draft));
  checkoutState.setDraftId(draft.id);
}

export async function getAdDrafts() {
  const user = await fetchCurrentUser();
  const drafts = await draftStore<AdDraft[]>('readonly', store => store.getAll());
  return drafts.filter(draft => draft.userId === Number(user.id)).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function deleteAdDraft(id: string) {
  const user = await fetchCurrentUser();
  const draft = await draftStore<AdDraft | undefined>('readonly', store => store.get(id));
  if (!user.id || !draft || draft.userId !== Number(user.id)) throw new Error('Draft unavailable');
  await draftStore('readwrite', store => store.delete(id));
}
