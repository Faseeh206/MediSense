import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOLIO_DURATION, FOLIO_REST, folioPoseAt, startFolioMotion } from '../src/brand/folioMotion.js';

function surface() {
    const timers = new Map(); let nextTimer = 0;
    const eventTarget = () => ({ handlers: new Map(),
        addEventListener(name, callback) { this.handlers.set(name, callback); },
        removeEventListener(name) { this.handlers.delete(name); },
        fire(name, event = {}) { this.handlers.get(name)?.(event); },
    });
    const attributes = initial => ({ attrs: new Map(Object.entries(initial)),
        setAttribute(name, value) { this.attrs.set(name, value); },
        getAttribute(name) { return this.attrs.get(name) ?? null; },
        removeAttribute(name) { this.attrs.delete(name); },
    });
    const icon = attributes({ href: '/brand/favicon.svg', type: 'image/svg+xml', sizes: 'any' });
    const animations = [0,1].map(() => ({ currentTime: 0, playState: 'running',
        pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; }, cancel() { this.playState = 'idle'; },
    }));
    const doc = { ...eventTarget(), hidden: false, timeline: { currentTime: 1000 },
        getElementById: () => icon,
        defaultView: { matchMedia: () => ({ matches: true }),
            setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
            clearTimeout(id) { timers.delete(id); },
        },
    };
    const root = { ...eventTarget(), ...attributes({}), ownerDocument: doc, keyboardFocus: false,
        querySelectorAll: () => animations.map(animation => ({ animate: () => animation })),
        matches(selector) { return selector === ':focus-visible' && this.keyboardFocus; },
    };
    const renderIcon = time => ({ url: `data:icon-${time}`, frame: time });
    return { root, doc, icon, animations, timers, renderIcon };
}

test('Folio always settles into the approved master and remains cyclic and bounded', () => {
    assert.deepEqual(folioPoseAt(0), { left: 1, right: 1 });
    assert.deepEqual(folioPoseAt(FOLIO_DURATION), folioPoseAt(0));
    assert.equal(FOLIO_REST, 3000);
    for (const time of [0, 1000, 2000, FOLIO_REST]) {
        assert.deepEqual(folioPoseAt(time), { left: 1, right: 1 });
    }
    assert.ok(folioPoseAt(FOLIO_REST + 300).right < 1);
    const folded = folioPoseAt(FOLIO_REST + 600);
    assert.ok(Math.abs(folded.left - .86) < 1e-10 && Math.abs(folded.right - .58) < 1e-10);
    for (let time = 0; time < FOLIO_DURATION; time += 17) {
        const pose = folioPoseAt(time), repeated = folioPoseAt(time + FOLIO_DURATION);
        assert.ok(pose.left >= .86 - 1e-10 && pose.left <= 1);
        assert.ok(pose.right >= .58 - 1e-10 && pose.right <= 1);
        assert.ok(Math.abs(pose.left - repeated.left) < 1e-10);
        assert.ok(Math.abs(pose.right - repeated.right) < 1e-10);
    }
});

test('hover freezes both leaves and favicon; resume preserves phase; cleanup restores the fallback', () => {
    const s = surface();
    const dispose = startFolioMotion(s.root, { renderIcon: s.renderIcon });
    s.animations[0].currentTime = 2370; s.animations[1].currentTime = 2360;
    s.root.fire('pointerenter', { pointerType: 'mouse' });
    assert.equal(s.root.getAttribute('data-brand-motion'), 'paused');
    assert.equal(s.timers.size, 0);
    assert.ok(s.animations.every(a => a.currentTime === 2370 && a.playState === 'paused'));
    assert.equal(s.icon.getAttribute('href'), 'data:icon-2370');
    s.doc.timeline.currentTime = 5000;
    s.root.fire('pointerleave');
    assert.ok(s.animations.every(a => a.startTime === 2630 && a.playState === 'running'));
    assert.equal(s.timers.size, 1);
    dispose();
    assert.equal(s.icon.getAttribute('href'), '/brand/favicon.svg');
    assert.equal(s.icon.getAttribute('type'), 'image/svg+xml');
    assert.equal(s.timers.size, 0); assert.equal(s.root.handlers.size, 0); assert.equal(s.doc.handlers.size, 0);
    assert.ok(s.animations.every(a => a.playState === 'idle'));
});

test('keyboard/background holds compose; touch does not leave a sticky hover', () => {
    const s = surface();
    const dispose = startFolioMotion(s.root, { renderIcon: s.renderIcon });
    s.root.fire('pointerenter', { pointerType: 'touch' });
    assert.equal(s.root.getAttribute('data-brand-motion'), 'running');
    s.root.keyboardFocus = true; s.root.fire('focus');
    s.root.fire('pointerenter', { pointerType: 'mouse' }); s.root.fire('pointerleave');
    assert.equal(s.root.getAttribute('data-pause-reason'), 'focus');
    s.doc.hidden = true; s.doc.fire('visibilitychange'); s.root.fire('blur');
    assert.equal(s.root.getAttribute('data-brand-motion'), 'paused');
    s.doc.hidden = false; s.doc.fire('visibilitychange');
    assert.equal(s.root.getAttribute('data-brand-motion'), 'running');
    dispose();
});

test('reduced motion creates no animations or favicon timer', () => {
    const s = surface();
    const dispose = startFolioMotion(s.root, { reduced: true, renderIcon: s.renderIcon });
    assert.equal(s.root.getAttribute('data-brand-motion'), 'static');
    assert.equal(s.icon.getAttribute('href'), '/brand/favicon.svg');
    assert.equal(s.timers.size, 0); assert.equal(s.root.handlers.size, 0);
    dispose();
});

test('an unavailable favicon encoder keeps the fallback and leaves the logo usable', () => {
    const s = surface();
    const dispose = startFolioMotion(s.root, { renderIcon: () => { throw new Error('Canvas unavailable'); } });
    assert.equal(s.root.getAttribute('data-brand-motion'), 'running');
    assert.equal(s.icon.getAttribute('href'), '/brand/favicon.svg');
    assert.equal(s.timers.size, 0);
    s.root.fire('pointerenter', { pointerType: 'mouse' });
    assert.equal(s.root.getAttribute('data-brand-motion'), 'paused');
    dispose();
});
