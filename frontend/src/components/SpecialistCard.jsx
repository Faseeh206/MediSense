import { Stethoscope, ArrowUpRight } from 'lucide-react';
import SpringText from './ui/spring-text';
export default function SpecialistCard({ specialist }) {
    if (!specialist) return null;
    const questions = Array.isArray(specialist.questions) ? specialist.questions : [];
    return <section className="result-surface result-conversation" aria-labelledby="result-conversation-title"><div className="result-section-heading"><SpringText tag="h3" id="result-conversation-title">For your next conversation</SpringText><Stethoscope size={24} aria-hidden="true"/></div>
        <div className="result-specialist"><div><span>Suggested clinician</span><SpringText tag="h4">{specialist.specialist_name || 'Discuss with your clinician'}</SpringText>{(specialist.sub_title || specialist.department) && <p>{[specialist.sub_title,specialist.department].filter(Boolean).join(' · ')}</p>}</div>{specialist.urgency && <span className="result-urgency">{specialist.urgency}</span>}</div>
        {specialist.reason && <p className="result-clinician-reason">{specialist.reason}</p>}
        {questions.length > 0 && <><SpringText tag="h4" className="result-questions-heading">Questions worth bringing</SpringText><ol className="result-questions">{questions.map((q,i) => <li key={i}><p>{q}</p><ArrowUpRight size={17} aria-hidden="true"/></li>)}</ol></>}
    </section>;
}
