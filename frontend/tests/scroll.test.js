import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerScroller, scrollToElement } from '../src/utils/scroll.js';

const originals = new Map(['window', 'document', 'getComputedStyle'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
afterEach(() => {
    registerScroller(null);
    originals.forEach((descriptor, key) => {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    });
});

function scene(padding, margin = '0px') {
    const root = {}, target = { getBoundingClientRect: () => ({ top: 1800 }) };
    globalThis.window = { scrollY: 700 };
    globalThis.document = { documentElement: root, getElementById: id => id === 'destination' ? target : null };
    globalThis.getComputedStyle = element => element === root ? { scrollPaddingTop: padding } : { scrollMarginTop: margin };
}

test('section buttons apply the CSS header clearance once at desktop and phone widths', () => {
    const calls = [];
    registerScroller({ scrollTo: (top, options) => calls.push({ top, options }) });
    scene('80px'); scrollToElement('destination');
    scene('76px'); scrollToElement('destination');
    assert.deepEqual(calls.map(call => call.top), [2420, 2424]);
});

test('a pinned chapter can reserve header clearance inside its own stage', () => {
    scene('80px', '-80px');
    let top;
    registerScroller({ scrollTo: value => { top = value; } });
    scrollToElement('destination');
    assert.equal(top, 2500);
});

test('the native reduced-motion path uses the same destination and missing targets do nothing', () => {
    scene('76px');
    const calls = [];
    window.scrollTo = options => calls.push(options);
    scrollToElement('destination', true);
    scrollToElement('missing', true);
    assert.deepEqual(calls, [{ top: 2424, behavior: 'instant' }]);
});
