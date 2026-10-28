import { ArrowUpRight } from 'lucide-react';
import SpringText from './ui/spring-text';
import HorizontalChapter from './HorizontalChapter';
import { ClinicalDetailArtwork, ClinicalSourceArtwork, ClinicalConversationArtwork } from './ui/clinical-editorial-art';
import './clinical-precision.css';

export default function FeaturesGrid() {
    return <HorizontalChapter id="features-grid" kicker="Engineered for"
        title={<>Clinical precision.<br /><em>Human dignity.</em></>}
        description="Thoughtfully considered, from the first unfamiliar term to the questions you bring to your clinician."
        count={3} variant="precision-chapter" showProgress={false}>
        <article className="precision-panel precision-panel--detail" data-panel="0">
            <div className="precision-copy">
                <span className="section-kicker">Read with care</span>
                <SpringText tag="h3">Small details.<br /><em>A fuller picture.</em></SpringText>
                <p>From structured lab tables to handwritten prescriptions, document analysis brings the important information into focus.</p>
                <a className="text-link" href="#upload-section">Start with your document <ArrowUpRight size={17} /></a>
            </div>
            <ClinicalDetailArtwork />
        </article>
        <article className="precision-panel precision-panel--source" data-panel="1">
            <ClinicalSourceArtwork />
            <div className="precision-copy">
                <span className="section-kicker">Understand the source</span>
                <SpringText tag="h3">Information with<br /><em>a point of reference.</em></SpringText>
                <p>Get concise, plain-language explanations of common medicine uses, important warnings, and possible side effects alongside your prescription.</p>
                <p className="precision-footnote">AI-generated information is not independently verified. Confirm medicine questions with your clinician or pharmacist.</p>
            </div>
        </article>
        <article className="precision-panel precision-panel--conversation" data-panel="2">
            <div className="precision-copy">
                <span className="section-kicker">Stay in the conversation</span>
                <SpringText tag="h3">Your questions<br /><em>matter.</em></SpringText>
                <p>Plain-language explanations and suggested questions help you prepare for an appointment. Your clinician remains your partner in care.</p>
                <a className="text-link" href="#how-it-works">How it works <ArrowUpRight size={17} /></a>
            </div>
            <ClinicalConversationArtwork />
        </article>
    </HorizontalChapter>;
}
