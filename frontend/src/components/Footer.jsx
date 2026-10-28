import HalftoneWordmarkFooter from './ui/halftone-wordmark-footer';
import BrandWordmark from './ui/brand-wordmark';
import { FOLIO_PATHS } from '../brand/folioMotion';
import './footer.css';

const COLUMNS = [
    { title: 'Explore MediSense', links: [
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Sample explanations', href: '#upload-samples' },
        { label: 'Our approach', href: '#features-grid' },
    ] },
    { title: 'Keep exploring', links: [
        { label: 'Analyze a document', href: '#upload-section' },
        { label: 'Reader experiences', href: '#reviews-section' },
        { label: 'Understanding lab tests', href: 'https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/' },
    ] },
];

export default function Footer() {
    return <div className="medisense-footer">
        <HalftoneWordmarkFooter label={<span className="footer-brand-lockup">
            <svg viewBox="0 0 256 256" width="76" height="76" aria-hidden="true" focusable="false">{FOLIO_PATHS.map(path => <path key={path} d={path} />)}</svg>
            <BrandWordmark revealOnView />
        </span>}
            meta="Medical information, in words you can use." columns={COLUMNS} />
    </div>;
}
