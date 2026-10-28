import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestDocumentAnalysis } from '../src/utils/uploadDocument.js';

class FakeXHR {
    static latest;
    constructor() { this.upload = {}; FakeXHR.latest = this; }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(name, value) { (this.headers ??= {})[name] = value; }
    send(data) { this.body = data; }
    abort() { this.onabort?.(); }
    respond(status, response) { this.status = status; this.response = response; this.onload(); }
}

function mockTransport(t) {
    const original = globalThis.XMLHttpRequest;
    globalThis.XMLHttpRequest = FakeXHR;
    t.after(() => {
        if (original === undefined) delete globalThis.XMLHttpRequest;
        else globalThis.XMLHttpRequest = original;
    });
}

test('transfer completion waits for analysis response and preserves multipart data', async t => {
    mockTransport(t);
    const formData = new FormData();
    formData.append('document_type', 'LAB_REPORT');
    const progress = []; let uploaded = false, resolved = false;
    const request = requestDocumentAnalysis({ url: '/api/analyze', formData,
        onUploadProgress: value => progress.push(value), onUploaded: () => { uploaded = true; },
    }).then(data => { resolved = true; return data; });
    const xhr = FakeXHR.latest;
    assert.equal(xhr.method, 'POST'); assert.equal(xhr.body, formData);
    xhr.upload.onprogress({ lengthComputable: true, loaded: 25, total: 100 });
    assert.deepEqual(progress, [25]);
    xhr.upload.onprogress({ lengthComputable: false });
    assert.equal(progress.at(-1), null);
    xhr.upload.onload();
    await Promise.resolve();
    assert.equal(uploaded, true); assert.equal(resolved, false);
    const result = { record_type: 'LAB_REPORT', simple_explanation: 'Fixture' };
    xhr.respond(200, result);
    assert.deepEqual(await request, result);
    assert.equal(xhr.upload.onprogress, null);
});

test('backend and network errors reject without reporting success', async t => {
    mockTransport(t);
    const rejected = requestDocumentAnalysis({ url: '/api/analyze', formData: new FormData() });
    FakeXHR.latest.respond(422, { detail: 'Document could not be read' });
    await assert.rejects(rejected, /Document could not be read/);
    const offline = requestDocumentAnalysis({ url: '/api/analyze', formData: new FormData() });
    FakeXHR.latest.onerror();
    await assert.rejects(offline, TypeError);
});

test('abort cancels the active request and clears callbacks', async t => {
    mockTransport(t);
    const controller = new AbortController();
    const request = requestDocumentAnalysis({ url: '/api/analyze', formData: new FormData(), signal: controller.signal });
    const xhr = FakeXHR.latest;
    controller.abort();
    await assert.rejects(request, { name: 'AbortError' });
    assert.equal(xhr.onload, null); assert.equal(xhr.upload.onload, null);
});

test('progress uploads carry the same private history capability and a bounded timeout', async t => {
    mockTransport(t);
    const request = requestDocumentAnalysis({ url: '/api/analyze', formData: new FormData(), headers: { 'X-Client-Token': 'a'.repeat(64) } });
    const xhr = FakeXHR.latest;
    assert.equal(xhr.headers['X-Client-Token'], 'a'.repeat(64));
    assert.equal(xhr.timeout, 120000);
    xhr.respond(200, { id: 1 });
    assert.deepEqual(await request, { id: 1 });
});
