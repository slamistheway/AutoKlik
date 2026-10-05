'use client';

import {useEffect, useRef, useState} from 'react';
import { useRouter } from 'next/router';
import '../app/globals.css';
import {Navbar} from "@/components/navbar";
import Image from 'next/image';
import {ChatImage} from '@/components/chat-image';
import {CurrentUser} from "@/types/types";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ImageIcon, XIcon} from "lucide-react";

const profileNavigation = [
    { href: '/myProfile', label: 'Moj profil' },
    { href: '/myMessages', label: 'Poruke' },
    { href: '/mySavedAds', label: 'Spremljeni oglasi' },
    { href: '/mySettings', label: 'Postavke' },
];


type Conversation = { id: number; otherUserId: number; username: string; pfp: string | null; unreadCount: number };
type Message = { id: number; senderId: number; body: string; createdAt: string; readAt: string | null; hasImage: boolean };

async function request<T>(path: string, token: string, body?: object, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`http://localhost:3001/users/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: body ? JSON.stringify(body) : undefined,
        signal,
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.message ?? 'Greška pri učitavanju razgovora.');
    }
    return payload;
}

export default function MyMessages() {
    const router = useRouter();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setActiveConversation] = useState<number | null>(null);
    const requestedConversation = Number(router.query.conversationId);
    const activeConversation = Number.isSafeInteger(requestedConversation) && requestedConversation > 0 ? requestedConversation : selectedConversation;
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messageRequest = useRef(0);
    const [messageBody, setMessageBody] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const sendInProgress = useRef(false);
    const messageRevision = useRef(0);
    const [loadedConversation, setLoadedConversation] = useState<number | null>(null);
    const messagePanel = useRef<HTMLDivElement>(null);
    const messageInput = useRef<HTMLInputElement>(null);
    const imageInput = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const scrolledConversation = useRef<number | null>(null);
    const sentImageToScroll = useRef<number | null>(null);
    const otherUserId = conversations.find(item => item.id === activeConversation)?.otherUserId;
    const pathname = usePathname()


    const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const body = messageBody.trim();
        if (sendInProgress.current || loadingMessages || (!body && !selectedImage) || activeConversation === null || !user) return;
        const token = localStorage.getItem('sessionApiToken');
        if (!token) {
            void router.replace('/login');
            return;
        }

        sendInProgress.current = true;
        messageRevision.current++;
        setSendingMessage(true);
        setErrorMessage(null);
        const requestId = messageRequest.current;
        try {
            let message: Message;
            if (selectedImage) {
                const formData = new FormData();
                formData.append('conversationId', String(activeConversation));
                formData.append('body', body);
                formData.append('image', selectedImage);
                const response = await fetch('http://localhost:3001/users/sendMessageImage', {
                    method: 'POST', headers: {Authorization: `Bearer ${token}`}, body: formData,
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message ?? 'Greška pri slanju slike.');
                message = payload;
            } else {
                message = await request<Message>('sendMessage', token, {conversationId: activeConversation, body});
            }
            if (requestId === messageRequest.current) {
                scrolledConversation.current = null;
                sentImageToScroll.current = message.hasImage ? message.id : null;
                setMessages(current => [...current, message]);
                setMessageBody('');
                setSelectedImage(null);
                setImagePreview(null);
                if (imageInput.current) imageInput.current.value = '';
            }
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Greška pri slanju poruke.');
        } finally {
            sendInProgress.current = false;
            setSendingMessage(false);
        }
    };

    useEffect(() => {
        if (!imagePreview) return;
        return () => URL.revokeObjectURL(imagePreview);
    }, [imagePreview]);

    useEffect(() => {
        const token = localStorage.getItem('sessionApiToken');
        if (!token) {
            void router.replace('/login');
            return;
        }
        const controller = new AbortController();
        const load = async () => {
            try {
                const apiUser = await request<CurrentUser>('me', token, undefined, controller.signal);
                if (controller.signal.aborted) return;
                setUser(apiUser);
                console.log("Sender user id:", apiUser.id);
                console.log("Reciever user id:", localStorage.getItem('goToMessageUserID'));
                
                const incomingId = localStorage.getItem('goToMessageUserID');
                let newConversation: { id: number } | null = null;
                if (incomingId && Number(incomingId) !== Number(apiUser.id)) {
                    newConversation = await request<{ id: number }>('addConversation', token, {otherUserId: Number(incomingId)}, controller.signal);
                }
                const list = await request<Conversation[]>('getConversations', token, undefined, controller.signal);
                if (controller.signal.aborted) return;
                setConversations(list);
                if (newConversation) setActiveConversation(newConversation.id);
                localStorage.removeItem('goToMessageUserID');
                localStorage.removeItem('goToMessageUserUsername');
            } catch (error: unknown) {
                if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Greška pri učitavanju razgovora.');
            } finally {
                if (!controller.signal.aborted) setLoadingConversations(false);
            }
        };
        void load();
        return () => controller.abort();
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem('sessionApiToken');
        if (!token) return;
        const controller = new AbortController();
        let pending = false;
        const refresh = async () => {
            if (pending || document.visibilityState !== 'visible') return;
            pending = true;
            try {
                const list = await request<Conversation[]>('getConversations', token, undefined, controller.signal);
                if (!controller.signal.aborted) setConversations(list);
            } catch (error: unknown) {
                if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Greška pri učitavanju razgovora.');
            } finally {
                pending = false;
            }
        };
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

    useEffect(() => {
        if (activeConversation === null) return;
        const token = localStorage.getItem('sessionApiToken');
        if (!otherUserId || !token) return;
        const controller = new AbortController();
        const requestId = ++messageRequest.current;
        let pending = false;
        const load = async (initial = false) => {
            if (pending || sendInProgress.current || (!initial && document.visibilityState !== 'visible')) return;
            pending = true;
            const revision = messageRevision.current;
            if (initial) {
                scrolledConversation.current = null;
                sentImageToScroll.current = null;
                setLoadingMessages(true);
                setMessages([]);
                setLoadedConversation(null);
                setErrorMessage(null);
            }
            try {
                const payload = await request<{ messages: Message[] }>('loadConversation', token, {otherUserId}, controller.signal);
                if (!controller.signal.aborted && requestId === messageRequest.current && revision === messageRevision.current) {
                    setMessages(payload.messages);
                    setLoadedConversation(activeConversation);
                }
            } catch (error: unknown) {
                if (!controller.signal.aborted && requestId === messageRequest.current) setErrorMessage(error instanceof Error ? error.message : 'Greška pri učitavanju poruka.');
            } finally {
                pending = false;
                if (!controller.signal.aborted && requestId === messageRequest.current) setLoadingMessages(false);
            }
        };
        const refresh = () => { void load(); };
        void load(true);
        const interval = window.setInterval(refresh, 5000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            controller.abort();
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [activeConversation, otherUserId]);

    useEffect(() => {
        if (activeConversation === null || loadedConversation !== activeConversation || loadingMessages || scrolledConversation.current === activeConversation) return;
        const panel = messagePanel.current;
        if (!panel) return;
        panel.scrollTop = panel.scrollHeight;
        scrolledConversation.current = activeConversation;
    }, [activeConversation, loadedConversation, loadingMessages, messages]);

    useEffect(() => {
        if (activeConversation === null || loadedConversation !== activeConversation || loadingMessages || sendingMessage) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]'))) return;
            if (event.key === ' ' && target instanceof HTMLElement && target.closest('button, a, [role="button"]')) return;
            const input = messageInput.current;
            if (!input || input.disabled || input.readOnly) return;
            event.preventDefault();
            input.focus({preventScroll: true});
            setMessageBody(current => current + event.key);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeConversation, loadedConversation, loadingMessages, sendingMessage]);

    useEffect(() => {
        if (!user || activeConversation === null || loadedConversation !== activeConversation || loadingMessages) return;
        const unread = messages.filter(message => message.senderId !== user.id && !message.readAt);
        if (!unread.length) return;
        const token = localStorage.getItem('sessionApiToken');
        if (!token) return;
        const controller = new AbortController();
        let pending = false;
        const markRead = async () => {
            if (pending || document.visibilityState !== 'visible') return;
            pending = true;
            try {
                const result = await request<{messages: {id: number; readAt: string}[]}>('markMessagesRead', token, {
                    conversationId: activeConversation, throughMessageId: Math.max(...unread.map(message => message.id)),
                }, controller.signal);
                if (controller.signal.aborted) return;
                const receipts = new Map(result.messages.map(message => [message.id, message.readAt]));
                if (receipts.size) setMessages(current => current.map(message => receipts.has(message.id) ? {...message, readAt: receipts.get(message.id)!} : message));
                window.dispatchEvent(new Event('messages-read'));
            } catch (error: unknown) {
                if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Greška pri označavanju poruka.');
            } finally {
                pending = false;
            }
        };
        void markRead();
        document.addEventListener('visibilitychange', markRead);
        return () => {
            controller.abort();
            document.removeEventListener('visibilitychange', markRead);
        };
    }, [messages, activeConversation, loadedConversation, loadingMessages, user]);

    return (
        <>
            <header>
                <Navbar/>
            </header>

            <main className="bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto grid w-full max-w-7xl items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
                    {errorMessage && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2" role="alert">
                            <strong className="font-semibold">Greška: </strong>
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <aside className="h-fit w-full shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
                        <nav aria-label="Korisnički izbornik" className="flex flex-col gap-2">
                            {profileNavigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`rounded px-3 py-2 text-sm font-medium transition ${pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}>{item.label}</Link>)}
                        </nav>
                    </aside>

                    <div className="grid min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:min-h-[520px] md:grid-cols-[280px_minmax(0,1fr)]">
                        <aside className="border-b border-gray-200 bg-gray-50/50 md:border-b-0 md:border-r" aria-labelledby="conversations-heading">
                            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                                <h2 id="conversations-heading" className="font-semibold text-gray-900">Razgovori</h2>
                            </div>
                            <div className="max-h-72 space-y-1 overflow-y-auto p-3 md:max-h-[460px]">
                                {conversations.map((conversation) => (
                                    <div key={conversation.id}>
                                        <button type="button" disabled={sendingMessage} onClick={() => {
                                            setMessageBody('');
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                            if (imageInput.current) imageInput.current.value = '';
                                            setActiveConversation(conversation.id);
                                            if (router.query.conversationId) void router.replace('/myMessages', undefined, {shallow: true});
                                        }} aria-pressed={activeConversation === conversation.id}
                                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${activeConversation === conversation.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700" aria-hidden="true">{conversation.username.charAt(0).toUpperCase() || '?'}</span>
                                            <span className="min-w-0 truncate text-sm font-medium text-gray-900">{conversation.username}</span>
                                            {conversation.unreadCount > 0 && <span className="ml-auto shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white" aria-label={`${conversation.unreadCount} nepročitanih poruka`}>{conversation.unreadCount}</span>}
                                        </button>
                                    </div>
                                ))}
                                {loadingConversations && <p className="px-2 py-4 text-sm text-gray-500" role="status">Učitavanje razgovora...</p>}
                                {!loadingConversations && !errorMessage && !conversations.length && (
                                    <p className="px-2 py-4 text-sm leading-6 text-gray-500">Još nema razgovora. Započni razgovor s korisnikom putem njegovog profila.</p>
                                )}
                            </div>
                        </aside>

                        <section className="flex min-h-[320px] min-w-0 flex-col" aria-labelledby="chat-heading">
                            <div className="border-b border-gray-200 px-5 py-4">
                                <h2 id="chat-heading" className="font-semibold text-gray-900">{conversations.find(item => item.id === activeConversation)?.username ?? 'Poruke'}</h2>
                            </div>
                            <div className="flex flex-1 flex-col overflow-hidden">
                                {loadingMessages ? (
                                    <p className="px-6 py-12 text-center text-sm text-gray-500" role="status">Učitavanje poruka...</p>
                                ) : messages.length > 0 || activeConversation ? (
                                    <div className="flex flex-1 flex-col gap-3 p-4">
                                        <div ref={messagePanel} className="flex h-[400px] shrink-0 flex-col gap-2 overflow-y-auto px-2">
                                            {messages.map((m, index) => (
                                                <div key={m.id} className="flex shrink-0 flex-col gap-2">
                                                    {(index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(m.createdAt).toDateString()) && (
                                                        <div className="my-2 self-center rounded-md bg-[#202c33] px-3 py-1 text-xs text-gray-300">
                                                            {new Date(m.createdAt).toLocaleDateString('hr-HR', {day: 'numeric', month: 'long', year: 'numeric'})}
                                                        </div>
                                                    )}
                                                    <div className={`relative flex w-fit max-w-[85%] flex-wrap items-end gap-x-2 rounded-lg px-2.5 py-1.5 text-white shadow-sm sm:max-w-[75%] ${m.senderId === user?.id ? 'self-end rounded-tr-none bg-[#005c4b]' : 'self-start rounded-tl-none bg-[#202c33]'}`}>
                                                        <span aria-hidden="true" className={`absolute top-0 h-0 w-0 border-b-[8px] border-b-transparent ${m.senderId === user?.id ? '-right-2 border-l-[8px] border-l-[#005c4b]' : '-left-2 border-r-[8px] border-r-[#202c33]'}`} />
                                                        {m.hasImage && <div className="w-full"><ChatImage messageId={m.id} onLoad={() => {
                                                            if (sentImageToScroll.current !== m.id) return;
                                                            const panel = messagePanel.current;
                                                            if (panel) panel.scrollTop = panel.scrollHeight;
                                                            sentImageToScroll.current = null;
                                                        }}/></div>}
                                                        {m.body && <div className="min-w-0 whitespace-pre-wrap break-words text-sm leading-5 [overflow-wrap:anywhere]">{m.body}</div>}
                                                        <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString('hr-HR')}
                                                              className="ml-auto shrink-0 text-[11px] leading-4 text-gray-300">
                                                            {new Date(m.createdAt).toLocaleTimeString('hr-HR', {hour: '2-digit', minute: '2-digit'})}
                                                        </time>
                                                        {m.senderId === user?.id && <span className={`shrink-0 text-[11px] ${m.readAt ? 'text-sky-300' : 'text-gray-300'}`} title={m.readAt ? `Pročitano: ${new Date(m.readAt).toLocaleString('hr-HR')}` : 'Poslano'}>{m.readAt ? '✓✓' : '✓'}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-gray-200 pt-4">
                                            <form onSubmit={sendMessage}>
                                                <div>
                                                    {selectedImage && imagePreview &&
                                                        <div className="mb-3 flex items-center gap-3">
                                                            <Image src={imagePreview} alt="Odabrana slika" width={80} height={80} unoptimized className="h-20 w-20 rounded-md object-cover" />
                                                            <button
                                                                className="relative bottom-9 right-6 text-sm text-red-600 bg-black/10 rounded-full p-1 hover:bg-black/20 transition-colors cursor-pointer"
                                                                type="button"
                                                                aria-label="Ukloni sliku"
                                                                onClick={() => {
                                                                    setSelectedImage(null);
                                                                    setImagePreview(null);
                                                                    if (imageInput.current) imageInput.current.value = '';
                                                                }}
                                                            >
                                                                <XIcon className="h-4 w-4" aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    }
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={sendingMessage}
                                                        aria-label="Dodaj sliku"
                                                        onClick={() => imageInput.current?.click()}
                                                        className="shrink-0 rounded-md bg-blue-500 p-2 text-white enabled:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                                                    </button>
                                                    <input
                                                        className="hidden"
                                                        ref={imageInput}
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        disabled={sendingMessage}
                                                        aria-label="Dodaj sliku"
                                                        onChange={event => {
                                                            const file = event.target.files?.[0] ?? null;
                                                            if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
                                                                setErrorMessage('Odaberi JPEG, PNG ili WebP sliku manju od 5 MB.');
                                                                event.target.value = '';
                                                                setSelectedImage(null);
                                                                setImagePreview(null);
                                                                return;
                                                            }
                                                            setErrorMessage(null);
                                                            setSelectedImage(file);
                                                            setImagePreview(file ? URL.createObjectURL(file) : null);
                                                        }}
                                                    />


                                                    <input ref={messageInput}
                                                           maxLength={10000}
                                                           value={messageBody}
                                                           onChange={event => setMessageBody(event.target.value)}
                                                           disabled={sendingMessage}
                                                           aria-label="Poruka"
                                                           className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none"
                                                           placeholder="Upiši poruku..."
                                                    />

                                                    <button
                                                        type="submit" disabled={sendingMessage || (!messageBody.trim() && !selectedImage) || !user}
                                                        className="ml-2 rounded-md bg-blue-500 py-2 px-4 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {sendingMessage ? 'Slanje...' : 'Pošalji'}
                                                    </button>
                                                </div>

                                            </form>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                                        <div className="max-w-xs">
                                            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-blue-400" aria-hidden="true" />
                                            <p className="text-base font-semibold text-gray-900">{activeConversation ? 'Još nema poruka' : 'Odaberi razgovor'}</p>
                                            <p className="mt-2 text-sm leading-6 text-gray-500">{activeConversation ? 'U ovom razgovoru još nema poruka.' : 'Klikni razgovor s lijeve strane za prikaz poruka.'}</p>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
}
