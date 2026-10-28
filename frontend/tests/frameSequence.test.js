import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameBuffer, createFrameSource, heroFrameUrl, progressToFrame } from '../src/utils/frameSequence.js';
import { CARD_STAGES, cardProgress } from '../src/utils/heroTimeline.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

test('sequence maps forward and reverse scroll to the same source frame', () => {
  assert.equal(heroFrameUrl(0), '/hero-frames/ezgif-frame-001.jpg');
  assert.equal(heroFrameUrl(239), '/hero-frames/ezgif-frame-240.jpg');
  assert.equal(progressToFrame(-1), 0);
  assert.equal(progressToFrame(2), 239);
  const path = [0, .1, .46, .73, .99, 1];
  assert.deepEqual([...path].reverse().map(p => progressToFrame(p)).reverse(), path.map(p => progressToFrame(p)));
  assert.deepEqual(CARD_STAGES.map((_, i) => cardProgress(0, i)), [0, 0, 0]);
  assert.deepEqual(CARD_STAGES.map((_, i) => cardProgress(1, i)), [1, 1, 1]);
});

test('compressed frames download once and are reused when scrolling backward', async () => {
  const loads = [];
  const source = createFrameSource({ count: 24, concurrency: 3,
    fetchFrame: async index => { loads.push(index); return { index }; },
  });
  source.warm();
  await flush();
  assert.equal(source.size(), 24);
  for (const index of [23, 7, 12, 0, 22, 2]) {
    assert.deepEqual(await source.get(index), { index });
  }
  await flush();
  assert.equal(loads.length, 24);
  assert.equal(new Set(loads).size, 24);
  source.dispose();
  assert.equal(source.size(), 0);
});

test('a foreground target bypasses a busy background download queue', async () => {
  const resolve = new Map(), started = [];
  const source = createFrameSource({ count: 240, concurrency: 2,
    fetchFrame: index => new Promise(done => { started.push(index); resolve.set(index, done); }),
  });
  source.warm();
  await flush();
  const urgent = source.get(150);
  await flush();
  assert.deepEqual(started, [0, 1, 150]);
  resolve.get(150)({ index: 150 });
  assert.deepEqual(await urgent, { index: 150 });
  source.dispose();
  for (const done of resolve.values()) done({});
  await flush();
});

test('decoded working set stays bounded while scrubbing and releases on disposal', async () => {
  const images = [];
  const buffer = createFrameBuffer({ count: 240, capacity: 6, concurrency: 2,
    load: async index => {
      const image = { index, closed: false, close() { this.closed = true; } };
      images.push(image);
      return image;
    }, onLoad() {},
  });
  let previous = 0;
  for (const target of [0, 3, 50, 239, 120, 0]) {
    buffer.target(target);
    await flush();
    assert.ok(buffer.get(target), `target ${target} is decoded`);
    assert.ok(buffer.get(previous), 'the previous displayed frame remains available during a jump');
    assert.ok(images.filter(image => !image.closed).length <= 6);
    buffer.pin(target);
    previous = target;
  }
  buffer.dispose();
  assert.ok(images.every(image => image.closed));
});

test('large jumps abort stale loads and give the latest target priority', async () => {
  const requests = [];
  const completions = [];
  const buffer = createFrameBuffer({ count: 240, capacity: 6, concurrency: 2,
    load: (index, signal) => new Promise((resolve, reject) => {
      requests.push({ index, signal, resolve });
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }), onLoad: index => completions.push(index),
  });
  buffer.target(0);
  await flush();
  buffer.target(200);
  await flush();
  assert.ok(requests.find(request => request.index === 1).signal.aborted);
  const current = requests.find(request => request.index === 200);
  assert.ok(current, 'latest target starts before its neighbors');
  current.resolve({ close() {} });
  await flush();
  assert.ok(buffer.get(200));
  assert.deepEqual(completions, [200]);
  buffer.dispose();
  for (const request of requests) request.resolve({ close() {} });
  await flush();
  assert.deepEqual(completions, [200]);
});
