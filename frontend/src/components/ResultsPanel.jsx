import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpLeft, ArrowUpRight, CalendarDays, FileText, Printer, Share2 } from 'lucide-react';
import SpringText from './ui/spring-text';
import SummaryCard from './SummaryCard';
import BiomarkerTable from './BiomarkerTable';
import MedicineCard from './MedicineCard';
import FdaSafetyPanel from './FdaSafetyPanel';
import SpecialistCard from './SpecialistCard';
import ReportDocument from './ReportDocument';
import ReportToolsDialog from './ReportToolsDialog';
import { reportModel } from '../utils/resultsPresentation';
import './results-panel.css';

export default function ResultsPanel({ data, onReset }) {
    const report = useMemo(() => reportModel(data || {}), [data]);
    const [tool, setTool] = useState(null);
    if (!data) return null;
    return <section id="results-section" className="results-panel" aria-label={report.isSample ? 'Sample explanation' : 'Document explanation'}>
        {report.isSample && <div className="result-sample-notice"><p><strong>Sample explanation</strong>For illustration · No patient data or live medication lookup.</p><a href="#upload-samples">Choose another sample <ArrowUpRight size={15}/></a></div>}
        <header className="result-header"><div className="result-document-meta"><span className="result-document-type"><FileText size={15}/>{report.type}</span><span>{report.fileName}</span>{report.date && <span><CalendarDays size={14}/>{report.date}</span>}</div><SpringText tag="h2">{report.title}</SpringText>{report.clinic && <p>{report.clinic}</p>}</header>
        <div className="result-toolbar" role="group" aria-label="Report actions"><button type="button" className="result-action result-action--reset" onClick={onReset}><ArrowUpLeft size={19}/><span>Scan another document</span></button><div><button type="button" className="result-action result-action--primary" onClick={() => setTool('print')}><Printer size={18}/><span>Print summary report</span><ArrowUpRight size={17}/></button><button type="button" className="result-action" onClick={() => setTool('share')}><Share2 size={18}/><span>Share summary</span></button></div></div>
        <div className="result-overview"><SummaryCard summaryText={report.explanation}/><aside className="result-surface result-glance" aria-label="Document overview"><SpringText tag="h3">At a glance</SpringText>{report.markers.length > 0 ? <><div className="result-glance-main"><strong>{report.attention.length}</strong><span>results to discuss<br/>with your clinician</span></div><dl><div><dt>Measurements</dt><dd>{report.markers.length}</dd></div><div><dt>Within reference</dt><dd>{report.normal.length}</dd></div>{report.unknown.length > 0 && <div><dt>Not classified</dt><dd>{report.unknown.length}</dd></div>}</dl></> : <><div className="result-glance-main"><strong>{report.medicines.length}</strong><span>medicines identified<br/>in your document</span></div><p>{report.fda?.found === true ? report.isSample ? 'Illustrative medication label context is included below.' : report.fda?.information_status === 'ready' ? 'Concise medicine insights are included below.' : 'Saved medication label context is included below.' : 'Review the supplied prescription details below.'}</p></>}<p className="result-glance-note">A clearer starting point for a conversation, not a diagnosis.</p></aside></div>
        {report.markers.length > 0 && <BiomarkerTable biomarkers={report.markers}/>}
        {report.medicines.length > 0 && <section className="result-prescription" aria-labelledby="result-prescription-title"><div className="result-section-heading"><div><SpringText tag="h3" id="result-prescription-title">Your prescription, explained.</SpringText><p>The medicines and directions recorded in your document.</p></div></div><div className="result-medicine-list">{report.medicines.map((medicine,i) => <MedicineCard key={i} medicine={medicine}/>)}</div></section>}
        <SpecialistCard specialist={report.specialist}/><FdaSafetyPanel fdaData={report.fda} isSample={report.isSample}/>
        <footer className="result-disclaimer"><strong>For understanding. For better conversations.</strong><p>{report.disclaimer}</p></footer>
        {createPortal(<div className="report-print-root"><ReportDocument report={report}/></div>, document.body)}
        {tool && <ReportToolsDialog key={`${tool}-${report.fileName}`} mode={tool} report={report} onClose={() => setTool(null)}/>}
    </section>;
}
