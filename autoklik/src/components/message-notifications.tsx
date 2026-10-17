'use client';

import Link from 'next/link';
import {BellIcon, MessageSquareTextIcon, SearchIcon, TrendingDownIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {sessionCookie} from '@/components/cookies/cookies';
import {subscribeMessages} from '@/shared/live-messages';

type UnreadConversation = {id: number; username: string; unreadCount: number};

type PriceDrop = {id: number; adId: number; title: string | null; oldPrice: string; newPrice: string; readAt: string | null};
type SearchAlert = {id: number; adId: number; title: string | null; searchName: string; readAt: string | null};
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const priceLabel = (value: string) => new Intl.NumberFormat('hr-HR', {style: 'currency', currency: 'EUR'}).format(Number(value));

export function MessageNotifications({dark = false}: {dark?: boolean} = {}) {
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [priceDrops, setPriceDrops] = useState<PriceDrop[]>([]);
  const [priceUnread, setPriceUnread] = useState(0);
  const [priceError, setPriceError] = useState(false);
  const [searchAlerts, setSearchAlerts] = useState<SearchAlert[]>([]);
  const [searchUnread, setSearchUnread] = useState(0);
  const [searchError, setSearchError] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const unreadCount = searchUnread + priceUnread + conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState !== 'visible') return;
      const token = sessionCookie.getSessionToken();
      if (!token) { setSearchAlerts([]); setSearchUnread(0); return; }
      pending = true;
      try {
        const response = await fetch(`${API_BASE_URL}/ads/search-alerts`, {headers: {Authorization: `Bearer ${token}`}, signal: controller.signal});
        if (!response.ok) throw new Error('Search alerts unavailable');
        const data: {items: SearchAlert[]; unreadCount: number} = await response.json();
        if (!controller.signal.aborted) { setSearchAlerts(data.items); setSearchUnread(data.unreadCount); setSearchError(false); }
      } catch { if (!controller.signal.aborted) setSearchError(true); }
      finally { pending = false; }
    };
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('saved-searches-changed', refresh);
    window.addEventListener('search-alerts-read', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort(); window.clearInterval(interval);
      window.removeEventListener('saved-searches-changed', refresh);
      window.removeEventListener('search-alerts-read', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const readSearchAlert = async (notification: SearchAlert) => {
    const token = sessionCookie.getSessionToken();
    if (notification.readAt || !token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/ads/search-alerts/${notification.id}/read`, {method: 'PATCH', headers: {Authorization: `Bearer ${token}`}, keepalive: true});
      if (!response.ok) throw new Error('Read failed');
      window.dispatchEvent(new Event('search-alerts-read'));
    } catch { setSearchError(true); }
  };

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState !== 'visible') return;
      const token = sessionCookie.getSessionToken();
      if (!token) {
        setConversations([]);
        return;
      }
      pending = true;
      try {
        const response = await fetch('http://localhost:3001/users/getConversations', {
          headers: {Authorization: `Bearer ${token}`}, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Notifications unavailable');
        const list: UnreadConversation[] = await response.json();
        if (!controller.signal.aborted) {
          setConversations(list.filter(item => item.unreadCount > 0));
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        pending = false;
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    const unsubscribe = subscribeMessages(() => { void refresh(); });
    window.addEventListener('messages-read', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener('messages-read', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState !== 'visible') return;
      const token = sessionCookie.getSessionToken();
      if (!token) { setPriceDrops([]); setPriceUnread(0); return; }
      pending = true;
      try {
        const response = await fetch('http://localhost:3001/ads/price-drop-notifications', {
          headers: {Authorization: `Bearer ${token}`}, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Notifications unavailable');
        const data: {items: PriceDrop[]; unreadCount: number} = await response.json();
        if (!controller.signal.aborted) {
          setPriceDrops(data.items); setPriceUnread(data.unreadCount); setPriceError(false);
        }
      } catch { if (!controller.signal.aborted) setPriceError(true); }
      finally { pending = false; }
    };
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('price-notifications-read', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort(); window.clearInterval(interval);
      window.removeEventListener('price-notifications-read', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const readPriceDrop = async (notification: PriceDrop) => {
    if (notification.readAt) return;
    const token = sessionCookie.getSessionToken();
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:3001/ads/price-drop-notifications/${notification.id}/read`, {
        method: 'PATCH', headers: {Authorization: `Bearer ${token}`}, keepalive: true,
      });
      if (!response.ok) throw new Error('Read failed');
      window.dispatchEvent(new Event('price-notifications-read'));
    } catch { setPriceError(true); }
  };

  return (
      <div className="relative">
        <button type="button" aria-label={`Obavijesti: ${unreadCount} nepročitanih obavijesti`} aria-expanded={open}
                onClick={() => setOpen(current => !current)} className={`relative flex items-center p-2 ${dark ? 'text-slate-600' : 'text-white'}`}>
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {open && (
            <div className="fixed left-4 right-4 z-50 mt-2 max-h-[70dvh] overflow-y-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg
              md:absolute md:left-auto md:right-0 md:w-80 md:max-w-[calc(100vw-2rem)]">
              <p className="border-b border-gray-200 px-3 py-3 text-sm font-semibold">Obavijesti</p>
              {error && <p role="alert" className="px-3 py-3 text-xs text-red-600">Obavijesti trenutačno nisu dostupne.</p>}
              {priceError && <p role="alert" className="px-3 py-3 text-xs text-red-600">Obavijesti o cijenama trenutačno nisu dostupne.</p>}
              {searchError && <p role="alert" className="px-3 py-3 text-xs text-red-600">Obavijesti o pretragama trenutačno nisu dostupne.</p>}
              {!error && !priceError && !searchError && !conversations.length && !priceDrops.length && !searchAlerts.length && <p className="px-3 py-4 text-xs text-gray-500">Nema nepročitanih obavijesti.</p>}
              <div className="max-h-80 overflow-y-auto">
                {searchAlerts.map(notification => <Link key={`search-${notification.id}`} href={`/ad/${notification.adId}`} onClick={() => { void readSearchAlert(notification); setOpen(false); }} className={`flex items-start gap-2 border-b border-gray-100 px-3 py-3 ${notification.readAt ? 'bg-white hover:bg-gray-50' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                  <SearchIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />
                  <span className="min-w-0 text-xs"><span className="block font-semibold">{notification.searchName}{!notification.readAt && ' • Novo'}</span><span className="mt-1 block truncate">{notification.title || 'Novi odgovarajući oglas'}</span></span>
                </Link>)}
                {priceDrops.map(notification => (
                    <Link key={`price-${notification.id}`} href={`/ad/${notification.adId}`}
                          onClick={() => { void readPriceDrop(notification); setOpen(false); }}
                          className={`flex items-start gap-2 border-b border-gray-100 px-3 py-3 focus-visible:outline-2 focus-visible:outline-blue-500 ${notification.readAt ? 'bg-white hover:bg-gray-50' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                      <TrendingDownIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />
                      <span className="min-w-0 text-xs">
                        <span className="block font-semibold">Snižena cijena{!notification.readAt && ' • Novo'}</span>
                        <span className="mt-1 block truncate">{notification.title || 'Spremljeni oglas'}</span>
                        <span className="mt-1 block"><span className="text-gray-500 line-through">{priceLabel(notification.oldPrice)}</span> → <strong>{priceLabel(notification.newPrice)}</strong></span>
                      </span>
                    </Link>
                ))}
                {conversations.map(conversation => (
                    <Link key={conversation.id} href={`/myMessages?conversationId=${conversation.id}`} onClick={() => setOpen(false)}
                          className={`flex items-start gap-2 border-b border-gray-100 px-3 py-3 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 ${conversation.unreadCount > 0 ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-white hover:bg-gray-50'}`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-100" aria-hidden="true">
                  <MessageSquareTextIcon className="h-3.5 w-3.5" strokeWidth={1.5}/>
                </span>
                      <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold">{conversation.username}</span>
                    <span className="shrink-0 text-[10px] text-gray-500">{conversation.unreadCount} {conversation.unreadCount === 1 ? 'nova poruka' : 'novih poruka'}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-4 text-gray-700">{conversation.unreadCount === 1 ? 'Primili ste novu poruku.' : 'Primili ste nove poruke.'} Otvorite razgovor za prikaz.</span>
                </span>
                    </Link>
                ))}
              </div>
            </div>
        )}
      </div>
  );
}
