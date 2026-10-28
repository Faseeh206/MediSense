import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChapterDepth, SCROLL_LINK_MOTION } from '../src/utils/siteMotion.js';

test('clinical artwork is centered at each panel and uses a paused scroll playhead', () => {
    const targets = [{ y: 0 }, { y: 0 }, { y: 0 }];
    const timeline = createChapterDepth(targets);
    try {
        timeline.seek(0, true);
        assert.deepEqual(targets.map(target => target.y), [0, 24, 24]);
        timeline.seek(500, true);
        assert.deepEqual(targets.map(target => target.y), [-24, 0, 24]);
        timeline.seek(1000, true);
        assert.deepEqual(targets.map(target => target.y), [-24, -24, 0]);
        assert.equal(timeline.paused, true);
    } finally { timeline.revert(); }
});

test('fast jumps and reverse scrolling reproduce identical artwork positions', () => {
    const targets = [{ y: 0 }, { y: 0 }, { y: 0 }];
    const timeline = createChapterDepth(targets);
    try {
        const poses = new Map();
        for (const progress of [0, 0.15, 0.45, 0.75, 1]) {
            timeline.seek(progress * timeline.duration, true);
            poses.set(progress, targets.map(target => target.y));
        }
        for (const progress of [1, 0.15, 0.75, 0, 0.45]) {
            timeline.seek(progress * timeline.duration, true);
            assert.deepEqual(targets.map(target => target.y), poses.get(progress));
        }
    } finally { timeline.revert(); }
    assert.equal(timeline.cancelled, true);
});

test('anchor glides settle at their destination with bounded, non-overshooting easing', () => {
    assert.equal(SCROLL_LINK_MOTION.lerp, 0);
    assert.equal(SCROLL_LINK_MOTION.easing(0), 0);
    assert.equal(SCROLL_LINK_MOTION.easing(1), 1);
    for (let step = 0; step <= 100; step++) {
        const value = SCROLL_LINK_MOTION.easing(step / 100);
        assert.ok(value >= 0 && value <= 1);
    }
});
