import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceInfo } from '../src/utils/referenceGuides.js';
import { markerRange, markerStatus, reportModel } from '../src/utils/resultsPresentation.js';
import { summaryText } from '../src/utils/reportExport.js';

test('the report interval always wins over a general guide and the original record is untouched', () => {
    const marker = { test_name: 'Sodium', unit: 'mmol/L', observed_value: '146', reference_range: '130 - 150' };
    const before = JSON.stringify(marker);
    assert.equal(referenceInfo(marker).isGeneral, false);
    assert.equal(referenceInfo(marker).display, '130 - 150');
    assert.equal(markerStatus(marker), 'NORMAL');
    assert.equal(JSON.stringify(marker), before);
});

test('missing intervals receive sourced adult guides only for matching test identities and units', () => {
    const marker = { test_name: 'Serum sodium', unit: 'mmol/L', observed_value: '140', reference_range: '', status: 'UNKNOWN' };
    const guide = referenceInfo(marker);
    assert.equal(guide.isGeneral, true);
    assert.equal(guide.display, '135 - 145');
    assert.match(guide.source, /^https:\/\/medlineplus.gov\//);
    assert.equal(markerRange(marker).labels[1], 'General adult guide');
    assert.equal(markerStatus(marker), 'UNKNOWN'); // no invented patient classification
    for (const invalid of [{ ...marker, unit: 'mg/dL' }, { ...marker, test_name: 'Urine sodium' }, { ...marker, unit: '' }]) {
        assert.equal(referenceInfo(invalid).isGeneral, false);
        assert.equal(markerRange(invalid), null);
    }
});

test('different WBC count scales get the correct guide and Unicode SI units are understood', () => {
    for (const unit of ['10^9/L', '×10⁹/L', '10^3/µL', '10³/μL']) {
        assert.equal(referenceInfo({ test_name: 'WBC', unit }).range, '4.5 - 11');
    }
    assert.equal(referenceInfo({ test_name: 'WBC', unit: 'cells/uL' }).range, '4500 - 11000');
    assert.equal(referenceInfo({ test_name: 'Creatinine', unit: 'µmol/L' }).range, null);
});

test('sex-dependent guides show both contexts without assuming sex or plotting one interval', () => {
    const marker = { test_name: 'Hemoglobin (Hgb)', unit: 'g/dL', observed_value: '12.5' };
    const guide = referenceInfo(marker);
    assert.ok(guide.display.includes('Adult male: 13.8 - 17.2'));
    assert.ok(guide.display.includes('adult female: 12.1 - 15.1'));
    assert.equal(markerRange(marker), null);
    assert.equal(markerStatus(marker), 'UNKNOWN');
});

test('unspecified glucose timing and unrelated measurements do not get a fasting interval', () => {
    for (const name of ['Glucose', 'Random blood glucose', 'Urine glucose', 'Unknown test']) {
        assert.equal(referenceInfo({ test_name: name, unit: 'mg/dL' }).isGeneral, false);
    }
    assert.equal(referenceInfo({ test_name: 'Fasting Blood Glucose', unit: 'mg/dL' }).range, '70 - 99');
});

test('print/share exports retain adult-guide attribution and distinguish printed lab references', () => {
    const text = summaryText(reportModel({ extracted_data: { biomarkers: [
        { test_name: 'Sodium', unit: 'mmol/L', observed_value: '140' },
        { test_name: 'WBC', unit: '10^9/L', observed_value: '6', reference_range: '5 - 10' },
    ] } }));
    assert.ok(text.includes('General adult guide: 135 - 145'));
    assert.ok(text.includes('Guide source: https://medlineplus.gov/'));
    assert.ok(text.includes('Lab reference: 5 - 10'));
});
