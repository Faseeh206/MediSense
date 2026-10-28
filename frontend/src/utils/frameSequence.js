export const HERO_FRAME_COUNT = 240;
export const heroFrameUrl = index => `/hero-frames/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;
export const progressToFrame = (progress, count = HERO_FRAME_COUNT) =>
  Math.round(Math.max(0, Math.min(1, progress)) * (count - 1));

const release = image => {
  if (typeof image.close === 'function') image.close();
  else if ('src' in image) image.src = '';
};

// Only the working window is decoded. Compressed responses can stay in the
// browser's HTTP cache, without keeping 240 full-size images in memory.
export function createFrameBuffer({ count, load, onLoad, onError, capacity = 20, concurrency = 3, lookAhead = 8, lookBehind = 8 }) {
  const cache = new Map();
  const pending = new Map();
  const failed = new Set();
  let target = 0, pinned = 0, direction = 1, disposed = false, wanted = [0];

  function evict() {
    while (cache.size > capacity) {
      const victim = [...cache.keys()].find(index => index !== target && index !== pinned && index !== 0);
      if (victim === undefined) break;
      release(cache.get(victim));
      cache.delete(victim);
    }
  }

  function pump() {
    if (disposed) return;
    for (const index of wanted) {
      if (pending.size >= concurrency) break;
      if (cache.has(index) || pending.has(index) || failed.has(index)) continue;
      const controller = new AbortController();
      pending.set(index, controller);
      Promise.resolve().then(() => load(index, controller.signal)).then(image => {
        if (disposed || controller.signal.aborted) { release(image); return; }
        cache.set(index, image);
        evict();
        onLoad(index);
      }).catch(error => {
        if (disposed || controller.signal.aborted) return;
        failed.add(index);
        onError?.(index, error);
      }).finally(() => {
        pending.delete(index);
        pump();
      });
    }
  }

  return {
    target(index) {
      index = Math.max(0, Math.min(count - 1, Math.round(index)));
      if (index !== target) direction = Math.sign(index - target);
      target = index;
      const plan = [target];
      for (let distance = 1; distance <= Math.max(lookAhead, lookBehind); distance++) {
        if (distance <= lookAhead) plan.push(target + distance * direction);
        if (distance <= lookBehind) plan.push(target - distance * direction);
      }
      // Distant anchors make a large scrollbar jump useful before its neighbors load.
      plan.push(0, count - 1, Math.round((count - 1) / 2));
      // Reserve one slot for the last displayed image during a distant jump.
      wanted = [...new Set([target, 0, ...plan])].filter(n => n >= 0 && n < count).slice(0, capacity - 1);
      for (const [n, controller] of pending) {
        if (Math.abs(n - target) > Math.max(24, lookAhead + 8) && n !== 0) controller.abort();
      }
      pump();
    },
    get(index) {
      const image = cache.get(index);
      if (image) { cache.delete(index); cache.set(index, image); }
      return image;
    },
    pin(index) { pinned = index; evict(); },
    nearest(index) {
      let nearest;
      for (const candidate of cache.keys()) {
        if (nearest === undefined || Math.abs(candidate - index) < Math.abs(nearest - index)) nearest = candidate;
      }
      return nearest;
    },
    size() { return cache.size; },
    dispose() {
      disposed = true;
      for (const controller of pending.values()) controller.abort();
      for (const image of cache.values()) release(image);
      cache.clear();
    },
  };
}

// Compressed blobs are inexpensive to retain (~5–12 MB for the whole film).
// Background download and foreground decoding are independent: a new scroll
// target never waits for an earlier background queue item to start fetching.
export function createFrameSource({ count, fetchFrame, concurrency = 4 }) {
  const cache = new Map(), pending = new Map();
  let cursor = 0, started = false, disposed = false;
  function get(index, foreground = true) {
    if (disposed) return Promise.reject(new Error('Frame source disposed'));
    if (cache.has(index)) return Promise.resolve(cache.get(index));
    if (pending.has(index)) return pending.get(index);
    const request = Promise.resolve().then(() => fetchFrame(index, foreground)).then(blob => {
      if (!disposed) cache.set(index, blob);
      return blob;
    }).finally(() => pending.delete(index));
    pending.set(index, request);
    return request;
  }
  return {
    get,
    warm() {
      if (started || disposed) return;
      started = true;
      const worker = async () => {
        while (!disposed && cursor < count) {
          const index = cursor++;
          try { await get(index, false); } catch { /* Foreground requests may retry. */ }
        }
      };
      for (let i = 0; i < concurrency; i++) worker();
    },
    size: () => cache.size,
    dispose() { disposed = true; cache.clear(); },
  };
}
