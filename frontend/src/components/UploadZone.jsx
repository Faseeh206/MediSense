import SpringText from './ui/spring-text';
import { useEffect, useRef, useState } from 'react';
import { Activity, Pill, ScanLine, Check, ArrowRight, ArrowUpRight } from 'lucide-react';
import { uploadAndAnalyze } from '../utils/api';
import { resolveUploadLimit, validateUpload } from '../utils/validateUpload';
import { FileUploadCard } from './ui/file-upload-card';
import { toast } from 'sonner';
import AnalyzeDocumentButton from './ui/analyze-document-button';
import SampleDocuments from './SampleDocuments';
import './upload-zone.css';

const TYPES = [
    { id: 'LAB_REPORT', label: 'Lab report', detail: 'Blood tests, panels & results', icon: Activity },
    { id: 'PRESCRIPTION', label: 'Prescription', detail: 'Medicines & treatment notes', icon: Pill },
];

export default function UploadZone({ onAnalysisSuccess, onSelectSample, activeSampleKey, maxUploadBytes, requiresDemoDocument = true, historyAvailable = true }) {
    const maximumBytes = resolveUploadLimit(maxUploadBytes);
    const [type, setType] = useState(''), [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [status, setStatus] = useState('ready'), [progress, setProgress] = useState(null);
    const [sampleBusy, setSampleBusy] = useState(false);
    const [demoConfirmed, setDemoConfirmed] = useState(false);
    const locked = busy || sampleBusy;
    const running = useRef(false), request = useRef(null);
    useEffect(() => () => {
        request.current?.abort(); request.current = null; running.current = false;
    }, []);
    const select = incoming => {
        if (running.current) return;
        if (incoming.length > 1) { setError('Please select one document at a time.'); return; }
        if (!incoming.length) return;
        const message = validateUpload(incoming[0], maximumBytes);
        setError(message);
        if (message) return;
        setFile(incoming[0]); setStatus('ready'); setProgress(null); setDemoConfirmed(false);
    };
    const remove = () => {
        if (running.current) return;
        setFile(null); setError(''); setStatus('ready'); setProgress(null); setDemoConfirmed(false);
    };
    const submit = async () => {
        if (!file || running.current) return;
        if (requiresDemoDocument && !demoConfirmed) { setError('Confirm that this is a fictional sample with no personal or confidential information.'); return; }
        const message = validateUpload(file, maximumBytes);
        if (message) { setError(message); return; }
        running.current = true;
        const controller = new AbortController();
        request.current = controller;
        setBusy(true); setError(''); setStatus('uploading'); setProgress(null);
        try {
            const result = await uploadAndAnalyze({
                file, documentType: type, signal: controller.signal, demoDocumentConfirmed: demoConfirmed,
                onUploadProgress: value => setProgress(value), onUploaded: () => setStatus('analyzing'),
            });
            if (controller.signal.aborted) return;
            toast.success('Your explanation is ready'); onAnalysisSuccess(result);
            setStatus('completed'); setProgress(100);
        } catch (err) {
            if (controller.signal.aborted) return;
            setStatus('error');
            setError(err instanceof TypeError
                ? 'The analysis service is unavailable. Your document is still selected; please try again when the service is running.'
                : err.message || 'We could not analyze this document. Please try again.');
        } finally {
            if (request.current === controller) { request.current = null; running.current = false; setBusy(false); }
        }
    };
    const selectedFiles = file ? [{ id: 'selected-document', file, progress, status }] : [];
    const description = type === 'LAB_REPORT' ? 'Bring your results into clearer focus.'
        : type === 'PRESCRIPTION' ? 'Start with the medicines on your prescription.'
            : 'A lab report or prescription. Start with what you have.';
    return <section id="upload-section" className="document-intake section-shell" aria-labelledby="intake-title">
        <div className="intake-story">
            <SpringText tag="h2" id="intake-title">Clarity starts<br />with <em>one document.</em></SpringText>
            <p className="intake-lead">A blood test. A prescription. A question that has been on your mind. Let’s make it easier to understand.</p>
            <fieldset className="intake-type-picker" disabled={locked}>
                <legend>What are you sharing?</legend>
                <div className="intake-document-options">
                    {TYPES.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" data-document-type={id} aria-pressed={type === id} onClick={() => setType(id)}>
                        <Icon size={29} strokeWidth={1.6} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span>
                        <span className="intake-type-mark" aria-hidden="true">{type === id ? <Check size={17} /> : <ArrowUpRight size={17} />}</span>
                    </button>)}
                </div>
                <button type="button" className="intake-auto" aria-pressed={type === ''} onClick={() => setType('')}>
                    <ScanLine size={17} aria-hidden="true" />{type === '' ? 'Auto-detect is on' : 'Not sure? Auto-detect for me'}{type === '' && <Check size={15} aria-hidden="true" />}
                </button>
            </fieldset>
            <div className="intake-handoff"><span className="intake-handoff-line" aria-hidden="true" /><p>You choose the document.<br /><strong>We help you find the words.</strong></p><ArrowRight size={26} strokeWidth={1.3} aria-hidden="true" /></div>
        </div>
        <div className="intake-workspace">
            <div className="intake-workspace-meta"><span>No account needed</span><span>One document at a time</span></div>
            {requiresDemoDocument && <p className="intake-demo-policy">Free demonstration: fictional sample documents only. Do not upload real patient records or personal or confidential information.</p>}
            <FileUploadCard files={selectedFiles} onFilesChange={select} onFileRemove={remove} description={description} disabled={locked} error={error} maxUploadBytes={maximumBytes}
                footer={file ? <>
                    {requiresDemoDocument && status !== 'completed' && <label className="intake-demo-consent"><input type="checkbox" checked={demoConfirmed} disabled={locked} onChange={event => setDemoConfirmed(event.target.checked)} /><span>I confirm this is a fictional sample with no personal or confidential information.</span></label>}
                    {status === 'completed' ? <AnalyzeDocumentButton href="#results-section">View explanation</AnalyzeDocumentButton> : <AnalyzeDocumentButton disabled={locked || requiresDemoDocument && !demoConfirmed} onClick={submit}>
                        {busy ? status === 'uploading' ? 'Uploading document…' : 'Analyzing document…' : status === 'error' ? 'Try analysis again' : 'Analyze document'}
                    </AnalyzeDocumentButton>}
                    <p className="intake-send-note">{status === 'completed' ? 'Analysis complete. Your explanation is ready to view.' : busy ? status === 'uploading' ? 'Sending your document to the analysis service.' : 'Upload received. Your explanation is being prepared.' : 'Ready to send when you choose “Analyze document.”'}</p>
                </> : <p className="intake-local-note"><span aria-hidden="true" />Your file stays on this page until you choose to analyze it.</p>} />
            <p className="intake-history-note">Your document is sent for analysis when you choose “Analyze document.” {historyAvailable ? 'Results are available in your scan history.' : 'History is unavailable in this demo. Print or download your explanation to keep it.'}</p>
        </div>
        <SampleDocuments onSelectSample={onSelectSample} onLoadingChange={setSampleBusy} disabled={busy} activeSampleKey={activeSampleKey} />
        <p className="intake-clinician-note">For understanding and conversation. Always review your results with a qualified clinician.</p>
    </section>;
}
