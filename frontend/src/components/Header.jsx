import { useEffect, useRef, useState } from 'react';
import { History, Menu, X, Waves } from 'lucide-react';
import { useReducedMotion, setReducedMotion } from '../hooks/useReducedMotion';
import NavHeader from './ui/nav-header';
import SunMoonThemeToggle from './ui/sun-moon-theme-toggle';
import FolioLogo from './ui/folio-logo';
import { THEME_SWAP_DURATION } from '../utils/themeTransition';
import './header.css';

const LINKS = [
  { id: 'how', label: 'How it works', href: '#how-it-works' },
  { id: 'samples', label: 'Sample report', href: '#upload-samples' },
  { id: 'approach', label: 'Our approach', href: '#features-grid' },
];

export default function Header({ theme, toggleTheme, historyCount, onOpenHistory }) {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false), [open, setOpen] = useState(false);
  const root = useRef(null), menuButton = useRef(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = event => { if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } };
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  const motionControl = { id: 'motion', label: 'Reduce motion', icon: <Waves />, pressed: reduced, onClick: () => setReducedMotion(!reduced) };
  const utilities = [
    { id: 'history', label: 'Scan history', ariaLabel: `View scan history, ${historyCount} records`, icon: <History />, badge: historyCount,
      onClick: () => { setOpen(false); onOpenHistory(); } },
    { id: 'theme', label: 'Theme', render: () => <SunMoonThemeToggle theme={theme} syncDocument={false} transitionName="medisense"
      duration={THEME_SWAP_DURATION} onThemeChange={(_, event) => toggleTheme(event)} /> },
    motionControl,
  ];
  return <header ref={root} className={`site-header medisense-header ${scrolled ? 'is-scrolled' : ''}`}>
    <FolioLogo />
    <div id="medisense-header-menu" className={`header-menu ${open ? 'is-open' : ''}`}>
      <nav aria-label="Main navigation"><NavHeader items={LINKS} onSelect={() => setOpen(false)} /></nav>
      <NavHeader items={[motionControl]} label="Motion preferences" className="header-mobile-motion" />
    </div>
    <NavHeader items={utilities} label="Display and scan history" iconOnly className="header-utilities" />
    <button ref={menuButton} className="header-menu-button" type="button" aria-expanded={open} aria-controls="medisense-header-menu"
      aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(previous => !previous)}>
      {open ? <X size={21} /> : <Menu size={21} />}
    </button>
  </header>;
}
