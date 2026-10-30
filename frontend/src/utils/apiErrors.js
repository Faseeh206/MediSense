export function apiErrorMessage(data, status) {
    if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
    if (Array.isArray(data?.detail)) {
        const details = data.detail.map(item => typeof item?.msg === 'string' ? item.msg : '').filter(Boolean);
        if (details.length) return details.join('. ');
    }
    if (status === 404) return 'Document analysis is not connected to this website yet. Please contact the site administrator.';
    if (status === 413) return 'This document is too large for the analysis service. Please choose a smaller PDF or image.';
    if (status === 401 || status === 403) return 'The analysis service is not publicly accessible. Please contact the site administrator.';
    return `The service could not complete this request${status ? ` (${status})` : ''}. Please try again later.`;
}
