import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './folio-logo.css';

export default function BrandWordmark({ revealOnView = false, ...props }) {
    const root = useRef(null);
    const reduced = useReducedMotion();
    useEffect(() => {
        const element = root.current;
        if (element.dataset.brandReveal === 'ready') return;
        if (reduced || !('IntersectionObserver' in window)) { element.dataset.brandReveal = 'ready'; return; }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { element.dataset.brandReveal = 'ready'; observer.disconnect(); }
        }, { threshold: 0.5 });
        observer.observe(root.current);
        return () => observer.disconnect();
    }, [reduced, revealOnView]);
    return <span ref={root} className="brand-wordmark" data-brand-reveal={revealOnView ? 'pending' : 'ready'} {...props}>
        <span className="brand-wordmark-medi">Medi</span><span className="brand-wordmark-sense">Sense</span>
    </span>;
}
