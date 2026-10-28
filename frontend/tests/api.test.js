import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchHealth, fetchHistory, fetchHistoryRecord, deleteHistoryRecord, uploadAndAnalyze } from '../src/utils/api.js';

test('health, history and ordinary uploads use one private capability with same-origin API URLs', async t => {
    const previous = globalThis.fetch, calls = [];
    t.after(() => { globalThis.fetch = previous; });
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => url === '/api/history' ? [] : { id: 9 } };
    };
    await fetchHealth(); await fetchHistory(); await fetchHistoryRecord(9); await deleteHistoryRecord(9);
    await uploadAndAnalyze({ file: new File(['synthetic'], 'test.pdf', { type: 'application/pdf' }), documentType: 'LAB_REPORT' });
    assert.deepEqual(calls.map(call => call.url), ['/api/health','/api/history','/api/history/9','/api/history/9','/api/analyze']);
    const token = calls[0].options.headers['X-Client-Token'];
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.ok(calls.every(call => call.options.headers['X-Client-Token'] === token));
    assert.equal(calls[3].options.method, 'DELETE');
    assert.equal(calls[4].options.body.get('document_type'), 'LAB_REPORT');
    assert.equal(calls[4].options.body.get('file').name, 'test.pdf');
});

test('API errors remain actionable and HTML or malformed history never masquerades as records', async t => {
    const previous = globalThis.fetch;
    t.after(() => { globalThis.fetch = previous; });
    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({ detail: 'Analysis service unavailable' }) });
    await assert.rejects(fetchHealth(), /Analysis service unavailable/);
    globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError('HTML instead of JSON'); } });
    await assert.rejects(fetchHistory(), /unreadable response/);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ records: [] }) });
    await assert.rejects(fetchHistory(), /saved history could not be read/);
});
