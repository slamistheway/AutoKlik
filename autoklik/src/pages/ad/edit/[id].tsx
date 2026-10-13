'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import EditAdForm from '@/components/edit-ad-form';
import { fetchCurrentUser } from '@/app/auth/auth-guards';
import { sessionCookie } from '@/components/cookies/cookies';
import { toAdFullData } from '@/shared/ad-data';
import type { AdFullData } from '@/types/types';
import { API_BASE_URL, getResponseMessage } from '@/pages/myProfile/account-api';

export default function EditPage() {
    const router = useRouter();
    const [ad, setAd] = useState<AdFullData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!router.isReady) return;
        const controller = new AbortController();
        const id = router.query.id;

        const load = async () => {
            setLoading(true);
            setAd(null);
            setError('');
            if (typeof id !== 'string' || !/^\d+$/.test(id) || Number(id) <= 0) {
                setError('Neispravan ID oglasa.');
                setLoading(false);
                return;
            }
            const token = sessionCookie.getSessionToken();
            if (!token) {
                await router.replace(`/login?returnUrl=${encodeURIComponent(`/ad/edit/${id}`)}`);
                return;
            }
            try {
                const user = await fetchCurrentUser();
                if (controller.signal.aborted) return;
                const response = await fetch(`${API_BASE_URL}/ads/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error(await getResponseMessage(response, 'Oglas nije moguće učitati.'));
                const result = toAdFullData(await response.json());
                if (controller.signal.aborted) return;
                if (Number(user.id) !== result.userId) {
                    setError('Možete uređivati samo vlastite oglase.');
                    return;
                }
                setAd(result);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(error instanceof Error ? error.message : 'Oglas nije moguće učitati.');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        void load();
        return () => controller.abort();
    }, [router, router.isReady, router.query.id]);

    return (
        <>
            <header><Navbar /></header>
            <main className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="mx-auto max-w-5xl">
                    {loading && <p role="status">Učitavanje oglasa...</p>}
                    {error && <div className="rounded-md bg-red-50 p-4 text-red-700" role="alert">
                        <p>{error}</p>
                        <Link href="/myProfile" className="mt-2 inline-block underline">Povratak na moj profil</Link>
                    </div>}
                    {!loading && ad && <EditAdForm key={ad.id} ad={ad}
                        onCancel={() => { void router.push(`/ad/${ad.id}`); }}
                        onSaved={updated => { void router.push(`/ad/${updated.id}`); }} />}
                </div>
            </main>
            <Footer />
        </>
    );
}
