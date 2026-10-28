// The approved Folio contours are shared by the inline mark and tab icon.
export const FOLIO_PATHS = [
    'M 32 56 L 112 96 L 112 224 L 32 184 Z',
    'M 136 96 C 164 60 196 36 224 32 L 224 160 C 192 164 164 188 136 224 Z',
];
export const FOLIO_REST = 3000;
export const FOLIO_DURATION = FOLIO_REST + 1200;
export const FOLIO_EASING = 'cubic-bezier(0.77, 0, 0.175, 1)';
export const FOLIO_FRAMES = 40;
export const FAVICON_INTERVAL = 160;
const OFFSETS = [0, FOLIO_REST / FOLIO_DURATION, (FOLIO_REST + 600) / FOLIO_DURATION, 1];
const FOLDS = [0, 0, 1, 0];

function curve(t, a, b) { const s = 1 - t; return 3 * s * s * t * a + 3 * s * t * t * b + t * t * t; }
function eased(t) {
    // Invert the same cubic Bezier used by WAAPI; no independent animation clock.
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (curve(mid, 0.77, 0.175) < t) lo = mid; else hi = mid;
    }
    return curve((lo + hi) / 2, 0, 1);
}
export function folioPoseAt(milliseconds) {
    const phase = ((milliseconds % FOLIO_DURATION) + FOLIO_DURATION) % FOLIO_DURATION / FOLIO_DURATION;
    let segment = 0;
    while (segment < OFFSETS.length - 2 && phase > OFFSETS[segment + 1]) segment++;
    const t = (phase - OFFSETS[segment]) / (OFFSETS[segment + 1] - OFFSETS[segment]);
    const fold = FOLDS[segment] + (FOLDS[segment + 1] - FOLDS[segment]) * eased(t);
    return { left: 1 - 0.14 * fold, right: 1 - 0.42 * fold };
}
export function folioKeyframes(side) {
    const amount = side === 'left' ? 0.14 : 0.42;
    return OFFSETS.map((offset, index) => ({
        offset, easing: FOLIO_EASING, transform: `scaleX(${1 - amount * FOLDS[index]})`,
    }));
}

function iconRenderer(doc) {
    const view = doc.defaultView;
    if (!view?.Path2D) return null;
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const paths = FOLIO_PATHS.map(path => new view.Path2D(path));
    const cache = new Map();
    return time => {
        const frame = Math.round(time / FOLIO_DURATION * FOLIO_FRAMES) % FOLIO_FRAMES;
        if (!cache.has(frame)) {
            const pose = folioPoseAt(frame * FOLIO_DURATION / FOLIO_FRAMES);
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 32, 32);
            ctx.scale(32 / 256, 32 / 256);
            ctx.fillStyle = '#914825';
            ctx.beginPath();
            ctx.moveTo(56, 0); ctx.lineTo(200, 0); ctx.quadraticCurveTo(256, 0, 256, 56);
            ctx.lineTo(256, 200); ctx.quadraticCurveTo(256, 256, 200, 256);
            ctx.lineTo(56, 256); ctx.quadraticCurveTo(0, 256, 0, 200);
            ctx.lineTo(0, 56); ctx.quadraticCurveTo(0, 0, 56, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fffaf1';
            paths.forEach((path, index) => {
                const origin = index === 0 ? 112 : 136;
                ctx.save(); ctx.translate(origin, 160); ctx.scale(index === 0 ? pose.left : pose.right, 1);
                ctx.translate(-origin, -160); ctx.fill(path); ctx.restore();
            });
            cache.set(frame, canvas.toDataURL('image/png'));
        }
        return { url: cache.get(frame), frame };
    };
}

export function startFolioMotion(root, { reduced = false, renderIcon } = {}) {
    const doc = root.ownerDocument, view = doc.defaultView;
    const icon = doc.getElementById('medisense-favicon');
    const original = icon ? ['href', 'type', 'sizes'].map(name => [name, icon.getAttribute(name)]) : [];
    const restoreIcon = () => {
        original.forEach(([name, value]) => value === null ? icon.removeAttribute(name) : icon.setAttribute(name, value));
        icon?.removeAttribute('data-folio-frame');
    };
    const leaves = [...root.querySelectorAll('[data-folio-page]')];
    if (reduced || leaves.length !== 2 || !leaves.every(leaf => typeof leaf.animate === 'function')) {
        root.setAttribute('data-brand-motion', 'static');
        return () => {};
    }

    const animations = leaves.map((leaf, index) => leaf.animate(folioKeyframes(index === 0 ? 'left' : 'right'), {
        duration: FOLIO_DURATION, iterations: Infinity, easing: 'linear',
    }));
    const holds = new Set();
    const finePointer = view.matchMedia('(hover: hover) and (pointer: fine)');
    if (finePointer.matches && root.matches(':hover')) holds.add('hover');
    if (root.matches(':focus-visible')) holds.add('focus');
    let renderer = renderIcon;
    if (renderer === undefined && icon) {
        try { renderer = iconRenderer(doc); } catch { renderer = null; }
    }
    let timer = null, disposed = false;
    const paint = time => {
        if (!icon || !renderer) return;
        try {
            const { url, frame } = renderer(time);
            if (icon.getAttribute('href') !== url) {
                icon.setAttribute('type', 'image/png'); icon.setAttribute('sizes', '32x32');
                icon.setAttribute('href', url); icon.setAttribute('data-folio-frame', String(frame));
            }
        } catch { renderer = null; restoreIcon(); }
    };
    const time = () => typeof animations[0].currentTime === 'number' ? animations[0].currentTime : 0;
    const tick = () => {
        timer = null;
        if (disposed || doc.hidden || holds.size) return;
        paint(time());
        if (renderer) timer = view.setTimeout(tick, FAVICON_INTERVAL);
    };
    const sync = () => {
        if (disposed) return;
        if (timer !== null) { view.clearTimeout(timer); timer = null; }
        const current = time();
        const paused = doc.hidden || holds.size > 0;
        if (paused) {
            animations.forEach(animation => { animation.pause(); animation.currentTime = current; });
            root.setAttribute('data-brand-motion', 'paused');
            root.setAttribute('data-pause-reason', doc.hidden ? 'background' : [...holds].join(' '));
            paint(current);
        } else {
            animations.forEach(animation => animation.play());
            const now = doc.timeline.currentTime;
            if (typeof now === 'number') animations.forEach(animation => { animation.startTime = now - current; });
            root.setAttribute('data-brand-motion', 'running'); root.removeAttribute('data-pause-reason');
            tick();
        }
    };
    const enter = event => { if (event.pointerType !== 'touch' && finePointer.matches) { holds.add('hover'); sync(); } };
    const leave = () => { holds.delete('hover'); sync(); };
    const focus = () => { if (root.matches(':focus-visible')) { holds.add('focus'); sync(); } };
    const blur = () => { holds.delete('focus'); sync(); };
    const pointerDown = () => { holds.delete('focus'); sync(); };
    const events = [['pointerenter', enter], ['pointerleave', leave], ['focus', focus], ['blur', blur], ['pointerdown', pointerDown]];
    events.forEach(([name, handler]) => root.addEventListener(name, handler));
    doc.addEventListener('visibilitychange', sync);
    sync();
    return () => {
        disposed = true;
        if (timer !== null) view.clearTimeout(timer);
        events.forEach(([name, handler]) => root.removeEventListener(name, handler));
        doc.removeEventListener('visibilitychange', sync);
        animations.forEach(animation => animation.cancel());
        root.setAttribute('data-brand-motion', 'static'); root.removeAttribute('data-pause-reason');
        restoreIcon(); renderer = null;
    };
}
