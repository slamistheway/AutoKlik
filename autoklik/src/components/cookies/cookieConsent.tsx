'use client';

import {useEffect, useState} from 'react';

const STORAGE_KEY = 'autoklik.cookie-consent';
const CONSENT_DURATION = 180 * 24 * 60 * 60 * 1000;

type Consent = {version: 1; necessary: true; analytics: boolean; marketing: boolean; expiresAt: number};

function readConsent(): Consent | null {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        if (value && typeof value === 'object' && 'version' in value && value.version === 1 &&
            'necessary' in value && value.necessary === true &&
            'analytics' in value && typeof value.analytics === 'boolean' &&
            'marketing' in value && typeof value.marketing === 'boolean' &&
            'expiresAt' in value && typeof value.expiresAt === 'number' && value.expiresAt > Date.now()) {
            return value as Consent;
        }
    } catch {}
    return null;
}

export function CookieConsent() {
    const [ready, setReady] = useState(false);
    const [visible, setVisible] = useState(false);
    const [personalizing, setPersonalizing] = useState(false);
    const [analytics, setAnalytics] = useState(false);
    const [marketing, setMarketing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            const consent = readConsent();
            setAnalytics(consent?.analytics ?? false);
            setMarketing(consent?.marketing ?? false);
            setVisible(!consent);
            setReady(true);
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const save = (allowAnalytics: boolean, allowMarketing: boolean) => {
        const consent: Consent = {version: 1, necessary: true, analytics: allowAnalytics, marketing: allowMarketing, expiresAt: Date.now() + CONSENT_DURATION};
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
        } catch {
            setError('Postavke se ne mogu spremiti u ovom pregledniku. Omogući pohranu i pokušaj ponovno.');
            return;
        }

        setAnalytics(allowAnalytics);
        setMarketing(allowMarketing);
        setVisible(false);
        setPersonalizing(false);
        setError('');
        window.dispatchEvent(new CustomEvent('autoklik:cookie-consent', {detail: consent}));
    };

    if (!ready) return null;

    const primaryButton = 'rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400';
    const secondaryButton = 'rounded-lg border border-gray-500 bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400';

    if (visible) return (
        <section
            aria-label="Postavke kolačića"
            className="motion-safe:animate-[cookie-fade-in_1s_ease-out_both] fixed bottom-4 left-4 right-4 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-white/5 bg-[#202a38] p-5 text-sm font-normal leading-5 text-slate-300 shadow-2xl sm:left-auto sm:w-[560px] sm:p-6"
        >
            {personalizing ? (
                <>
                    <h2 className="mb-2 text-base font-bold text-white">Prilagodi kolačiće</h2>
                    <p>Odaberi koje vrste pohrane dopuštaš. Nužna pohrana potrebna je za prijavu i rad stranice.</p>
                    <div className="mt-4 space-y-3">
                        <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                            <input type="checkbox" checked disabled className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
                            <span><strong className="block text-white">Nužni</strong>Prijava, sigurnost i spremanje tvojih postavki. Uvijek uključeni.</span>
                        </label>
                        <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                            <input type="checkbox" checked={analytics} onChange={event => setAnalytics(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
                            <span><strong className="block text-white">Analitika</strong>Dopuštenje za mjerenje korištenja stranice.</span>
                        </label>
                        <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                            <input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
                            <span><strong className="block text-white">Marketing</strong>Dopuštenje za personalizirani oglasni sadržaj.</span>
                        </label>
                    </div>
                </>
            ) : (
                <>
                    <p>Koristimo nužnu pohranu za prijavu, sigurnost i rad stranice. Ti biraš dopuštaš li dodatnu pohranu za analitiku i personalizirani oglasni sadržaj.</p>
                </>
            )}
            {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => personalizing ? save(analytics, marketing) : setPersonalizing(true)} className={`${primaryButton} sm:mr-auto`}>
                    {personalizing ? 'Spremi odabir' : 'Prilagodi izbor'}
                </button>
                <button type="button" onClick={() => save(false, false)} className={secondaryButton}>Odbij neobavezne</button>
                <button type="button" onClick={() => save(true, true)} className={primaryButton}>Prihvati sve</button>
            </div>
        </section>
    );
}
