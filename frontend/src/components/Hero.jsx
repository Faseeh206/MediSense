import SpringText from './ui/spring-text';
import { useCallback, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import HeroFrameSequence from './HeroFrameSequence';
import HeroFeatureCards from './HeroFeatureCards';
import AnalyzeDocumentButton from './ui/analyze-document-button';
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export default function Hero({ onScrollToUpload, onScrollToDemo }) {
    const root = useRef(null), stage = useRef(null), progress = useRef({ value: 0 });
    const frameRenderer = useRef(null), cardRenderer = useRef(null), presented = useRef(0);
    const reduce = useReducedMotion(), desktop = useMediaQuery('(min-width: 800px)');
    const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
    const onReady = useCallback(() => setReady(true), []);
    const onError = useCallback(() => setFailed(true), []);
    const registerRenderer = useCallback(render => {
        frameRenderer.current = render;
        if (render) render(progress.current.value);
        else setReady(false);
    }, []);
    const registerCards = useCallback(render => {
        cardRenderer.current = render;
        render?.(presented.current);
    }, []);
    const onPresented = useCallback(value => {
        presented.current = value;
        cardRenderer.current?.(value);
    }, []);

    useGSAP(() => {
        if (failed || reduce) return;
        const tl = gsap.timeline({
            scrollTrigger: {
                id: 'hero-story', trigger: root.current, start: 'top top',
                end: () => '+=' + Math.max(1600, stage.current.clientHeight * (desktop ? 3.6 : 3)),
                pin: stage.current, scrub: true, invalidateOnRefresh: true, refreshPriority: 2,
            },
            defaults: { ease: 'none' },
        });
        tl.fromTo(progress.current, { value: 0 }, {
            value: 1, duration: 1, onUpdate: () => frameRenderer.current?.(progress.current.value),
        }, 0)
            .fromTo('.hero-sequence', { x: 0, xPercent: desktop ? 19 : 0 }, { x: 0, xPercent: 0, duration: .19, ease: 'sine.inOut' }, .13)
            .to('.hero-copy', { autoAlpha: 0, y: -36, duration: .16 }, .08)
            .fromTo('.hero-story-caption', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .1 }, .26)
            .to('.hero-progress-fill', { scaleX: 1, duration: 1 }, 0);

        // Reserve scroll space on mount, before async frame loading. Adding a
        // large pin spacer later lets browser scroll anchoring jump the page.
        const refresh = requestAnimationFrame(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
        return () => {
            cancelAnimationFrame(refresh);
            progress.current.value = 0;
            frameRenderer.current?.(0);
            cardRenderer.current?.(0);
        };
    }, { scope: root, dependencies: [failed, reduce, desktop], revertOnUpdate: true });

    return <section id="hero" ref={root} className={'hero-story ' + (!failed && !reduce ? 'hero-animated ' : '') + (ready && !failed && !reduce ? 'sequence-ready' : '')}>
        <div ref={stage} className="hero-stage">
            <div className="hero-atmosphere" /><div className="hero-static-art" aria-hidden="true" />
            {!reduce && !failed && <HeroFrameSequence registerRenderer={registerRenderer}
                onReady={onReady} onPresented={onPresented} onError={onError} />}
            <div className="hero-scene-shade" aria-hidden="true" />
            <div className="hero-copy">
                <div className="hero-intro-note"><span /> A little clarity. A lot of reassurance.</div>
                <SpringText tag="h1">Your results,<br />made clear.</SpringText>
                <p>Understand your lab report.<br className="mobile-break" /> Know what to ask next.</p>
                <div className="hero-actions"><AnalyzeDocumentButton onClick={onScrollToUpload}>Analyze your document</AnalyzeDocumentButton><button className="text-link" onClick={onScrollToDemo}>Explore a sample <ArrowUpRight size={17} /></button></div>
            </div>
            <HeroFeatureCards registerRenderer={registerCards} />
            <div className="hero-story-caption"><span>From complex information to a clearer conversation.</span><button className="text-link" onClick={onScrollToUpload}>Start with your document <ArrowUpRight size={17} /></button></div>
            <div className="hero-bottom"><span className="scroll-cue"><ArrowDown size={17} /> Scroll to discover</span><span className="hero-progress"><span className="hero-progress-fill" /></span></div>
        </div>
        <div className="hero-accessible-summary"><p>Decode lab reports, understand your prescription with AI-powered analysis, and prepare questions for your clinician.</p></div>
    </section>;
}

