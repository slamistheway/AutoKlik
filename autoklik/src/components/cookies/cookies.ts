import {Cookies} from 'react-cookie';

const TOKEN_COOKIE = 'autoklik.betterAuthSession';
const validToken = (token: unknown): token is string => typeof token === 'string' && token.length <= 512 && /^[A-Za-z0-9._~+/-]+=*$/.test(token);

export class SessionCookie extends Cookies {
    getSessionToken(): string | null {
        if (typeof window === 'undefined') return null;

        const token: unknown = this.get(TOKEN_COOKIE, {doNotParse: true});
        if (validToken(token)) return token;

        return null;
    }

    setSessionToken(token: string) {
        if (typeof window === 'undefined' || !validToken(token)) throw new Error('Neispravna sesija.');
        this.remove('autoklik.sessionApiToken', {path: '/'});
        this.set(TOKEN_COOKIE, token, {
            path: '/',
            sameSite: 'lax',
            secure: window.location.protocol === 'https:',
            maxAge: 24 * 60 * 60,
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
