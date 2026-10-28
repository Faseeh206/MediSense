import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAD_COUNT, CARD_STAGES, beadState, cardProgress, sceneState, insidePoint } from '../src/utils/heroTimeline.js';

const snapshot = p => ({
  scene: sceneState(p),
  beads: Array.from({ length: BEAD_COUNT }, (_, i) => beadState(i, p)),
  cards: CARD_STAGES.map((_, i) => cardProgress(p, i)),
});

test('opening has a closed capsule, every bead inside, and no cards', () => {
  assert.equal(sceneState(0).opening, 0);
  assert.deepEqual(snapshot(0).cards, [0, 0, 0]);
  for (let i = 0; i < BEAD_COUNT; i++) {
    const bead = beadState(i, 0);
    assert.deepEqual(bead.position, insidePoint(i));
    assert.equal(bead.visible, true);
    // Undo the capsule's diagonal rotation and test its enclosing profile.
    const [x, y, z] = bead.position;
    const localX = x * Math.cos(.56) + y * Math.sin(.56);
    const localY = -x * Math.sin(.56) + y * Math.cos(.56);
    const radial = Math.hypot(localX, z) + bead.scale;
    assert.ok(radial < .68);
    assert.ok(Math.hypot(radial, Math.max(0, Math.abs(localY) - .94)) < .68);
  }
});

test('cards form in order with a complete pause before the next group', () => {
  for (let i = 0; i < CARD_STAGES.length; i++) {
    const start = CARD_STAGES[i].start;
    assert.equal(cardProgress(start + .08, i), 0);
    assert.equal(cardProgress(start + .15, i), 1);
    for (let j = i + 1; j < 3; j++) assert.equal(cardProgress(start + .15, j), 0);
  }
});

test('fast jumps and reverse traversal reproduce the exact same state', () => {
  const positions = [0, .12, .34, .45, .58, .69, .84, .93, 1];
  const forward = positions.map(snapshot);
  snapshot(.99); snapshot(.01); snapshot(.77);
  const reverse = [...positions].reverse().map(snapshot).reverse();
  assert.deepEqual(reverse, forward);
});

test('bead positions remain continuous at release, breakaway, and fusion', () => {
  const boundaries = [.15, .31, .342, ...CARD_STAGES.flatMap(c => [c.start, c.start + .08, c.start + .11])];
  for (let i = 0; i < BEAD_COUNT; i++) {
    for (const p of boundaries) {
      const a = beadState(i, p - 1e-7), b = beadState(i, p + 1e-7);
      assert.ok(Math.hypot(...a.position.map((n, j) => n - b.position[j])) < 1e-4);
      assert.ok(Math.abs(a.scale - b.scale) < 1e-4);
    }
  }
});

test('only the nine fused beads disappear; all other beads keep their orbits', () => {
  for (let i = 0; i < BEAD_COUNT; i++) {
    assert.equal(beadState(i, 1).visible, i >= 9);
    if (i >= 9) assert.notDeepEqual(beadState(i, .9).position, beadState(i, 1).position);
  }
  assert.deepEqual(snapshot(1).cards, [1, 1, 1]);
});

test('dense sampling contains no invalid coordinates or scales', () => {
  for (let step = 0; step <= 1000; step++) {
    for (const bead of snapshot(step / 1000).beads) {
      assert.ok(bead.position.every(Number.isFinite));
      assert.ok(Number.isFinite(bead.scale) && bead.scale >= 0);
    }
  }
  assert.deepEqual(snapshot(-1), snapshot(0));
  assert.deepEqual(snapshot(2), snapshot(1));
});
