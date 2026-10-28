import { createTimeline, eases } from 'animejs';

export const SCROLL_LINK_MOTION = { duration: 0.65, lerp: 0, easing: eases.outQuint };

// ScrollTrigger supplies the playhead. This timeline never runs its own clock.
// Each illustration is at its resting position when its panel is centered.
export function createChapterDepth(targets) {
    const elements = Array.from(targets);
    const timeline = createTimeline({ autoplay: false });
    const intervals = Math.max(1, elements.length - 1);
    elements.forEach((element, index) => {
        const start = Math.max(0, (index - 1) / intervals) * 1000;
        const end = Math.min(1, (index + 1) / intervals) * 1000;
        timeline.add(element, {
            y: [index === 0 ? 0 : 24, index === elements.length - 1 ? 0 : -24],
            duration: end - start,
            ease: 'linear',
        }, start);
    });
    // Initialize future panels too, so a first fast jump and a reverse seek
    // produce the same pose. This happens synchronously before the first paint.
    timeline.seek(timeline.duration, true).seek(0, true);
    return timeline;
}
