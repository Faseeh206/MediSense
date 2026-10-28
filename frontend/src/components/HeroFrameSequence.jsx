import { useEffect, useRef } from 'react';
import { createFrameBuffer, createFrameSource, HERO_FRAME_COUNT, heroFrameUrl, progressToFrame } from '../utils/frameSequence';

async function decodeFrame(blob, signal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob); }
    catch (error) { if (signal.aborted) throw error; }
  }
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try { image.src = url; await image.decode(); return image; }
  finally { URL.revokeObjectURL(url); }
}

export default function HeroFrameSequence({ registerRenderer, onReady, onPresented, onError }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) { onError(); return; }
    const mobile = window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches;
    const maxWidth = 1920;
    const network = new AbortController();
    let requested = 0, displayed = -1, raf = 0, disposed = false, ready = false;
    let width = 1, height = 1, dirty = true, requestedAt = performance.now();

    const source = createFrameSource({
      count: HERO_FRAME_COUNT,
      fetchFrame: async (index, foreground) => {
        const response = await fetch(heroFrameUrl(index), {
          signal: network.signal, cache: 'force-cache', priority: foreground ? 'high' : 'low',
        });
        if (!response.ok) throw new Error('Hero frame could not load');
        return response.blob();
      },
    });
    function paint() {
      if (disposed) return;
      const index = buffer.get(requested) ? requested : buffer.nearest(requested);
      const image = index === undefined ? null : buffer.get(index);
      if (!image || !dirty && displayed === index) return;
      const start = performance.now();
      const crop = image.height * 5 / 1080, sourceHeight = image.height - crop * 2;
      const scale = Math.max(width / image.width, height / sourceHeight);
      const drawWidth = image.width * scale, drawHeight = sourceHeight * scale;
      context.drawImage(image, 0, crop, image.width, sourceHeight,
        (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      displayed = index;
      dirty = false;
      buffer.pin(index);
      canvas.dataset.frame = String(index + 1);
      canvas.dataset.quality = 'source-1080p';
      canvas.dataset.sourceSize = image.width + 'x' + image.height;
      canvas.dataset.downloaded = String(source.size());
      if (import.meta.env.DEV) {
        canvas.dataset.renderMs = (performance.now() - start).toFixed(2);
        if (index === requested) canvas.dataset.inputLagMs = (performance.now() - requestedAt).toFixed(1);
      }
      if (!ready) { ready = true; onReady(); source.warm(); }
    }
    function schedulePaint() {
      if (!raf && !disposed) raf = requestAnimationFrame(() => { raf = 0; paint(); });
    }
    const buffer = createFrameBuffer({
      count: HERO_FRAME_COUNT, capacity: mobile ? 12 : 16, concurrency: 4,
      lookAhead: mobile ? 10 : 14, lookBehind: mobile ? 3 : 4,
      load: async (index, signal) => decodeFrame(await source.get(index), signal),
      onLoad: index => {
        if (index === requested || displayed < 0 || Math.abs(index - requested) < Math.abs(displayed - requested)) schedulePaint();
      },
      onError: index => { if (index === 0 && !ready) onError(); },
    });
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.round(Math.min(rect.width * dpr, maxWidth)));
      const nextHeight = Math.max(1, Math.round(rect.height * nextWidth / Math.max(1, rect.width)));
      if (width === nextWidth && height === nextHeight) return;
      width = nextWidth; height = nextHeight;
      canvas.width = width; canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      dirty = true;
      paint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    registerRenderer(progress => {
      onPresented(progress);
      const index = progressToFrame(progress);
      if (index === requested && displayed === index) return;
      if (index !== requested) requestedAt = performance.now();
      requested = index;
      canvas.dataset.targetFrame = String(index + 1);
      buffer.target(index);
      schedulePaint();
    });
    resize();
    buffer.target(requested);
    return () => {
      disposed = true;
      registerRenderer(null);
      cancelAnimationFrame(raf);
      observer.disconnect();
      network.abort();
      source.dispose();
      buffer.dispose();
    };
  }, [registerRenderer, onReady, onPresented, onError]);

  return <div className="hero-sequence" aria-hidden="true"><canvas ref={canvasRef} data-frame="0" /></div>;
}


