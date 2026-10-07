'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { Heart, Star } from 'lucide-react';
import {sessionCookie} from '@/components/cookies/cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';


async function getResponseMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
    ? body.message
    : fallback;
}

interface SaveAdButtonProps {
  adId: number;
  initialSaved?: boolean;
  checkSavedOnMount?: boolean;
  variant?: 'star' | 'heart';
  className?: string;
}

export function SaveAdButton({
  adId,
  initialSaved = false,
  checkSavedOnMount = false,
  variant = 'star',
  className = '',
}: SaveAdButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(checkSavedOnMount);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    if (!checkSavedOnMount) return;
    const token = sessionCookie.getSessionToken();
    if (!token) {
      setIsChecking(false);
      return;
    }

    let active = true;
    fetch(`${API_BASE_URL}/ads/saved/${adId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async response => {
      if (!response.ok) return;
      const result: unknown = await response.json();
      const saved = typeof result === 'boolean'
        ? result
        : Boolean(result && typeof result === 'object' && (
          ('is_saved' in result && result.is_saved) || ('isSaved' in result && result.isSaved)
        ));
      if (active) setIsSaved(saved);
    }).catch(() => undefined).finally(() => {
      if (active) setIsChecking(false);
    });

    return () => { active = false; };
  }, [adId, checkSavedOnMount]);



  const toggleSaved = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSaving) return;

    const token = sessionCookie.getSessionToken();
    if (!token) {
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/ads/save/${adId}`, {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(await getResponseMessage(response, 'Oglas nije moguće spremiti.'));
      }
      const nextSaved = !isSaved;
      setIsSaved(nextSaved);
      setMessage(nextSaved ? 'Oglas je spremljen.' : 'Oglas je uklonjen iz spremljenih.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Oglas nije moguće spremiti.');
    } finally {
      setIsSaving(false);
    }
  };

  const Icon = variant === 'heart' ? Heart : Star;




  return (
    <span className={`inline-flex flex-col items-center ${variant === 'heart' ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={toggleSaved}
        disabled={isSaving || isChecking}
        aria-label={isSaved ? 'Ukloni oglas iz spremljenih' : 'Spremi oglas'}
        aria-pressed={isSaved}
        title={message || undefined}
        className={`${className} ${variant === 'heart' ? 'w-full' : ''} disabled:cursor-wait disabled:opacity-60`}
      >
        <Icon className={`h-5 w-5 ${isSaved ? 'fill-orange-500 text-orange-500' : ''}`} />
        {variant === 'heart' && <span>{isSaved ? 'Spremljeno' : 'Spremi'}</span>}
      </button>
      {message && <span role="status" className="sr-only">{message}</span>}
    </span>
  );
}
