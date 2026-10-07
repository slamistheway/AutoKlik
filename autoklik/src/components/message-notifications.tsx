'use client';

import Link from 'next/link';
import {BellIcon, MessageSquareTextIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {sessionCookie} from '@/components/cookies/cookies';

type UnreadConversation = {id: number; username: string; unreadCount: number};

export function MessageNotifications() {
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

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
    window.addEventListener('messages-read', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('messages-read', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
      <div className="relative">
        <button type="button" aria-label={`Obavijesti: ${unreadCount} nepročitanih poruka`} aria-expanded={open}
                onClick={() => setOpen(current => !current)} className="relative flex items-center p-2 text-white">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {open && (
            <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg">
              <p className="border-b border-gray-200 px-3 py-3 text-sm font-semibold">Obavijesti</p>
              {error && <p role="alert" className="px-3 py-3 text-xs text-red-600">Obavijesti trenutačno nisu dostupne.</p>}
              {!error && !conversations.length && <p className="px-3 py-4 text-xs text-gray-500">Nema nepročitanih obavijesti.</p>}
              <div className="max-h-80 overflow-y-auto">
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
