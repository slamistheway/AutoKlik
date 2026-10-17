import {sessionCookie} from '@/components/cookies/cookies';

const listeners = new Set<() => void>();
let connection: AbortController | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;

function notify() {
    listeners.forEach(listener => listener());
}

async function connect() {
    if (!listeners.size || connection || retry) return;
    const token = sessionCookie.getSessionToken();
    if (!token) { scheduleRetry(5000); return; }
    const controller = new AbortController();
    connection = controller;
    try {
        const response = await fetch('http://localhost:3001/users/message-events', {
            headers: {Authorization: `Bearer ${token}`}, signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('Live messages unavailable');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
            const {value, done} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            let boundary: number;
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const event = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);
                if (event.startsWith('data:')) notify();
            }
        }
    } catch { /* Existing polling covers interrupted streams. */ }
    finally {
        if (connection === controller) {
            connection = null;
            if (listeners.size) scheduleRetry(3000);
        }
    }
}

function scheduleRetry(delay: number) {
    retry = setTimeout(() => { retry = undefined; void connect(); }, delay);
}

export function subscribeMessages(listener: () => void) {
    listeners.add(listener);
    void connect();
    return () => {
        listeners.delete(listener);
        if (!listeners.size) {
            clearTimeout(retry);
            retry = undefined;
            connection?.abort();
            connection = null;
        }
    };
}
