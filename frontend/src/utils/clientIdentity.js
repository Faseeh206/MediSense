// A private, unguessable capability keeps no-account history scoped to one browser.
// Only its SHA-256 digest is stored by the backend.
export function createClientIdentity({ storage, cryptoObject = globalThis.crypto } = {}) {
    let cached = null;
    const getStore = () => {
        if (storage !== undefined) return storage;
        try { return globalThis.localStorage; } catch { return null; }
    };
    const getToken = () => {
        if (cached) return cached;
        const store = getStore();
        try {
            const saved = store?.getItem('medisense-client-token');
            if (/^[a-f0-9]{64}$/.test(saved || '')) { cached = saved; return cached; }
        } catch { /* Private browsing can disable persistent storage. */ }
        if (!cryptoObject?.getRandomValues) throw new Error('Secure browser storage is unavailable. Please use an up-to-date browser.');
        cached = Array.from(cryptoObject.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
        try { store?.setItem('medisense-client-token', cached); } catch { /* Retain the capability for this page session. */ }
        return cached;
    };
    return { getToken, getHeaders: extra => ({ ...extra, 'X-Client-Token': getToken() }) };
}
const identity = createClientIdentity();
export const getClientHeaders = identity.getHeaders;
