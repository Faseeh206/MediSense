import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface MarqueeProps {
  children: ReactNode;
  reverse?: boolean;
  pauseOnHover?: boolean;
  paused?: boolean;
  className?: string;
  label: string;
}

export function Marquee({ children, reverse = false, pauseOnHover = true, paused = false, className = '', label }: MarqueeProps) {
  const viewport = useRef<HTMLDivElement>(null), group = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(4), [shift, setShift] = useState(0);
  const [visible, setVisible] = useState(false), [pageVisible, setPageVisible] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = viewport.current, original = group.current;
    if (!element || !original) return;
    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(element).getPropertyValue('--ms-marquee-gap')) || 16;
      const distance = original.offsetWidth + gap;
      if (!distance) return;
      setShift(distance);
      setCopies(Math.max(2, Math.ceil(element.clientWidth / distance) + 1));
    };
    const resize = new ResizeObserver(measure);
    resize.observe(element); resize.observe(original); measure();
    const intersection = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    intersection.observe(element);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { resize.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const running = visible && pageVisible && !paused && !reduced && shift > 0;
  return <div ref={viewport} className={`ms-marquee ${pauseOnHover ? 'ms-marquee--hover-pause' : ''} ${className}`}
    role="region" aria-label={label} tabIndex={0} data-reduced={reduced || undefined} data-running={running}>
    <div className="ms-marquee-track" data-reverse={reverse || undefined}
      style={{ '--ms-marquee-shift': `${shift}px`, animationPlayState: running ? 'running' : 'paused' } as CSSProperties}>
      {Array.from({ length: reduced ? 1 : copies }, (_, copy) => <div ref={copy === 0 ? group : undefined}
        className="ms-marquee-group" key={copy} aria-hidden={copy > 0 ? true : undefined} inert={copy > 0 ? true : undefined}>
        {children}
      </div>)}
    </div>
  </div>;
}
