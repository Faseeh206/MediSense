import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const EVENT = 'medisense-motion-change';
function userPrefersReduced() {
  try { return localStorage.getItem('medisense-reduced-motion') === 'true'; }
  catch { return false; }
}
function readPreference() {
  return window.matchMedia(QUERY).matches || userPrefersReduced();
}
export function setReducedMotion(reduced) {
  try { localStorage.setItem('medisense-reduced-motion', String(reduced)); } catch { /* Optional preference storage. */ }
  document.documentElement.toggleAttribute('data-reduced-motion', reduced);
  window.dispatchEvent(new Event(EVENT));
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(readPreference);
  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const update = () => {
      document.documentElement.toggleAttribute('data-reduced-motion', userPrefersReduced());
      setReduced(readPreference());
    };
    update();
    query.addEventListener('change', update);
    window.addEventListener(EVENT, update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return reduced;
}

