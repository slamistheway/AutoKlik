import { API_BASE_URL } from "@/lib/account-api";


export function resolve_api_pfp_img(path?: string | null) {
    if (!path) return '/default-pfp.jpg';
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function resolve_api_ad_img(path?: string | null) {
    if (!path) return '/default_ad_img.png';
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}


export function truncate(text: string, length = 100) {
    if (!text) return "";
    return text.length > length ? `${text.slice(0, length)}...` : text;
}



export const addSaveToList = async (
    arg_ListID: string,
    arg_SaveID: string,
    arg_postType: string,
    setErrorMessage: (msg: string) => void
    ) => {
    try {
        const res = await fetch(`${API_BASE_URL}/scrapper/addSaveToList`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({arg_ListID, arg_SaveID, arg_postType }),
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody?.message ?? 'Dodavanje sačuvanog sadržaja u listu nije uspjelo.');
        }

        await res.json();

    } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Spremanje u listu nije uspjelo.');
    }
};

export const removeSaveFromList = async (
    arg_ListID: string,
    arg_SaveID: string,
    arg_postType: string,
    setErrorMessage: (msg: string) => void
) => {
    try {
        const res = await fetch(`${API_BASE_URL}/scrapper/removeSaveFromList`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({arg_ListID, arg_SaveID, arg_postType }),
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody?.message ?? 'Uklanjanje sačuvanog sadržaja iz liste nije uspjelo.');
        }

        await res.json();

    } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Uklanjanje sačuvanog sadržaja iz liste nije uspjelo.');
    }
}

