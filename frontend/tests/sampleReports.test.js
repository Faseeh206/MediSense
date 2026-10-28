import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSampleReport } from '../src/utils/sampleReports.js';
import { SAMPLES } from '../src/utils/constants.js';

test('each displayed sample opens its matching complete report', async () => {
    const expected = [
        ['sample_lipid_glucose', 'LAB_REPORT', 'Fasting Blood Glucose', '118'],
        ['sample_cbc_anemia', 'LAB_REPORT', 'Hemoglobin (Hgb)', '10.4'],
        ['sample_prescription_metformin', 'PRESCRIPTION', 'Metformin Hydrochloride'],
        ['sample_prescription_amoxicillin', 'PRESCRIPTION', 'Amoxicillin'],
    ];
    assert.equal(SAMPLES.length, expected.length);
    for (const [key, type, marker, value] of expected) {
        assert.ok(SAMPLES.some(sample => sample.key === key));
        const report = await getSampleReport(key);
        assert.equal(report.sample_key, key);
        assert.equal(report.record_type, type);
        assert.equal(report.is_sample, true);
        assert.ok(report.simple_explanation.length > 50);
        assert.ok(report.specialist_recommendation.questions.length > 0);
        if (type === 'LAB_REPORT') {
            assert.equal(report.extracted_data.biomarkers.find(row => row.test_name === marker).observed_value, value);
            assert.equal(report.extracted_data.medicines.length, 0);
        } else {
            assert.ok(report.extracted_data.medicines.some(row => row.generic_name === marker));
            assert.equal(report.extracted_data.biomarkers.length, 0);
            assert.equal(report.api_enriched_data.found, true);
        }
    }
});

test('opening a sample returns an independent copy and rejects unknown keys', async () => {
    const first = await getSampleReport('sample_lipid_glucose');
    first.extracted_data.biomarkers[0].observed_value = 'changed';
    assert.equal((await getSampleReport('sample_lipid_glucose')).extracted_data.biomarkers[0].observed_value, '118');
    await assert.rejects(getSampleReport('__proto__'), /Unknown sample/);
    await assert.rejects(getSampleReport('missing'), /Unknown sample/);
});
