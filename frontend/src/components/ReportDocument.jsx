import { markerStatus, STATUS_LABEL } from '../utils/resultsPresentation';
import { fdaContexts, labelSummary, labelDisplayFields, labelSourceUrl, medicineInfoSections, isAIMedicineInformation } from '../utils/reportExport';
import { referenceInfo } from '../utils/referenceGuides';

function ReferenceCell({ marker }) {
    const reference = referenceInfo(marker);
    return <>{reference.isGeneral && <strong>General adult guide · </strong>}{reference.display}{reference.isGeneral && <><small>{reference.note}</small><small><a href={reference.source}>MedlinePlus guide</a></small></>}</>;
}

// Static, semantic content for both the paper preview and the isolated print root.
export default function ReportDocument({ report }) {
    return <article className="report-document">
        <header className="report-paper-header"><strong>MediSense</strong><span>Document summary</span></header>
        {report.isSample && <p className="report-paper-sample">Illustrative sample · No patient data · Medication context is sample content</p>}
        <h1>{report.title}</h1>
        <dl className="report-paper-meta"><div><dt>Document</dt><dd>{report.fileName}</dd></div><div><dt>Type</dt><dd>{report.type}</dd></div>{report.clinic && <div><dt>Source</dt><dd>{report.clinic}</dd></div>}{report.date && <div><dt>Analysis date</dt><dd>{report.date}</dd></div>}</dl>
        <section><h2>In plain language</h2><p>{report.explanation || 'No summary was supplied with this document.'}</p></section>
        {report.markers.length > 0 && <section><h2>Lab results</h2><table><thead><tr><th scope="col">Measurement</th><th scope="col">Result</th><th scope="col">Reference</th><th scope="col">Status</th></tr></thead><tbody>{report.markers.map((m, i) => <tr key={i}><th scope="row">{m.test_name || 'Unnamed measurement'}{m.clinical_meaning && <small>{m.clinical_meaning}</small>}</th><td>{m.observed_value ?? 'Not provided'} {m.unit}</td><td><ReferenceCell marker={m}/></td><td>{STATUS_LABEL[markerStatus(m)]}</td></tr>)}</tbody></table></section>}
        {report.medicines.length > 0 && <section><h2>Prescribed medicines</h2>{report.medicines.map((m, i) => <div className="report-paper-item" key={i}><h3>{m.brand_name || m.generic_name || 'Unnamed medicine'}</h3><dl>{[['generic_name','Generic name'],['dosage','Dose'],['form','Form'],['frequency_instructions','Directions'],['indication_summary','Purpose']].map(([field,label]) => m[field] && <div key={field}><dt>{label}</dt><dd>{m[field]}</dd></div>)}</dl></div>)}</section>}
        {report.specialist && <section><h2>For your next conversation</h2><h3>{report.specialist.specialist_name || 'Clinician review'}</h3><p>{[report.specialist.sub_title,report.specialist.department,report.specialist.urgency].filter(Boolean).join(' · ')}</p>{report.specialist.reason && <p>{report.specialist.reason}</p>}<ol>{(Array.isArray(report.specialist.questions) ? report.specialist.questions : []).map((q,i) => <li key={i}>{q}</li>)}</ol></section>}
        {report.fda && report.fda.information_status !== 'not_applicable' && <section><h2>{isAIMedicineInformation(report.fda) ? 'General medicine information' : 'Medication label context'}</h2>{fdaContexts(report.fda).map((context, index) => isAIMedicineInformation(context) ? <div key={index}><h3>{context.medicine_name || 'Medicine'}</h3><p>AI-generated general information; not independently verified or a complete medication label.</p>{medicineInfoSections(context).map(([field,label,text]) => <div className="report-paper-item" key={field}><h3>{label}</h3><p>{text}</p></div>)}{context.information_status !== 'ready' && <p>{context.note}</p>}</div> : <div key={index}><h3>{context.matched_brand || context.searched_term || 'Medication lookup'}</h3>{context.found === true ? <>{[context.matched_generic,context.drug_class].filter(Boolean).length > 0 && <p>{[context.matched_generic,context.drug_class].filter(Boolean).join(' · ')}</p>}{labelSummary(context) && <p>AI summary of the matched label; not the complete medication label.</p>}{labelDisplayFields(context).map(([field,label,value]) => <div className="report-paper-item" key={field}><h3>{label}</h3><p>{value}</p></div>)}{context.source && <p>Source: {context.source}</p>}{labelSourceUrl(context) && <p>Full label: <a href={labelSourceUrl(context)}>{labelSourceUrl(context)}</a></p>}</> : <p>{context.note || 'No matching medication label information was supplied.'}</p>}</div>)}</section>}
        <footer><strong>For understanding and conversation.</strong><p>{report.disclaimer}</p></footer>
    </article>;
}
