import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, Printer, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import ReportDocument from './ReportDocument';
import { copySummary, downloadSummary, shareSummary, summaryText } from '../utils/reportExport';

export default function ReportToolsDialog({ mode, report, onClose }) {
    const dialog = useRef(null), textArea = useRef(null);
    const [copyState, setCopyState] = useState('idle'), [sharing, setSharing] = useState(false);
    const nativeShare = typeof navigator.share === 'function';
    useEffect(() => {
        const node = dialog.current, previous = document.activeElement;
        const overflow = document.documentElement.style.overflow;
        node.showModal(); document.documentElement.style.overflow = 'hidden';
        return () => { node.close(); document.documentElement.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
    }, []);
    const copy = async () => {
        setCopyState('copying');
        try { await copySummary(summaryText(report)); setCopyState('copied'); toast.success('The document summary is copied.'); }
        catch { setCopyState('error'); textArea.current?.focus(); textArea.current?.select(); }
    };
    const share = async () => {
        setSharing(true);
        try { const result = await shareSummary(report); if (result === 'unavailable') toast.info('Use Copy summary or Download text on this browser.'); }
        catch { toast.error('Sharing could not open. You can copy or download the summary instead.'); }
        finally { setSharing(false); }
    };
    return createPortal(<dialog ref={dialog} data-lenis-prevent className={`report-tools-dialog report-tools-dialog--${mode}`} aria-labelledby="report-tools-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose();
    }}>
        <div className="report-tools-top"><div><h2 id="report-tools-title">{mode === 'print' ? 'Your summary, on paper.' : 'Keep the clarity close.'}</h2><p>{mode === 'print' ? 'A clean report with all measurements, explanations and questions.' : 'Share the summary itself, or keep a copy for your next appointment.'}</p></div><button type="button" className="result-icon-button" aria-label="Close report tools" onClick={onClose}><X size={20}/></button></div>
        {mode === 'print' ? <><div className="report-tools-actions"><span>Print it or choose “Save as PDF” in your print options. On a small screen, swipe across the paper preview.</span><button type="button" className="result-action result-action--primary" onClick={() => window.print()}><Printer size={18}/>Print or save PDF</button></div><div className="report-preview"><ReportDocument report={report}/></div></> : <div className="report-share-body">
            <div className="report-share-actions">{nativeShare && <button type="button" className="result-action result-action--primary" disabled={sharing} onClick={share}><Share2 size={18}/>{sharing ? 'Opening…' : 'Share summary'}</button>}<button type="button" className="result-action" disabled={copyState === 'copying'} onClick={copy}>{copyState === 'copied' ? <Check size={18}/> : <Copy size={18}/>} {copyState === 'copied' ? 'Copied' : 'Copy summary'}</button><button type="button" className="result-action" onClick={() => downloadSummary(report)}><Download size={18}/>Download text</button></div>
            <label htmlFor="report-summary-text">Your document summary</label><p className="report-share-note">Only the text below is included. Choose where to send it.</p><textarea ref={textArea} id="report-summary-text" readOnly value={summaryText(report)}/>
            <p className={copyState === 'error' ? 'report-copy-error' : 'report-share-note'} role="status">{copyState === 'error' ? 'Copy was blocked. The summary is selected; use your device’s Copy command.' : copyState === 'copied' ? 'Copied successfully. You can paste it wherever you choose.' : 'You can also select and copy the text yourself.'}</p>
        </div>}
    </dialog>, document.body);
}
