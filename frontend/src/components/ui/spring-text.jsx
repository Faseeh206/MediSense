import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TextEngine from 'spring-text-engine';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { flattenTextFragments, readableText } from '../../utils/springTextContent';
import './spring-text.css';

const LINE_OUT = { y: '-110%' };
const LINE_IN = { y: '0%' };
const LINE_CONFIG = { tension: 252, friction: 21 };

// Native text reserves the original layout and remains the accessible copy.
// The engine exists only during the reveal, so completed text has no frame loop.
const SpringText = forwardRef(function SpringText({ tag = 'h2', children, className = '', style, align, ...props }, forwardedRef) {
    const root = useRef(null);
    const reduced = useReducedMotion();
    const [presentation, setPresentation] = useState(() => ({ phase: typeof window !== 'undefined' && 'IntersectionObserver' in window ? 'waiting' : 'complete', align: 'flex-start' }));
    const tokens = useMemo(() => flattenTextFragments(children), [children]);
    const text = useMemo(() => readableText(children), [children]);
    const setRoot = useCallback(element => {
        root.current = element;
        if (typeof forwardedRef === 'function') forwardedRef(element);
        else if (forwardedRef) forwardedRef.current = element;
    }, [forwardedRef]);

    useEffect(() => {
        if (reduced || presentation.phase !== 'waiting') return;
        const element = root.current;
        let intersecting = false;
        const watched = new Set();
        const visibility = new MutationObserver(() => reveal());
        const watchVisibility = parent => {
            if (!parent || watched.has(parent)) return;
            watched.add(parent);
            visibility.observe(parent, { attributes: true, attributeFilter: ['style', 'class', 'aria-hidden'] });
        };
        const reveal = () => {
            if (!intersecting) return;
            for (let parent = element; parent; parent = parent.parentElement) {
                const appearance = getComputedStyle(parent);
                if (appearance.visibility === 'hidden' || appearance.display === 'none' || Number(appearance.opacity) === 0) {
                    watchVisibility(parent);
                    return;
                }
            }
            const alignment = align || getComputedStyle(element).textAlign;
            setPresentation({ phase: 'active', align: alignment === 'center' ? 'center' : alignment === 'right' || alignment === 'end' ? 'flex-end' : 'flex-start' });
        };
        const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; reveal(); }, { threshold: 0.01 });
        observer.observe(element);
        // Scroll-formed cards already occupy the viewport while hidden.
        const hiddenScene = element.closest('.fusion-card,.clarity-report,.clarity-translation,.clarity-questions');
        watchVisibility(hiddenScene);
        return () => { observer.disconnect(); visibility.disconnect(); };
    }, [reduced, presentation.phase, align]);

    const active = !reduced && presentation.phase === 'active';
    const complete = () => setPresentation(current => current.phase === 'complete' ? current : { ...current, phase: 'complete' });
    const Tag = tag;
    if (reduced) return <Tag {...props} ref={setRoot} className={className} style={style} data-spring-phase="static">{children}</Tag>;
    return <Tag {...props} ref={setRoot} className={`spring-text ${className}`.trim()} style={style}
        data-spring-phase={presentation.phase} aria-label={props['aria-label'] || (/^h[1-6]$/.test(tag) ? text : undefined)}>
        <span className="spring-text-native">{children}</span>
        {active && <TextEngine tag="span" mode="once" overflow lineOut={LINE_OUT} lineIn={LINE_IN}
            lineConfig={LINE_CONFIG} lineStagger={99}
            className="spring-text-engine" wrapLineClassName="spring-text-word" lineClassName="spring-text-line"
            style={{ justifyContent: presentation.align }} aria-hidden="true" seo={false}
            onTextFullyPlayed={direction => { if (direction === 'in') complete(); }}>
            {tokens}
        </TextEngine>}
    </Tag>;
});

export default SpringText;
