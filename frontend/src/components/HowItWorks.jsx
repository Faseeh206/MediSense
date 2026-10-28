import SpringText from './ui/spring-text';
import { useRef, useState } from 'react';
import { FileUp, ScanText, MessagesSquare, ArrowUpRight, Check, ArrowRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './how-it-works.css';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
    { label: 'Document', title: 'Share your document', icon: FileUp,
        text: 'A lab report or prescription. A clear photo or a PDF. Start with what you have.' },
    { label: 'Clarity', title: 'Make sense of the details', icon: ScanText,
        text: 'Understand results in everyday language, with drug label context where available.' },
    { label: 'Questions', title: 'Go prepared', icon: MessagesSquare,
        text: 'Bring your questions and a clearer understanding to your next appointment.' },
];

export default function HowItWorks() {
    const root = useRef(null), art = useRef(null), timeline = useRef(null);
    const stageRef = useRef(0);
    const [activeStage, setActiveStage] = useState(0);
    const reduce = useReducedMotion();

    useGSAP(() => {
        if (reduce) return;
        const paper = root.current.querySelector('.clarity-report');
        const paperBack = root.current.querySelector('.clarity-paper-back');
        const thread = root.current.querySelector('.clarity-thread');
        const note = root.current.querySelector('.clarity-translation');
        const questions = root.current.querySelector('.clarity-questions');
        const scan = root.current.querySelector('.clarity-reading-line');
        const highlight = root.current.querySelector('.clarity-result-highlight');
        const connector = root.current.querySelector('.clarity-connector');
        const syncStage = () => {
            const next = Math.min(2, Math.floor(scene.progress() * 2 + 0.25));
            if (stageRef.current !== next) {
                stageRef.current = next;
                setActiveStage(next);
            }
        };
        // One reversible playhead owns the entire illustration. Scroll never
        // waits for a scrub buffer; the buttons can preview the same poses.
        const scene = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: syncStage });
        scene.fromTo(paper, { rotation: -7, xPercent: 0, y: 12 },
            { rotation: -2, xPercent: -7, y: -10, duration: 0.5 }, 0)
            .fromTo([paper, thread], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18 }, 0)
            .fromTo(paperBack, { autoAlpha: 0 }, { autoAlpha: 0.55, duration: 0.18 }, 0)
            .fromTo(scan, { y: -55, opacity: 0 }, { y: 105, opacity: 0.8, duration: 0.26 }, 0)
            .to(scan, { opacity: 0, duration: 0.08 }, 0.26)
            .fromTo(highlight, { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.12)
            .fromTo(connector, { opacity: 0, scaleX: 0.85 }, { opacity: 1, scaleX: 1, duration: 0.2 }, 0.24)
            .fromTo(note, { autoAlpha: 0, x: 38, y: 18, rotation: 4, scale: 0.96 },
                { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: 0.3 }, 0.2)
            .to(paper, { rotation: -4, y: -22, duration: 0.3 }, 0.6)
            .to(note, { y: -12, duration: 0.3 }, 0.6)
            .fromTo(questions, { autoAlpha: 0, y: 36, rotation: -3, scale: 0.97 },
                { autoAlpha: 1, y: 0, rotation: 0, scale: 1, duration: 0.3 }, 0.66)
            .fromTo('.clarity-question-check', { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, stagger: 0.04, duration: 0.1 }, 0.82)
            .to({}, { duration: 0.04 }, 0.96);
        timeline.current = scene;
        const trigger = ScrollTrigger.create({
            id: 'clarity-report-story', trigger: art.current,
            start: 'top 75%', end: 'bottom 65%',
            onUpdate: self => {
                gsap.killTweensOf(scene);
                scene.progress(self.progress);
            },
            onRefresh: self => {
                gsap.killTweensOf(scene);
                scene.progress(self.progress);
            },
        });
        scene.progress(trigger.progress);
        syncStage();
        return () => {
            gsap.killTweensOf(scene);
            timeline.current = null;
        };
    }, { scope: root, dependencies: [reduce], revertOnUpdate: true });

    const previewStage = index => {
        stageRef.current = index;
        setActiveStage(index);
        if (timeline.current) gsap.to(timeline.current, {
            progress: index === 0 ? 0.18 : index / 2, duration: 0.5, ease: 'power2.inOut', overwrite: true,
        });
    };

    return <section id="how-it-works" ref={root} className="clarity-story section-shell"
        aria-labelledby="clarity-title" data-stage={activeStage} data-motion={reduce ? 'reduced' : 'full'}>
        <div className="clarity-intro">
            <span className="section-kicker">A clearer picture</span>
            <SpringText tag="h2" id="clarity-title">Information that<br /><em>makes sense.</em></SpringText>
            <p>From a page of unfamiliar numbers to a conversation you feel ready to have.</p>
        </div>

        <ol className="clarity-stages" aria-label="How MediSense works">
            {STAGES.map(({ title, text, icon: Icon }, index) => <li key={title}
                className={activeStage === index ? 'is-current' : ''}>
                <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
                <div><SpringText tag="h3">{title}</SpringText><p>{text}</p></div>
            </li>)}
        </ol>

        <figure className="clarity-visual">
            <div className="clarity-art" ref={art} id="clarity-preview" aria-hidden="true">
                <svg className="clarity-thread" viewBox="0 0 600 610" fill="none">
                    <path d="M485 4C578 109 548 189 418 248S58 338 56 460s145 148 257 140" />
                    <circle cx="485" cy="4" r="4" /><circle cx="313" cy="600" r="4" />
                </svg>
                <div className="clarity-paper-back" />
                <div className="clarity-report clarity-card">
                    <div className="clarity-paper-brand"><span><FileUp size={18} strokeWidth={1.6} />MediSense</span><small>Sample report</small></div>
                    <div className="clarity-paper-title">A little more<br />understanding.</div>
                    <div className="clarity-paper-subtitle">Metabolic &amp; lipid panel</div>
                    <div className="clarity-result-labels"><span>Biomarker</span><span>Result</span></div>
                    <div className="clarity-report-row clarity-focus-row">
                        <span className="clarity-result-highlight" />
                        <span>Fasting glucose</span><strong>118 <small>mg/dL</small></strong>
                    </div>
                    <div className="clarity-report-row"><span>Total cholesterol</span><strong>238 <small>mg/dL</small></strong></div>
                    <div className="clarity-report-row"><span>HDL cholesterol</span><strong>52 <small>mg/dL</small></strong></div>
                    <span className="clarity-reading-line" />
                </div>
                <svg className="clarity-connector" viewBox="0 0 160 100" fill="none">
                    <path d="M1 2C96 2 32 95 150 95" /><circle cx="152" cy="95" r="3" />
                </svg>
                <div className="clarity-translation clarity-card">
                    <div className="clarity-note-label"><ScanText size={18} strokeWidth={1.6} /><span>In plain language</span><strong>118 mg/dL</strong></div>
                    <p className="clarity-note-title">Fasting glucose</p>
                    <p>The amount of sugar in your blood after fasting.</p>
                    <span className="clarity-note-source">The same result. A clearer meaning.</span>
                </div>
                <div className="clarity-questions clarity-card">
                    <div className="clarity-note-label"><MessagesSquare size={18} strokeWidth={1.6} /><span>Questions</span><ArrowUpRight size={17} /></div>
                    <p className="clarity-question-title">For your next appointment</p>
                    <p className="clarity-question-row"><Check className="clarity-question-check" size={16} /> What could affect this result?</p>
                    <p className="clarity-question-row"><Check className="clarity-question-check" size={16} /> What should I ask about next?</p>
                </div>
            </div>
            <div className="clarity-preview-controls" role="group" aria-label="Preview the document journey">
                {STAGES.map(({ label }, index) => <button key={label} type="button"
                    aria-pressed={activeStage === index} aria-controls="clarity-preview"
                    onClick={() => previewStage(index)}>{label}{index < 2 && <ArrowRight size={13} aria-hidden="true" />}</button>)}
            </div>
            <figcaption>Illustrative sample · No patient data</figcaption>
            <p className="visually-hidden">A sample report becomes an explanation: fasting glucose measures the amount of sugar in your blood after fasting. Questions to bring to your clinician include: What could affect this result? What should I ask about next?</p>
        </figure>
    </section>;
}
