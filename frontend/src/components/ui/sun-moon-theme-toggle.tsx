"use client";
import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { runThemeTransition, THEME_SWAP_DURATION } from '../../utils/themeTransition';
import { THEME_ICON_FRAMES as KEYFRAMES } from '../../utils/themeIconFrames';
import './sun-moon-theme-toggle.css';

export type SunMoonTheme = 'light' | 'dark';
export interface SunMoonThemeToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> {
  theme?: SunMoonTheme;
  defaultTheme?: SunMoonTheme;
  onThemeChange?: (theme: SunMoonTheme, event: React.MouseEvent<HTMLButtonElement>) => void;
  syncDocument?: boolean;
  storageKey?: string;
  duration?: number;
  size?: number;
  sky?: boolean;
  classNames?: { sun?: string; moon?: string };
  ref?: React.Ref<HTMLButtonElement>;
  transitionName?: string;
}
type Body = { side: -1 | 1; spin: number };
const MOON: Body = { side: -1, spin: 25 }, SUN: Body = { side: 1, spin: 120 };
const STARS = [{ x: 24, y: 22, r: 1.6 }, { x: 66, y: 16, r: 1.2 }, { x: 80, y: 42, r: 1.8 }, { x: 38, y: 58, r: 1.1 }, { x: 58, y: 74, r: 1.4 }, { x: 14, y: 72, r: 1.2 }];

export function SunMoonThemeToggle({ theme: controlled, defaultTheme = 'light', onThemeChange, syncDocument = true,
  storageKey, duration = THEME_SWAP_DURATION, size = 44, sky = true, classNames, ref, className = '', style, onClick, transitionName, ...rest }: SunMoonThemeToggleProps) {
  const [internal, setInternal] = React.useState<SunMoonTheme>(() => {
    if (controlled) return controlled;
    try { const saved = storageKey && localStorage.getItem(storageKey); if (saved === 'light' || saved === 'dark') return saved; } catch { /* Optional storage. */ }
    return syncDocument && typeof document !== 'undefined' ? document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' : defaultTheme;
  });
  const theme = controlled ?? internal, reduced = useReducedMotion();
  const moon = React.useRef<HTMLSpanElement>(null), sun = React.useRef<HTMLSpanElement>(null);
  const night = React.useRef<HTMLSpanElement>(null), day = React.useRef<HTMLSpanElement>(null);
  const flight = React.useRef<Animation[]>([]), committed = React.useRef(theme);
  React.useLayoutEffect(() => {
    const previous = committed.current; committed.current = theme;
    if (document.documentElement.dataset.themeTransition === 'snapshot') { flight.current.forEach(animation => animation.cancel()); flight.current = []; return; }
    if (reduced || duration <= 0) { flight.current.forEach(animation => animation.cancel()); flight.current = []; return; }
    if (previous === theme || !moon.current || !sun.current || typeof moon.current.animate !== 'function') return;
    if (flight.current.length) { flight.current.forEach(animation => animation.reverse()); return; }
    const light = theme === 'light';
    const setting = (light ? moon.current : sun.current).animate(light ? KEYFRAMES.moonSets : KEYFRAMES.sunSets, { duration: duration * .65, fill: 'both' });
    const rising = (light ? sun.current : moon.current).animate(light ? KEYFRAMES.sunRises : KEYFRAMES.moonRises, { duration: duration * .64, delay: duration * .36, fill: 'both' });
    const animations = [setting, rising];
    if (night.current && day.current) {
      const options: KeyframeAnimationOptions = { duration, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' };
      animations.push(night.current.animate({ opacity: light ? [1, 0] : [0, 1] }, options), day.current.animate({ opacity: light ? [0, 1] : [1, 0] }, options));
    }
    flight.current = animations;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (flight.current !== animations) return;
      flight.current = []; animations.forEach(animation => animation.cancel());
    }).catch(() => {});
  }, [theme, duration, reduced]);
  React.useEffect(() => () => { flight.current.forEach(animation => animation.cancel()); }, []);
  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event); if (event.defaultPrevented) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    if (controlled === undefined) {
      const commit = () => { setInternal(next); if (syncDocument) { document.documentElement.dataset.theme = next; document.documentElement.classList.toggle('dark', next === 'dark'); } };
      if (syncDocument) runThemeTransition(commit, { next, duration, reduced }); else commit();
    }
    if (storageKey) { try { localStorage.setItem(storageKey, next); } catch { /* Optional storage. */ } }
    onThemeChange?.(next, event);
  };
  const resting = (body: Body, visible: boolean): React.CSSProperties => ({ transform: transitionName || visible ? 'none' : `translate(${body.side * 115}%,115%)`, opacity: visible ? 1 : 0 });
  return <button ref={ref} type="button" data-slot="theme-toggle" data-state={theme}
    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    className={`sun-moon-toggle ${className}`} style={{ width: size, height: size, viewTransitionName: transitionName ? `${transitionName}-toggle` : undefined, ...style }} onClick={toggle} {...rest}>
    {sky && <><span ref={night} aria-hidden="true" data-sky="night" className="sun-moon-sky sun-moon-night" style={{ opacity: theme === 'dark' ? 1 : 0 }}>
      {STARS.map((star, i) => <span key={i} className="sun-moon-star" style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.r * 2, height: star.r * 2 }} />)}
    </span><span ref={day} aria-hidden="true" data-sky="day" className="sun-moon-sky sun-moon-day" style={{ opacity: theme === 'light' ? 1 : 0 }} /></>}
    <span ref={moon} aria-hidden="true" data-body="moon" className={`sun-moon-body sun-moon-moon ${classNames?.moon || ''}`} style={{ ...resting(MOON, theme === 'dark'), viewTransitionName: transitionName ? `${transitionName}-moon` : undefined }}><Moon size={22} fill="currentColor" /></span>
    <span ref={sun} aria-hidden="true" data-body="sun" className={`sun-moon-body sun-moon-sun ${classNames?.sun || ''}`} style={{ ...resting(SUN, theme === 'light'), viewTransitionName: transitionName ? `${transitionName}-sun` : undefined }}><Sun size={24} /></span>
  </button>;
}
export default SunMoonThemeToggle;
