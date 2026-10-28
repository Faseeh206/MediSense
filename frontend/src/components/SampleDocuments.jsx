import SpringText from './ui/spring-text';
import { useEffect, useRef, useState } from 'react';
import { Activity, Pill, ArrowUpRight, LoaderCircle, BookOpen, Check } from 'lucide-react';
import { SAMPLES } from '../utils/constants';
import { getSampleReport } from '../utils/sampleReports';
import { useActionMotion } from '../hooks/useActionMotion';
import './sample-documents.css';

const PREVIEWS = {
    sample_lipid_glucose: [['Fasting glucose', '118 mg/dL'], ['Total cholesterol', '238 mg/dL']],
    sample_cbc_anemia: [['Hemoglobin', '10.4 g/dL'], ['Report type', 'Blood count']],
    sample_prescription_metformin: [['Medication', 'Metformin'], ['Medication', 'Lisinopril']],
    sample_prescription_amoxicillin: [['Medication', 'Amoxicillin'], ['Medication', 'Albuterol']],
};

export default function SampleDocuments({ onSelectSample, onLoadingChange, disabled, activeSampleKey }) {
    const [loading, setLoading] = useState(null), [error, setError] = useState('');
    const busy = useRef(false), mounted = useRef(true);
    const grid = useRef(null);
    useActionMotion(grid, disabled || Boolean(loading));
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const open = async sample => {
        if (busy.current || disabled) return;
        busy.current = true; setLoading(sample.key); setError(''); onLoadingChange(true);
        try {
            const report = await getSampleReport(sample.key);
            if (mounted.current) onSelectSample(report);
        } catch {
            if (mounted.current) setError('This sample could not be opened. Please try again.');
        } finally {
            busy.current = false;
            if (mounted.current) { setLoading(null); onLoadingChange(false); }
        }
    };
    return <div id="upload-samples" className="intake-samples" aria-labelledby="intake-samples-title">
        <div className="intake-samples-heading">
            <div><SpringText tag="h3" id="intake-samples-title">Try a sample first.</SpringText><p>A little preview of what understanding can look like.</p></div>
            <span className="intake-samples-note"><BookOpen size={17} aria-hidden="true" /> Illustrative samples · No patient data</span>
        </div>
        <div className="intake-sample-grid" ref={grid}>
            {SAMPLES.map((sample, index) => {
                const Icon = sample.type === 'LAB_REPORT' ? Activity : Pill;
                const opening = loading === sample.key, active = activeSampleKey === sample.key;
                return <article key={sample.key} className="intake-sample-card" data-motion-action data-tone={index}
                    data-selected={active} data-disabled={disabled || Boolean(loading)} aria-busy={opening}>
                    <div className="intake-sample-type"><Icon size={20} strokeWidth={1.6} aria-hidden="true" /><span>{sample.type === 'LAB_REPORT' ? 'Lab report' : 'Prescription'}</span><small>{sample.badge}</small></div>
                    <SpringText tag="h4">{sample.title}</SpringText>
                    <dl className="intake-sample-preview">{PREVIEWS[sample.key].map(([label, value], row) => <div key={row}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                    <div className="intake-sample-action"><button type="button" onClick={() => open(sample)} disabled={disabled || Boolean(loading)} aria-label={`Open sample: ${sample.title}`}>
                        {opening ? 'Opening sample…' : active ? 'View explanation again' : 'Open explanation'}
                        {opening ? <LoaderCircle className="intake-sample-spinner" size={17} aria-hidden="true" /> : <ArrowUpRight data-motion-arrow size={17} aria-hidden="true" />}
                    </button>{active && <Check size={16} aria-label="Current sample" />}</div>
                </article>;
            })}
        </div>
        {error && <p className="intake-sample-error" role="alert">{error}</p>}
    </div>;
}
