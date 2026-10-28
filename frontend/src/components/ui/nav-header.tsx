"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import * as m from 'framer-motion/m';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './nav-header.css';

export interface NavHeaderItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  pressed?: boolean;
  badge?: number;
  render?: () => ReactNode;
}
interface NavHeaderProps {
  items: NavHeaderItem[];
  label?: string;
  className?: string;
  iconOnly?: boolean;
  onSelect?: () => void;
}

export default function NavHeader({ items, label, className = '', iconOnly = false, onSelect }: NavHeaderProps) {
  const list = useRef<HTMLUListElement>(null);
  const entries = useRef(new Map<string, HTMLLIElement>());
  const active = useRef<string | null>(null);
  const reduced = useReducedMotion();
  const [position, setPosition] = useState({ left: 4, width: 0, opacity: 0 });
  const show = useCallback((id: string) => {
    const element = entries.current.get(id);
    if (!element) return;
    active.current = id;
    setPosition({ left: element.offsetLeft, width: element.offsetWidth, opacity: 1 });
  }, []);
  const hide = () => {
    active.current = null;
    setPosition(previous => ({ ...previous, opacity: 0 }));
  };
  useEffect(() => {
    let disposed = false;
    const measure = () => { if (!disposed && active.current) show(active.current); };
    const observer = new ResizeObserver(measure);
    if (list.current) observer.observe(list.current);
    entries.current.forEach(element => observer.observe(element));
    document.fonts.ready.then(measure);
    return () => { disposed = true; observer.disconnect(); };
  }, [show]);

  return <LazyMotion features={domAnimation} strict><ul ref={list} aria-label={label}
    className={`nav-header ${iconOnly ? 'nav-header--icons' : ''} ${className}`}
    onPointerLeave={() => {
      const focused = list.current?.querySelector(':focus-visible')?.closest<HTMLElement>('[data-nav-item]');
      if (focused?.dataset.navItem) show(focused.dataset.navItem); else hide();
    }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) hide(); }}>
    {items.map(item => {
      const content = <>{item.icon && <span className="nav-header-icon" aria-hidden="true">{item.icon}</span>}
        <span className="nav-header-label">{item.label}</span>
        {!!item.badge && <span className="nav-header-badge" aria-hidden="true">{item.badge}</span>}</>;
      const activate = () => { item.onClick?.(); onSelect?.(); };
      return <li key={item.id} data-nav-item={item.id}
        ref={element => { if (element) entries.current.set(item.id, element); else entries.current.delete(item.id); }}
        className={`nav-header-item ${item.render ? 'nav-header-item--custom' : ''}`}
        onPointerEnter={event => { if (event.pointerType !== 'touch') show(item.id); }}
        onFocusCapture={() => show(item.id)}>
        {item.render ? item.render() : item.href
          ? <a className="nav-header-action" href={item.href} onClick={activate} aria-label={item.ariaLabel}>{content}</a>
          : <button className="nav-header-action" type="button" onClick={activate}
            aria-label={item.ariaLabel || item.label} aria-pressed={item.pressed} title={item.label}>{content}</button>}
      </li>;
    })}
    <m.li className="nav-header-cursor" aria-hidden="true" role="presentation" initial={false}
      animate={{ x: position.left, width: position.width, opacity: position.opacity }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: .65, opacity: { duration: .12 } }} />
  </ul></LazyMotion>;
}
