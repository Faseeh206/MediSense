const TYPES = {
    LAB_REPORT: { label: 'Lab report', tone: 'lab' },
    PRESCRIPTION: { label: 'Prescription', tone: 'prescription' },
};

export function parseScanDate(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    // The backend's timezone-less ISO dates come from datetime.utcnow().
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function historyRows(records, { now = new Date(), locale = 'en-GB', timeZone } = {}) {
    const zone = timeZone ? { timeZone } : {};
    const day = new Intl.DateTimeFormat('en-CA', { ...zone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = new Intl.DateTimeFormat(locale, { ...zone, hour: 'numeric', minute: '2-digit', hour12: true });
    const dateFormat = new Intl.DateTimeFormat(locale, { ...zone, day: 'numeric', month: 'short', year: 'numeric' });
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    return records.map(record => {
        const { label, tone } = Object.hasOwn(TYPES, record.record_type) ? TYPES[record.record_type] : { label: 'Document', tone: 'document' };
        const name = typeof record.file_name === 'string' && record.file_name.trim()
            ? record.file_name.trim().split(/[\\/]/).pop() || label : `Untitled ${label.toLowerCase()}`;
        const created = parseScanDate(record.created_at);
        const today = created && day.format(created) === day.format(now);
        const isYesterday = created && day.format(created) === day.format(yesterday);
        return { record, name, label, tone,
            group: today ? 'Today' : isYesterday ? 'Yesterday' : 'Earlier scans',
            date: created ? `${today ? 'Today' : isYesterday ? 'Yesterday' : dateFormat.format(created)} · ${time.format(created)}` : 'Date unavailable',
            dateTime: created?.toISOString() || null,
        };
    });
}
