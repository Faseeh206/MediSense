import SpringText from './ui/spring-text';
import { useEffect, useRef, useState } from 'react';
import { X, Trash2, FileText, Activity, Pill, ArrowUpRight, RotateCcw, AlertCircle } from 'lucide-react';
import { deleteHistoryRecord } from '../utils/api';
import { historyRows } from '../utils/historyPresentation';
import AnalyzeDocumentButton from './ui/analyze-document-button';
import './history-drawer.css';

export default function HistoryDrawer({
    isOpen, onClose, historyList = [], onSelectRecord, onRefreshHistory,
    loading = false, error = '', onDeleteRecord = deleteHistoryRecord,
}) {
    const dialog = useRef(null);
    const [confirmId, setConfirmId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [removeError, setRemoveError] = useState('');
    const [removed, setRemoved] = useState([]);
    const [announcement, setAnnouncement] = useState('');
    const removing = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        const panel = dialog.current, previous = document.activeElement;
        const root = document.documentElement, overflow = root.style.overflow;
        panel.showModal();
        root.style.overflow = 'hidden';
        panel.querySelector('[data-history-close]').focus();
        return () => {
            panel.close();
            root.style.overflow = overflow;
            if (previous?.isConnected) previous.focus({ preventScroll: true });
        };
    }, [isOpen]);

    const rows = historyRows(historyList.filter(item => !removed.includes(item.id)));
    const groups = new Map();
    rows.forEach(row => { if (!groups.has(row.group)) groups.set(row.group, []); groups.get(row.group).push(row); });
    const handleClose = () => { setConfirmId(null); setRemoveError(''); setAnnouncement(''); onClose(); };
    const remove = async id => {
        if (removing.current) return;
        removing.current = true; setDeletingId(id); setRemoveError('');
        try {
            await onDeleteRecord(id);
            setRemoved(current => [...current, id]);
            setConfirmId(null);
            dialog.current?.querySelector('[data-history-close]')?.focus();
            setAnnouncement('Scan removed from history.');
            await onRefreshHistory?.();
        } catch {
            setRemoveError('This scan could not be removed. Please try again.');
        } finally {
            removing.current = false; setDeletingId(null);
        }
    };
    const outside = event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) handleClose();
    };
    const keepFocus = event => {
        if (event.key !== 'Tab') return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled), a[href]')];
        const first = controls[0], last = controls.at(-1);
        if (!dialog.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const cancelRemoval = () => {
        dialog.current.querySelector('.scan-history-remove[aria-expanded="true"]')?.focus();
        setConfirmId(null); setRemoveError('');
    };

    return <dialog ref={dialog} className="scan-history" aria-labelledby="scan-history-title" aria-describedby="scan-history-description"
        data-lenis-prevent onClick={outside} onKeyDown={keepFocus} onCancel={event => { event.preventDefault(); handleClose(); }}>
        <div className="scan-history-layout">
            <header className="scan-history-header">
                <div className="scan-history-heading"><SpringText tag="h2" id="scan-history-title">Your scan history.</SpringText>
                    <button type="button" className="scan-history-close" aria-label="Close scan history" data-history-close onClick={handleClose}><X size={21} /></button></div>
                <p id="scan-history-description">Your recent reports and prescriptions, ready to revisit.</p>
            </header>
            <div className="scan-history-content" aria-busy={loading}>
                {loading && rows.length === 0 ? <div className="scan-history-status" role="status">
                    <div className="scan-history-loading" aria-hidden="true"><span /><span /><span /></div>
                    <SpringText tag="h3">Finding your recent scans…</SpringText><p>Your saved explanations will appear here.</p>
                </div> : error && rows.length === 0 ? <div className="scan-history-status" role="alert">
                    <span className="scan-history-status-icon"><AlertCircle size={31} strokeWidth={1.4} /></span>
                    <SpringText tag="h3">Your scans couldn’t be loaded.</SpringText><p>Please try again to see your saved explanations.</p>
                    <button type="button" className="scan-history-retry" onClick={onRefreshHistory}><RotateCcw size={16} /> Try again</button>
                </div> : rows.length === 0 ? <div className="scan-history-status">
                    <span className="scan-history-status-icon"><FileText size={34} strokeWidth={1.3} /></span>
                    <SpringText tag="h3">Your next bit of clarity<br />belongs here.</SpringText><p>Analyze a lab report or prescription. You can return to its explanation here afterwards.</p>
                </div> : <>
                    <div className="scan-history-list-heading"><span>{rows.length} recent {rows.length === 1 ? 'scan' : 'scans'}</span><span>{loading ? 'Updating…' : 'Newest first'}</span></div>
                    {error && <p className="scan-history-refresh-error" role="status">Couldn’t refresh your scans. Showing the last loaded list. <button type="button" onClick={onRefreshHistory}>Try again</button></p>}
                    {[...groups].map(([group, items]) => <section className="scan-history-group" key={group} aria-label={group}>
                        <SpringText tag="h3">{group}</SpringText><ul>{items.map(({ record, name, label, tone, date, dateTime }) => {
                            const Icon = tone === 'lab' ? Activity : tone === 'prescription' ? Pill : FileText;
                            const confirming = confirmId === record.id, deleting = deletingId === record.id;
                            return <li key={record.id} className="scan-history-record" data-type={tone}>
                                <button type="button" className="scan-history-open" aria-label={`Open explanation for ${name}`}
                                    onClick={() => { onSelectRecord(record); handleClose(); }}>
                                    <span className="scan-history-file-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.5} /></span>
                                    <span className="scan-history-record-body"><span className="scan-history-type">{label}</span>
                                        <strong className="scan-history-filename">{name}</strong>
                                        <time dateTime={dateTime || undefined}>{date}</time>
                                        <span className="scan-history-open-label">Open explanation <ArrowUpRight size={15} aria-hidden="true" /></span>
                                    </span>
                                </button>
                                <button type="button" className="scan-history-remove" aria-label={`Remove ${name} from history`} aria-expanded={confirming}
                                    disabled={deletingId !== null} onClick={() => { setConfirmId(confirming ? null : record.id); setRemoveError(''); }}><Trash2 size={17} strokeWidth={1.5} /></button>
                                {confirming && <div className="scan-history-confirm" role="group" aria-label={`Remove ${name}`}>
                                    <p><strong>Remove this scan?</strong> Its saved explanation will be permanently deleted.</p>
                                    {removeError && <p className="scan-history-remove-error" role="alert">{removeError}</p>}
                                    <div><button type="button" disabled={deleting} onClick={cancelRemoval}>Keep scan</button>
                                        <button type="button" className="scan-history-confirm-remove" disabled={deleting} onClick={() => remove(record.id)}>{deleting ? 'Removing…' : 'Remove scan'}</button></div>
                                </div>}
                            </li>;
                        })}</ul>
                    </section>)}
                </>}
            </div>
            <footer className="scan-history-footer"><AnalyzeDocumentButton href="#upload-section" onClick={handleClose}>Analyze a document</AnalyzeDocumentButton>
                <p role="status">{announcement || 'Return to an explanation whenever you need it.'}</p></footer>
        </div>
    </dialog>;
}
