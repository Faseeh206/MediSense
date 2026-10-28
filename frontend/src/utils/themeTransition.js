import { THEME_ICON_FRAMES } from './themeIconFrames';
export const THEME_SWAP_DURATION = 1740;
let transition = null;
let revision = 0;
export function cancelThemeTransition() {
  revision++;
  transition?.skipTransition?.();
  transition?.cancel?.();
  transition = null;
  document.documentElement.classList.remove('theme-changing');
  delete document.documentElement.dataset.themeTransition;
}

// A newer click wins even before an earlier snapshot's update has committed.
export function runThemeTransition(commit, { next, x = innerWidth / 2, y = 44, duration = THEME_SWAP_DURATION, reduced = false } = {}) {
  cancelThemeTransition();
  const request = revision;
  if (reduced || typeof Animation === 'undefined' || typeof KeyframeEffect === 'undefined') { commit(); return; }
  const root = document.documentElement;
  if (document.startViewTransition) {
    root.dataset.themeTransition = 'snapshot';
    const current = document.startViewTransition(() => { if (request === revision) commit(); });
    const flights = [];
    transition = current;
    current.ready.then(() => {
      if (request !== revision) return;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const animate = (pseudoElement, keyframes, options = {}) => { flights.push(root.animate(keyframes, { duration, fill: 'both', pseudoElement, ...options })); };
      animate('::view-transition-new(root)', { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { easing: 'cubic-bezier(.65,0,.35,1)' });
      const light = next === 'light', setting = light ? 'moon' : 'sun', rising = light ? 'sun' : 'moon';
      animate(`::view-transition-old(medisense-${setting})`, light ? THEME_ICON_FRAMES.moonSets : THEME_ICON_FRAMES.sunSets, { duration: duration * .65 });
      animate(`::view-transition-new(medisense-${rising})`, light ? THEME_ICON_FRAMES.sunRises : THEME_ICON_FRAMES.moonRises, { duration: duration * .64, delay: duration * .36 });
      animate(`::view-transition-new(medisense-${setting})`, { opacity: [0, 0] });
      animate(`::view-transition-old(medisense-${rising})`, { opacity: [0, 0] });
      animate('::view-transition-old(medisense-toggle)', { opacity: [1, 0] }, { easing: 'cubic-bezier(.65,0,.35,1)' });
      animate('::view-transition-new(medisense-toggle)', { opacity: [0, 1] }, { easing: 'cubic-bezier(.65,0,.35,1)' });
    }).catch(() => {});
    current.finished.catch(() => {}).finally(() => {
      flights.forEach(animation => animation.cancel());
      if (request === revision) { transition = null; delete root.dataset.themeTransition; }
    });
    return;
  }
  root.style.setProperty('--theme-swap-duration', `${duration}ms`);
  root.classList.add('theme-changing');
  void getComputedStyle(document.body).backgroundColor;
  commit();
  const current = new Animation(new KeyframeEffect(null, [], { duration }), document.timeline);
  transition = current;
  current.play();
  current.finished.then(() => {
    if (request !== revision) return;
    root.classList.remove('theme-changing');
    transition = null;
    window.dispatchEvent(new Event('medisense-theme-settled'));
  }).catch(() => {});
}
