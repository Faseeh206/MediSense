import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClientIdentity } from '../src/utils/clientIdentity.js';

test('private history capability survives a reload and cannot be overridden by other request headers', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const first = createClientIdentity({ storage });
    const token = first.getToken();
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(createClientIdentity({ storage }).getToken(), token);
    assert.deepEqual(first.getHeaders({ 'Content-Type': 'application/json', 'X-Client-Token': 'injected' }), {
        'Content-Type': 'application/json', 'X-Client-Token': token,
    });
    assert.notEqual(createClientIdentity({ storage: null }).getToken(), token);
});

test('blocked storage keeps one identity for the page and invalid stored identities are replaced', () => {
    const blocked = { getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); } };
    const session = createClientIdentity({ storage: blocked });
    assert.equal(session.getToken(), session.getToken());
    assert.match(session.getToken(), /^[a-f0-9]{64}$/);
    const invalid = createClientIdentity({ storage: { getItem: () => '123', setItem() {} } });
    assert.notEqual(invalid.getToken(), '123');
});

test('an unavailable secure random generator fails instead of creating guessable history credentials', () => {
    const identity = createClientIdentity({ storage: null, cryptoObject: {} });
    assert.throws(() => identity.getToken(), /Secure browser/);
});
