import SpringText from './ui/spring-text';
import TestimonialMarquee from './ui/marquee-01';
import {approvedReviews, sampleReviews} from '../data/reviews';
export default function ReviewsSection(){
 const approved=approvedReviews.filter(r=>r.approved&&r.quote&&r.name);
 const reviews=approved.length ? approved.map(r=>({...r, body:r.quote, username:r.role||''})) : sampleReviews;
 return <section id="reviews-section" className="testimonial-section" aria-labelledby="testimonials-title">
  <div className="testimonial-heading">
   <SpringText tag="h2" id="testimonials-title"><span className="reviews-heading-accent">Reviews</span> by our users</SpringText>
   {!approved.length && <p>Sample testimonials, shown for illustration.</p>}
  </div>
  <TestimonialMarquee reviews={reviews} illustrative={!approved.length}/>
 </section>;
}
