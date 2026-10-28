import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from './useReducedMotion';
import { cancelThemeTransition, runThemeTransition } from '../utils/themeTransition';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('medisense_theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const requested = useRef(theme);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('medisense_theme', theme); } catch { /* Optional storage. */ }
  }, [theme]);
  useEffect(() => cancelThemeTransition, []);
  useEffect(() => { if (reduced) { cancelThemeTransition(); setTheme(requested.current); } }, [reduced]);

  const toggleTheme = event => {
    const next = requested.current === 'dark' ? 'light' : 'dark';
    requested.current = next;
    const rect = event?.currentTarget?.getBoundingClientRect();
    runThemeTransition(() => flushSync(() => setTheme(next)), {
      next,
      x: rect ? rect.left + rect.width / 2 : undefined,
      y: rect ? rect.top + rect.height / 2 : undefined,
      reduced,
    });
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
