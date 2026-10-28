import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Card, CardContent } from './card';
import { Marquee } from './marquee-01-utils/marquee';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './marquee-01.css';

interface Review { id: string; name: string; username?: string; body: string; profile?: string }
interface TestimonialMarqueeProps { reviews: Review[]; illustrative?: boolean }

function ReviewCard({ name, username, body, profile }: Review) {
  const initials = name.split(' ').map(part => part[0]).slice(0, 2).join('');
  return <Card className="testimonial-card">
    <CardContent className="testimonial-card-content">
      <div className="testimonial-person">
        {profile ? <img className="testimonial-avatar" width={44} height={44} src={profile} alt="" loading="lazy" />
          : <span className="testimonial-avatar" aria-hidden="true">{initials}</span>}
        <div className="testimonial-attribution"><p className="testimonial-name">{name}</p><p className="testimonial-username">{username || 'MediSense reader'}</p></div>
      </div>
      <blockquote className="testimonial-body" title={body}>“{body}”</blockquote>
    </CardContent>
  </Card>;
}

export default function TestimonialMarquee({ reviews, illustrative = false }: TestimonialMarqueeProps) {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const midpoint = Math.max(1, Math.floor(reviews.length / 2));
  const groups = [reviews.slice(0, midpoint), reviews.slice(midpoint)].filter(group => group.length);
  return <div className="testimonial-marquee">
    <div className="testimonial-rows">
      {groups.map((group, row) => <Marquee key={row} reverse={row === 1} pauseOnHover paused={paused}
        label={`${illustrative ? 'Sample testimonials' : 'Reader reviews'}, row ${row + 1}`}>
        {group.map(review => <ReviewCard key={review.id} {...review} />)}
      </Marquee>)}
    </div>
    <div className="testimonial-meta">
      <p>{illustrative ? 'Sample testimonials · Names and quotes are illustrative.' : 'Shared with permission.'}</p>
      {!reduced && <button type="button" className="testimonial-pause" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Resume reviews' : 'Pause reviews'}
      </button>}
    </div>
  </div>;
}
