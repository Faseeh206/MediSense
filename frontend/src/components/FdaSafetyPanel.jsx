import { useId } from 'react';
import { ShieldCheck, Info, TriangleAlert } from 'lucide-react';
import SpringText from './ui/spring-text';
import { FDA_FIELDS, FDA_SUMMARY_FIELDS, fdaContexts, labelSummary, labelSourceUrl, medicineInfoSections, isAIMedicineInformation } from '../utils/reportExport';
export default function FdaSafetyPanel({ fdaData, isSample = false }) {
    const headingId = useId();
    if (!fdaData) return null;
    if (Array.isArray(fdaData.medications) && fdaData.medications.length) return fdaContexts(fdaData).map((context, index) => <FdaSafetyPanel key={`${context.searched_term || 'medicine'}-${index}`} fdaData={context} isSample={isSample}/>);
    if (isAIMedicineInformation(fdaData)) {
        if (fdaData.information_status === 'not_applicable') return null;
        const sections = medicineInfoSections(fdaData);
        return <section className="result-surface result-fda" aria-labelledby={headingId}>
            <div className="result-section-heading"><div><SpringText tag="h3" id={headingId}>Your medicine, in plain language.</SpringText><p>{fdaData.medicine_name}{fdaData.generic_name && fdaData.generic_name !== fdaData.medicine_name ? ` · ${fdaData.generic_name}` : ''}</p></div><Info size={24} aria-hidden="true"/></div>
            <p className="result-source-disclosure">AI-generated medicine insights · General information, not independently verified.</p>
            {sections.length ? <div className="result-label-sections">{sections.map(([field,label,text]) => <div className="result-label-section" key={field}><SpringText tag="h4">{label}</SpringText><p>{text}</p></div>)}</div> : <p className="result-source-disclosure">{fdaData.note || 'Medicine information is unavailable. Your prescription details are shown above.'}</p>}
        </section>;
    }
    if (fdaData.found !== true) return <aside className="result-source-note"><Info size={18}/><p>{fdaData.searched_term && <strong>{fdaData.searched_term} · </strong>}{fdaData.note || 'No matching medication label information was supplied.'}</p></aside>;
    const short = labelSummary(fdaData), sourceUrl = labelSourceUrl(fdaData);
    return <section className="result-surface result-fda" aria-labelledby={headingId}><div className="result-section-heading"><div><SpringText tag="h3" id={headingId}>Medication label, made clear.</SpringText><p>{fdaData.matched_brand || fdaData.searched_term}{fdaData.drug_class ? ` · ${fdaData.drug_class}` : ''}</p></div><ShieldCheck size={24} aria-hidden="true"/></div>
        {isSample && <p className="result-source-disclosure">Illustrative label information, not a live lookup.</p>}
        <p className="result-source-disclosure">{short ? 'A short AI explanation of the matched label. It may omit details; the full source is available below.' : 'A short summary is not available for this result. You can read the original label below.'}</p>
        {short && <div className="result-label-sections">{FDA_SUMMARY_FIELDS.filter(([field]) => short[field]).map(([field,label]) => <div className={field === 'boxed_warning' ? 'result-label-section result-label-warning' : 'result-label-section'} key={field}><SpringText tag="h4">{field === 'boxed_warning' && <TriangleAlert size={17}/>}{label}</SpringText><p>{short[field]}</p></div>)}</div>}
        {!short && fdaData.boxed_warning && <div className="result-label-section result-label-warning"><SpringText tag="h4"><TriangleAlert size={17}/>This label has a boxed warning</SpringText><p>Read the full boxed warning in the label below.</p></div>}
        <details className="result-label-source"><summary>Read full medication label</summary><div className="result-label-sections">{FDA_FIELDS.filter(([field]) => field !== 'fda_plain_summary' && fdaData[field]).map(([field,label]) => <div className={field === 'boxed_warning' ? 'result-label-section result-label-warning' : 'result-label-section'} key={field}><SpringText tag="h4">{label}</SpringText><p>{fdaData[field]}</p></div>)}</div></details>
        {fdaData.source && <p className="result-source-credit">Source · {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{fdaData.source}</a> : fdaData.source}</p>}
    </section>;
}

