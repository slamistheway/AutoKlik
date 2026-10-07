import {Cookies} from 'react-cookie';

const TOKEN_COOKIE = 'autoklik.sessionApiToken';

export class SessionCookie extends Cookies {
    getSessionToken(): string | null {
        if (typeof window === 'undefined') return null;

        const token: unknown = this.get(TOKEN_COOKIE, {doNotParse: true});
        if (typeof token === 'string' && token.length > 0) return token;

        let legacyToken: unknown = this.get('sessionApiToken', {doNotParse: true});
        if (typeof legacyToken !== 'string' && typeof window !== 'undefined') {
            try {
                legacyToken = localStorage.getItem('sessionApiToken');
            } catch {}
        }
        if (typeof legacyToken === 'string' && legacyToken.length > 0) {
            this.setSessionToken(legacyToken);
            this.remove('sessionApiToken', {path: '/'});
            return legacyToken;
        }

        return null;
    }

    setSessionToken(token: string) {
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
        this.clearLegacyStorage();
    }

    logCookies() {
        if (typeof window === 'undefined') return;
        console.log('(Cookie) sessionApiToken: ', this.getSessionToken());
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
