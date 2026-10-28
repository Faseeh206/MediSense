import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterMarkers, markerRange, markerStatus, numericValue, parseReferenceRange, reportModel } from '../src/utils/resultsPresentation.js';
import { copySummary, shareSummary, summaryText, labelSummary, labelSourceUrl, medicineInfoSections } from '../src/utils/reportExport.js';
import { getSampleReport } from '../src/utils/sampleReports.js';

test('attention filter distinguishes supplied aliases, reference-inferred results and unclassified measurements', () => {
    const markers = [
        { status: ' normal ' }, { status: ' high ' }, { status: 'below range' }, { status: 'critical' },
        { observed_value: '118', reference_range: '70 - 99' }, { observed_value: '52', reference_range: '> 40' },
        { observed_value: 'Not detected', reference_range: 'See lab note' }, { status: 'out-of-range' },
    ];
    assert.equal(filterMarkers(markers).length, 8);
    assert.equal(filterMarkers(markers, 'ATTENTION').length, 5);
    assert.equal(markerStatus(markers[0]), 'NORMAL');
    assert.equal(markerStatus(markers[6]), 'UNKNOWN');
    assert.equal(markerStatus({}), 'UNKNOWN');
});
test('range parsing preserves negative values, decimals, scientific notation and strict one-sided limits', () => {
    assert.deepEqual(parseReferenceRange('-5 – -1'), { kind: 'interval', low: -5, high: -1 });
    assert.deepEqual(parseReferenceRange('0.70 - 1.30'), { kind: 'interval', low: .7, high: 1.3 });
    assert.equal(markerStatus({ observed_value: 200, reference_range: '< 200' }), 'HIGH');
    assert.equal(markerStatus({ observed_value: 200, reference_range: '≤ 200' }), 'NORMAL');
    assert.equal(markerStatus({ observed_value: 40, reference_range: '> 40' }), 'LOW');
    assert.equal(markerStatus({ observed_value: 40, reference_range: '>= 40' }), 'NORMAL');
    assert.equal(numericValue('1,250'), 1250);
    assert.equal(numericValue('2.5e2'), 250);
    assert.equal(numericValue('<5'), null);
    assert.equal(numericValue(''), null);
    assert.equal(parseReferenceRange('12 - 12'), null);
    assert.equal(parseReferenceRange('See clinical note'), null);
});
test('range marker tracks the observed value instead of assigning every status the same invented midpoint', () => {
    const a = markerRange({ observed_value: 71, reference_range: '70 - 99' });
    const b = markerRange({ observed_value: 97, reference_range: '70 - 99' });
    assert.ok(a.position < b.position);
    assert.equal(a.start, 25); assert.equal(a.end, 75);
    const outside = markerRange({ observed_value: 10000, reference_range: '70 - 99' });
    assert.equal(outside.position, 98); assert.equal(outside.clipped, true);
    assert.equal(markerRange({ observed_value: 'Positive', reference_range: 'Negative' }), null);
    assert.equal(markerRange({ observed_value: 7 }), null);
    assert.equal(markerRange({ observed_value: 52, reference_range: '>40' }).end, 100);
    assert.equal(markerRange({ observed_value: 238, reference_range: '<200' }).start, 0);
});
test('every bundled report exports all measurements, medicine directions, source context and questions independently of the screen filter', async () => {
    for (const key of ['sample_lipid_glucose','sample_cbc_anemia','sample_prescription_metformin','sample_prescription_amoxicillin']) {
        const report = reportModel(await getSampleReport(key)), text = summaryText(report);
        assert.match(text, /ILLUSTRATIVE SAMPLE/);
        assert.ok(text.includes(report.title));
        assert.ok(text.includes(report.disclaimer));
        for (const marker of report.markers) { assert.ok(text.includes(marker.test_name)); assert.ok(text.includes(String(marker.observed_value))); }
        for (const medicine of report.medicines) assert.ok(text.includes(medicine.frequency_instructions));
        for (const q of report.specialist.questions) assert.ok(text.includes(q));
        if (report.fda.boxed_warning) assert.ok(text.includes(report.fda.boxed_warning));
    }
    const report = reportModel(await getSampleReport('sample_lipid_glucose'));
    assert.equal(report.markers.length, 6); assert.equal(report.attention.length, 4);
    filterMarkers(report.markers, 'ATTENTION');
    assert.ok(summaryText(report).includes('Serum Creatinine'));
});
test('missing metadata stays absent and incomplete records do not become fabricated facilities or normal results', () => {
    const report = reportModel({ extracted_data: { biomarkers: [{ test_name: 'Unknown marker' }] }, created_at: 'invalid' });
    assert.equal(report.clinic, ''); assert.equal(report.date, '');
    assert.equal(report.type, 'Document');
    assert.equal(report.normal.length, 0); assert.equal(report.unknown.length, 1);
    assert.match(summaryText(report), /Not provided/);
    assert.doesNotMatch(summaryText(report), /Clinical Diagnostic Facility|undefined|6th.Grade/);
});
test('sharing sends real report content with no pretend landing-page report URL', async () => {
    const report = reportModel(await getSampleReport('sample_lipid_glucose'));
    let payload;
    assert.equal(await shareSummary(report, { share: async value => { payload = value; } }), 'shared');
    assert.ok(payload.text.includes('Fasting Blood Glucose: 118 mg/dL'));
    assert.ok(payload.text.includes('Serum Creatinine'));
    assert.equal(Object.hasOwn(payload, 'url'), false);
    assert.equal(await shareSummary(report, {}), 'unavailable');
});
test('native share cancellation is silent while real failures remain actionable', async () => {
    const report = reportModel({});
    assert.equal(await shareSummary(report, { share: async () => { throw new DOMException('Cancelled', 'AbortError'); } }), 'cancelled');
    await assert.rejects(shareSummary(report, { share: async () => { throw new DOMException('Blocked', 'NotAllowedError'); } }), /Blocked/);
});
test('copy is awaited and never reports a rejected clipboard write as success', async () => {
    let copied;
    await copySummary('actual summary', { clipboard: { writeText: async text => { copied = text; } } });
    assert.equal(copied, 'actual summary');
    await assert.rejects(copySummary('text', { clipboard: { writeText: async () => { throw new Error('denied'); } } }), /denied/);
    await assert.rejects(copySummary('text', {}), /Select and copy/);
});

test('multi-medicine summaries retain each lookup, including medicines whose labels were unavailable', () => {
    const report = reportModel({ api_enriched_data: { found: true, searched_term: 'First', medications: [
        { found: true, matched_brand: 'First', official_uses: 'First source use', source: 'openFDA drug label API' },
        { found: true, matched_brand: 'Second', safety_warnings: 'Second source warning', source: 'openFDA drug label API' },
        { found: false, searched_term: 'Third', note: 'Third lookup unavailable' },
    ] } });
    const text = summaryText(report);
    assert.ok(text.includes('First source use'));
    assert.ok(text.includes('Second source warning'));
    assert.ok(text.includes('Third lookup unavailable'));
    assert.equal(text.match(/First source use/g).length, 1);
});

test('print/share summaries use concise label text and retain a prominent boxed warning plus source access', () => {
    const context = { found: true, summary_status: 'ready', official_uses: 'Long original label '.repeat(100), boxed_warning: 'Long original boxed warning '.repeat(50),
        patient_summary: { official_uses: 'Concise source-backed use.', boxed_warning: 'Concise serious warning.' },
        source_url: 'https://api.fda.gov/drug/label.json?search=fixture', source: 'openFDA drug label API' };
    const text = summaryText(reportModel({ api_enriched_data: context }));
    assert.ok(text.includes('Concise source-backed use.'));
    assert.ok(text.includes('Serious boxed warning: Concise serious warning.'));
    assert.ok(text.includes('AI summary of the matched label'));
    assert.ok(text.includes('https://api.fda.gov/drug/label.json?search=fixture'));
    assert.ok(!text.includes('Long original label'));
    assert.equal(context.official_uses.length > 1000, true);
});

test('an incomplete summary cannot conceal a source boxed warning and source links are restricted to the API', () => {
    const context = { found: true, summary_status: 'ready', boxed_warning: 'Original serious warning', patient_summary: { official_uses: 'Incomplete' } };
    assert.equal(labelSummary(context), null);
    assert.ok(summaryText(reportModel({ api_enriched_data: context })).includes('Original serious warning'));
    for (const url of ['javascript:alert(1)', 'https://api.fda.gov.evil.invalid/', 'http://api.fda.gov/', 'https://other.invalid/']) {
        assert.equal(labelSourceUrl({ source_url: url }), '');
    }
});

test('Gemini medicine explanations are exported separately from exact directions without verification claims', () => {
    const context = { provider: 'gemini', information_status: 'ready', medicine_name: 'Synthetic medicine', found: true,
        patient_information: { uses: 'A concise fictional use.', important_warnings: 'A concise fictional warning.' } };
    const text = summaryText(reportModel({ extracted_data: { medicines: [{ brand_name: 'Synthetic medicine', frequency_instructions: 'Exact original directions.' }] }, api_enriched_data: context }));
    assert.equal(medicineInfoSections(context).length, 2);
    assert.ok(text.includes('Exact original directions.'));
    assert.ok(text.includes('A concise fictional use.'));
    assert.ok(text.includes('not independently verified'));
    assert.ok(!text.includes('FDA') && !text.includes('matched label'));
    assert.doesNotMatch(text, /Gemini|Google/i);
    assert.deepEqual(medicineInfoSections({ ...context, information_status: 'uncertain' }), []);
});
