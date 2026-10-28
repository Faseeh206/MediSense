import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyRows, parseScanDate } from '../src/utils/historyPresentation.js';

test('timezone-less backend timestamps remain UTC across the local day boundary', () => {
    assert.equal(parseScanDate('2026-10-26T20:15:00.000000').toISOString(), '2026-10-26T20:15:00.000Z');
    assert.equal(parseScanDate('2026-10-27T01:15:00+05:00').toISOString(), '2026-10-26T20:15:00.000Z');
    const records = [
        { id: 1, file_name: 'report.pdf', record_type: 'LAB_REPORT', created_at: '2026-10-26T20:15:00' },
        { id: 2, file_name: 'prescription.png', record_type: 'PRESCRIPTION', created_at: '2026-10-26T13:00:00Z' },
    ];
    const rows = historyRows(records, { now: new Date('2026-10-27T05:00:00Z'), timeZone: 'Asia/Karachi' });
    assert.equal(rows[0].group, 'Today');
    assert.match(rows[0].date, /1:15 am/);
    assert.equal(rows[1].group, 'Yesterday');
    assert.equal(rows[0].record, records[0]);
});

test('incomplete records show honest fallbacks without inventing a type or scan date', () => {
    const [row] = historyRows([{ id: 7, created_at: 'not-a-date', record_type: 'UNKNOWN' }]);
    assert.equal(row.label, 'Document');
    assert.equal(row.name, 'Untitled document');
    assert.equal(row.date, 'Date unavailable');
    assert.equal(row.dateTime, null);
    assert.equal(parseScanDate(null), null);
    assert.equal(historyRows([{ record_type: 'constructor' }])[0].label, 'Document');
    assert.equal(historyRows([{ file_name: 'C:\\reports\\a-long-report.pdf', record_type: 'LAB_REPORT' }])[0].name, 'a-long-report.pdf');
});
