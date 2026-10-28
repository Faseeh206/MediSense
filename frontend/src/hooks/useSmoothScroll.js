import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';
import { registerScroller } from '../utils/scroll';
import { SCROLL_LINK_MOTION } from '../utils/siteMotion';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);
export function useSmoothScroll() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      autoRaf: false, lerp: .2, smoothWheel: true, syncTouch: false,
      stopInertiaOnNavigate: true,
      // Lenis already reads CSS scroll-padding and the target's scroll-margin.
      anchors: SCROLL_LINK_MOTION,
      prevent: node => node.hasAttribute?.('data-lenis-prevent') || node.classList?.contains('chapter-viewport'),
    });
    const tick = seconds => lenis.raf(seconds * 1000);
    const resize = () => lenis.resize();
    const unsubscribe = lenis.on('scroll', ScrollTrigger.update);
    registerScroller(lenis);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(tick);
    ScrollTrigger.addEventListener('refresh', resize);
    return () => {
      registerScroller(null);
      unsubscribe();
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener('refresh', resize);
      lenis.destroy();
    };
  }, [reduced]);
}
