import { apiErrorMessage } from './apiErrors.js';

// Real transfer progress. Upload completion is distinct from analysis completion.
export function requestDocumentAnalysis({ url, formData, signal, onUploadProgress, onUploaded, headers = {} }) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) { reject(new DOMException('Analysis cancelled', 'AbortError')); return; }
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();
        const cleanup = () => {
            signal?.removeEventListener('abort', abort);
            xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = null;
            xhr.upload.onprogress = xhr.upload.onload = null;
        };
        const fail = error => { cleanup(); reject(error); };
        xhr.open('POST', url);
        for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
        xhr.timeout = 120000;
        xhr.responseType = 'json';
        xhr.upload.onprogress = event => onUploadProgress?.(event.lengthComputable && event.total > 0
            ? Math.min(100, event.loaded / event.total * 100) : null);
        xhr.upload.onload = () => { onUploadProgress?.(100); onUploaded?.(); };
        xhr.onload = () => {
            const data = xhr.response;
            if (xhr.status < 200 || xhr.status >= 300) {
                fail(new Error(apiErrorMessage(data, xhr.status)));
                return;
            }
            if (!data || typeof data !== 'object') { fail(new Error('The analysis service returned an unreadable response. Please try again.')); return; }
            cleanup(); resolve(data);
        };
        xhr.onerror = () => fail(new TypeError('The analysis service is unavailable.'));
        xhr.onabort = () => fail(new DOMException('Analysis cancelled', 'AbortError'));
        xhr.ontimeout = () => fail(new Error('The analysis request timed out. Please try again.'));
        signal?.addEventListener('abort', abort, { once: true });
        try { xhr.send(formData); } catch (error) { fail(error); }
    });
}
