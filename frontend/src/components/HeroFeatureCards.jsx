import SpringText from './ui/spring-text';
import { useLayoutEffect, useRef } from 'react';
import { Activity, ShieldCheck, HeartHandshake } from 'lucide-react';
import { CARD_STAGES, cardProgress, phase } from '../utils/heroTimeline';

const icons = [Activity, ShieldCheck, HeartHandshake];

// DOM cards stay sharp and accessible independently of the raster sequence.
// Their only clock is the image player's presented scroll progress.
export default function HeroFeatureCards({ registerRenderer }) {
  const cards = useRef([]);
  useLayoutEffect(() => {
    const render = progress => {
      cards.current.forEach((card, index) => {
        if (!card) return;
        const stage = CARD_STAGES[index];
        const amount = cardProgress(progress, index);
        const alpha = phase(progress, stage.start + .08, stage.start + .125);
        card.style.opacity = String(alpha);
        card.style.visibility = amount > 0 ? 'visible' : 'hidden';
        card.style.transform = `translate(-50%, -50%) translateY(${(1 - amount) * 16}px) scale(${.93 + .07 * amount})`;
        card.style.setProperty('--card-text-opacity', String(phase(progress, stage.start + .105, stage.start + .15)));
        card.setAttribute('aria-hidden', String(alpha === 0));
      });
    };
    registerRenderer(render);
    render(0);
    return () => registerRenderer(null);
  }, [registerRenderer]);

  return <div className="hero-cards">
    {CARD_STAGES.map((card, index) => {
      const Icon = icons[index];
      return <article key={card.label} ref={node => { cards.current[index] = node; }}
        className={`fusion-card fusion-card-${index}`} aria-hidden="true">
        <div className="fusion-card-content">
          <div className="fusion-card-symbol"><Icon size={21} strokeWidth={1.5} /></div>
          <span>{card.label}</span><SpringText tag="h2">{card.title}</SpringText><p>{card.body}</p>
        </div>
      </article>;
    })}
  </div>;
}
