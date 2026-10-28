import { SCROLL_LINK_MOTION } from './siteMotion.js';

let scroller = null;
export function registerScroller(instance) { scroller = instance; }
export function scrollToPosition(top, reduced = false) {
  if (scroller) scroller.scrollTo(top, { ...SCROLL_LINK_MOTION, immediate: reduced });
  else window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
}
export function scrollToElement(id, reduced = false) {
  const element = document.getElementById(id);
  if (!element) return;
  // Use the same offset as native anchor links and Lenis, exactly once.
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  scrollToPosition(Math.max(0, window.scrollY + element.getBoundingClientRect().top - padding - margin), reduced);
}
