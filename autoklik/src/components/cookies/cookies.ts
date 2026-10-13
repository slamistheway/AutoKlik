import {Cookies} from 'react-cookie';

const TOKEN_COOKIE = 'autoklik.betterAuthSession';

export class SessionCookie extends Cookies {
    getSessionToken(): string | null {
        if (typeof window === 'undefined') return null;

        const token: unknown = this.get(TOKEN_COOKIE, {doNotParse: true});
        if (typeof token === 'string' && token.length > 0) return token;

        return null;
    }

    setSessionToken(token: string) {
        this.remove('autoklik.sessionApiToken', {path: '/'});
        this.set(TOKEN_COOKIE, token, {
            path: '/',
            sameSite: 'lax',
            secure: window.location.protocol === 'https:',
        });
        this.clearLegacyStorage();
    }


    removeSessionToken() {
        if (typeof window === 'undefined') return;

        this.remove(TOKEN_COOKIE, {path: '/', sameSite: 'lax', secure: window.location.protocol === 'https:'});
        this.remove('sessionApiToken', {path: '/'});
        this.remove('autoklik.sessionApiToken', {path: '/'});
        this.clearLegacyStorage();
    }

    logCookies() {
        if (typeof window === 'undefined') return;
        console.log('Authenticated:', Boolean(this.getSessionToken()));
    }

    private clearLegacyStorage() {
        try {
            localStorage.removeItem('sessionApiToken');
            localStorage.removeItem('autoklik.authenticated');
        } catch {}
    }
}

export class TimeSpentCookie extends Cookies {
    
}



export const sessionCookie = new SessionCookie();
