import { markerStatus, STATUS_LABEL } from './resultsPresentation.js';
import { referenceInfo } from './referenceGuides.js';

export const FDA_FIELDS = [
    ['official_uses', 'Labelled uses'], ['boxed_warning', 'Boxed warning'], ['safety_warnings', 'Warnings and precautions'],
    ['side_effects', 'Side effects'], ['dosage_guidance', 'Label dosage context'], ['fda_plain_summary', 'Label explanation'],
];
export const FDA_SUMMARY_FIELDS = [
    ['boxed_warning', 'Serious boxed warning'], ['official_uses', 'What it is used for'],
    ['safety_warnings', 'Important warnings'], ['side_effects', 'Side effects'],
];
export const MEDICINE_INFO_FIELDS = [
    ['uses', 'Common uses'], ['important_warnings', 'Important warnings'],
    ['common_side_effects', 'Possible side effects'], ['when_to_seek_help', 'When to seek urgent help'],
];
export function isAIMedicineInformation(context) {
    return !!context && Object.hasOwn(context, 'information_status') && Object.hasOwn(context, 'patient_information');
}
export function medicineInfoSections(context) {
    if (!isAIMedicineInformation(context) || context.information_status !== 'ready') return [];
    return MEDICINE_INFO_FIELDS.flatMap(([field, label]) => {
        const value = context.patient_information?.[field];
        return typeof value === 'string' && value.trim() ? [[field, label, value]] : [];
    });
}
export function labelSummary(context) {
    const summary = context?.patient_summary;
    if (context?.summary_status !== 'ready' || !summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    if (!FDA_SUMMARY_FIELDS.every(([field]) => !context[field] || (typeof summary[field] === 'string' && summary[field].trim()))) return null;
    return summary;
}
export function labelDisplayFields(context) {
    const summary = labelSummary(context);
    return (summary ? FDA_SUMMARY_FIELDS : FDA_FIELDS).flatMap(([field, label]) => {
        const value = (summary || context)?.[field];
        return typeof value === 'string' && value.trim() ? [[field, label, value]] : [];
    });
}
export function labelSourceUrl(context) {
    try {
        const url = new URL(context?.source_url);
        return url.protocol === 'https:' && url.hostname === 'api.fda.gov' ? url.href : '';
    } catch { return ''; }
}
export function fdaContexts(fda) {
    if (!fda || typeof fda !== 'object') return [];
    return Array.isArray(fda.medications) && fda.medications.length
        ? fda.medications.filter(context => context && typeof context === 'object')
        : [fda];
}
export function summaryText(report) {
    const lines = ['MediSense — Document summary', report.isSample ? 'ILLUSTRATIVE SAMPLE — No patient data or live lookup' : '', report.title,
        `Document: ${report.fileName}`, `Type: ${report.type}`, report.clinic, report.date, '', 'IN PLAIN LANGUAGE',
        report.explanation || 'No summary was supplied with this document.'];
    if (report.markers.length) {
        lines.push('', 'LAB RESULTS');
        report.markers.forEach(marker => {
            const reference = referenceInfo(marker);
            lines.push(`${marker.test_name || 'Unnamed measurement'}: ${marker.observed_value ?? 'Not provided'} ${marker.unit || ''}`.trim(),
                `${reference.label}: ${reference.display} · ${STATUS_LABEL[markerStatus(marker)]}`);
            if (reference.isGeneral) lines.push(reference.note, `Guide source: ${reference.source}`);
            if (marker.clinical_meaning) lines.push(marker.clinical_meaning);
            lines.push('');
        });
    }
    if (report.medicines.length) {
        lines.push('', 'PRESCRIBED MEDICINES');
        report.medicines.forEach(medicine => {
            lines.push(medicine.brand_name || medicine.generic_name || 'Unnamed medicine');
            for (const [field, label] of [['generic_name', 'Generic name'], ['dosage', 'Dose'], ['form', 'Form'], ['frequency_instructions', 'Directions'], ['indication_summary', 'Purpose']]) {
                if (medicine[field]) lines.push(`${label}: ${medicine[field]}`);
            }
            lines.push('');
        });
    }
    if (report.specialist) {
        lines.push('', 'FOR YOUR NEXT CONVERSATION');
        for (const field of ['specialist_name', 'sub_title', 'department', 'urgency', 'reason']) if (report.specialist[field]) lines.push(report.specialist[field]);
        (Array.isArray(report.specialist.questions) ? report.specialist.questions : []).forEach((q, index) => lines.push(`${index + 1}. ${q}`));
    }
    if (report.fda && report.fda.information_status !== 'not_applicable') {
        lines.push('', isAIMedicineInformation(report.fda) ? 'MEDICINE INSIGHTS' : 'MEDICATION LABEL CONTEXT');
        fdaContexts(report.fda).forEach(context => {
            if (isAIMedicineInformation(context)) {
                lines.push(context.medicine_name || 'Medicine', context.generic_name || '', 'AI-generated general information; not independently verified or a complete medication label.');
                medicineInfoSections(context).forEach(([, label, value]) => lines.push(`${label}: ${value}`));
                if (context.information_status !== 'ready') lines.push(context.note || 'Medicine information is unavailable.');
                return;
            }
            lines.push(context.matched_brand || context.searched_term || 'Medication lookup');
            if (context.found === true) {
                lines.push(context.matched_generic || '', context.drug_class || '');
                if (labelSummary(context)) lines.push('AI summary of the matched label; not the complete medication label.');
                labelDisplayFields(context).forEach(([, label, value]) => lines.push(`${label}: ${value}`));
                if (context.source) lines.push(`Source: ${context.source}`);
                if (labelSourceUrl(context)) lines.push(`Full label: ${labelSourceUrl(context)}`);
            } else lines.push(context.note || 'No matching medication label information was supplied.');
        });
    }
    lines.push('', report.disclaimer);
    return lines.filter((line, i, all) => line || all[i - 1]).join('\n').trim();
}
export async function copySummary(text, navigatorObject = globalThis.navigator) {
    if (!navigatorObject?.clipboard?.writeText) throw new Error('Clipboard unavailable. Select and copy the summary below.');
    await navigatorObject.clipboard.writeText(text);
}
export async function shareSummary(report, navigatorObject = globalThis.navigator) {
    if (typeof navigatorObject?.share !== 'function') return 'unavailable';
    try { await navigatorObject.share({ title: `MediSense — ${report.title}`, text: summaryText(report) }); return 'shared'; }
    catch (error) { if (error?.name === 'AbortError') return 'cancelled'; throw error; }
}
export function downloadSummary(report) {
    const blob = new Blob([summaryText(report)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = `MediSense-${report.fileName.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 90) || 'summary'}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
