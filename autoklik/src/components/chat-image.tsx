'use client';

import Image from 'next/image';
import {useEffect, useState} from 'react';
import {sessionCookie} from '@/components/cookies/cookies';

export function ChatImage({messageId, onLoad}: {messageId: number; onLoad?: () => void}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;
    const load = async () => {
      try {
        const token = sessionCookie.getSessionToken();
        if (!token) throw new Error('Missing session');
        const response = await fetch(`http://localhost:3001/users/messages/${messageId}/image`, {
          headers: {Authorization: `Bearer ${token}`}, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Image unavailable');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    void load();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [messageId]);

  if (failed) return <p role="status" className="text-xs text-gray-300">Slika nije dostupna.</p>;
  if (!imageUrl) return <p role="status" className="text-xs text-gray-300">Učitavanje slike...</p>;
  return <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
    <Image src={imageUrl} alt="Slika u razgovoru" width={280} height={200} unoptimized onLoad={onLoad}
           className="h-auto max-h-64 w-auto max-w-full rounded-md object-contain" />
  </a>;
}
