const NUMBER = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?';
export function numericValue(value) {
    const text = String(value ?? '').replaceAll(',', '').trim();
    return new RegExp(`^${NUMBER}$`, 'i').test(text) && Number.isFinite(Number(text)) ? Number(text) : null;
}
export function parseReferenceRange(value) {
    const text = String(value ?? '').replaceAll(',', '').replace(/[–−]/g, '-').trim();
    const interval = text.match(new RegExp(`^(${NUMBER})\\s*(?:-|to)\\s*(${NUMBER})$`, 'i'));
    if (interval) {
        const low = Number(interval[1]), high = Number(interval[2]);
        return low < high && Number.isFinite(low) && Number.isFinite(high) ? { kind: 'interval', low, high } : null;
    }
    const limit = text.match(new RegExp(`^(<=?|>=?|≤|≥)\\s*(${NUMBER})$`, 'i'));
    if (!limit || !Number.isFinite(Number(limit[2]))) return null;
    return { kind: /[<≤]/.test(limit[1]) ? 'upper' : 'lower', limit: Number(limit[2]), inclusive: /[=≤≥]/.test(limit[1]) };
}
export function markerStatus(marker = {}) {
    const raw = String(marker.status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (['NORMAL', 'N', 'WITHIN_RANGE', 'IN_RANGE', 'WITHIN_NORMAL_LIMITS'].includes(raw)) return 'NORMAL';
    if (['HIGH', 'H', 'HI', 'ELEVATED', 'ABOVE_RANGE', 'ABOVE_NORMAL'].includes(raw)) return 'HIGH';
    if (['LOW', 'L', 'LO', 'BELOW_RANGE', 'BELOW_NORMAL'].includes(raw)) return 'LOW';
    if (['CRITICAL', 'CRIT', 'VERY_HIGH', 'VERY_LOW', 'PANIC'].includes(raw)) return 'CRITICAL';
    if (['ABNORMAL', 'A', 'OUT_OF_RANGE', 'FLAGGED'].includes(raw)) return 'ABNORMAL';
    const value = numericValue(marker.observed_value), range = parseReferenceRange(marker.reference_range);
    if (value === null || !range) return 'UNKNOWN';
    if (range.kind === 'interval') return value < range.low ? 'LOW' : value > range.high ? 'HIGH' : 'NORMAL';
    if (range.kind === 'upper') return (range.inclusive ? value > range.limit : value >= range.limit) ? 'HIGH' : 'NORMAL';
    return (range.inclusive ? value < range.limit : value <= range.limit) ? 'LOW' : 'NORMAL';
}
export const STATUS_LABEL = { NORMAL: 'Within range', HIGH: 'Above range', LOW: 'Below range', CRITICAL: 'Critical flag', ABNORMAL: 'Flagged', UNKNOWN: 'Not classified' };
export const needsAttention = marker => ['HIGH', 'LOW', 'CRITICAL', 'ABNORMAL'].includes(markerStatus(marker));
export function filterMarkers(markers, filter = 'ALL') { return filter === 'ATTENTION' ? markers.filter(needsAttention) : markers; }

export function markerRange(marker) {
    const reference = referenceInfo(marker);
    const range = parseReferenceRange(reference.range), value = numericValue(marker.observed_value);
    if (!range || value === null) return null;
    let min, max, start, end, labels;
    if (range.kind === 'interval') {
        const span = range.high - range.low;
        min = range.low - span / 2; max = range.high + span / 2; start = 25; end = 75;
        labels = ['Below', 'Reference interval', 'Above'];
    } else {
        const span = Math.abs(range.limit) || 1;
        if (range.kind === 'upper') {
            min = range.limit - span; max = range.limit + span / 2; start = 0; end = 100 * 2 / 3;
            labels = ['Below limit', 'Reference limit', 'Above limit'];
        } else {
            min = range.limit - span / 2; max = range.limit + span; start = 100 / 3; end = 100;
            labels = ['Below limit', 'Reference limit', 'Above limit'];
        }
    }
    const raw = (value - min) / (max - min) * 100;
    if (reference.isGeneral) labels[1] = 'General adult guide';
    return { start, end, position: Math.max(2, Math.min(98, raw)), clipped: raw < 2 || raw > 98, labels, kind: range.kind };
}

export function reportDate(value) {
    if (!value) return '';
    const raw = String(value), zoned = /T|\s\d{2}:/.test(raw) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw;
    const date = new Date(zoned);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
export function reportModel(data = {}) {
    const extracted = data.extracted_data || {};
    const markers = Array.isArray(extracted.biomarkers) ? extracted.biomarkers.filter(Boolean) : [];
    const medicines = Array.isArray(extracted.medicines) ? extracted.medicines.filter(Boolean) : [];
    const kind = String(data.record_type || '').trim().toUpperCase();
    const type = kind === 'PRESCRIPTION' ? 'Prescription' : kind === 'LAB_REPORT' ? 'Lab report' : 'Document';
    return {
        title: extracted.document_title || `${type} explanation`,
        type,
        fileName: data.file_name || 'Your document',
        clinic: extracted.laboratory_or_clinic || extracted.laboratory || extracted.prescribing_clinic || '',
        date: reportDate(data.created_at), isSample: data.is_sample === true,
        explanation: data.simple_explanation || extracted.simple_explanation || '',
        markers, medicines, attention: markers.filter(needsAttention),
        normal: markers.filter(m => markerStatus(m) === 'NORMAL'), unknown: markers.filter(m => markerStatus(m) === 'UNKNOWN'),
        specialist: data.specialist_recommendation || extracted.specialist_recommendation || null,
        fda: data.api_enriched_data || null,
        disclaimer: data.disclaimer || 'For understanding and conversation. This explanation is not a diagnosis or a treatment plan. Review your results with a qualified clinician.',
    };
}
import { referenceInfo } from './referenceGuides.js';

