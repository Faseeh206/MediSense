import SpringText from './spring-text';
// Adapted from Ravi Katiyar's File Upload Card, retrieved through 21st.dev MCP.
// https://21st.dev/@ravikatiyar162/components/file-upload-card
import * as React from 'react';
import { UploadCloud, FileText, X, CheckCircle2, Trash2, LoaderCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './file-upload-card.css';

export interface UploadedFile {
    id: string;
    file: File;
    progress?: number | null;
    status: 'ready' | 'uploading' | 'analyzing' | 'completed' | 'error';
}
interface FileUploadCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    files: UploadedFile[];
    onFilesChange: (files: File[]) => void;
    onFileRemove: (id: string) => void;
    onClose?: () => void;
    heading?: string;
    description?: string;
    disabled?: boolean;
    error?: string;
    footer?: React.ReactNode;
}
function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(
    ({ className = '', files = [], onFilesChange, onFileRemove, onClose,
        heading = 'Upload your document', description = 'Choose a lab report or prescription to begin.',
        disabled = false, error, footer, ...props }, ref) => {
        const [isDragging, setIsDragging] = React.useState(false);
        const fileInputRef = React.useRef<HTMLInputElement>(null), dragDepth = React.useRef(0);
        const reduce = useReducedMotion();
        const inputId = React.useId(), helpId = React.useId(), errorId = React.useId();
        const dragging = isDragging && !disabled;
        const activeFile = files[0];
        const uploadState = activeFile?.status || 'idle';
        const transferring = uploadState === 'uploading';
        const analyzing = uploadState === 'analyzing';
        const transferProgress = typeof activeFile?.progress === 'number'
            ? Math.round(Math.max(0, Math.min(100, activeFile.progress))) : null;
        const acceptFiles = (incoming: File[]) => {
            dragDepth.current = 0; setIsDragging(false);
            if (!disabled && incoming.length) onFilesChange(incoming);
        };
        const fileDrag = (event: React.DragEvent) => {
            event.preventDefault(); event.stopPropagation();
            return event.dataTransfer.types.includes('Files');
        };
        return <motion.div ref={ref}
            initial={reduce ? false : { opacity: 0, transform: 'translateY(20px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduce ? 0 : 0.3 }}
            className={`fuc-card ${className}`} aria-busy={disabled} {...props}>
            <div className="fuc-main">
                <div className="fuc-header">
                    <div className="fuc-header-icon" aria-hidden="true"><UploadCloud size={24} strokeWidth={1.6} /></div>
                    <div className="fuc-heading"><SpringText tag="h3">{heading}</SpringText><p>{description}</p></div>
                    {onClose && <button type="button" className="fuc-icon-button" onClick={onClose} disabled={disabled} aria-label="Close document upload"><X size={16} /></button>}
                </div>
                <div className={`fuc-dropzone ${dragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`} data-state={uploadState}
                    onClick={event => { if (!disabled && event.target instanceof Element && !event.target.closest('button,input')) fileInputRef.current?.click(); }}
                    onDragEnter={event => { if (fileDrag(event) && !disabled) { dragDepth.current++; setIsDragging(true); } }}
                    onDragOver={event => { fileDrag(event); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; }}
                    onDragLeave={event => { fileDrag(event); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setIsDragging(false); }}
                    onDrop={event => { fileDrag(event); dragDepth.current = 0; setIsDragging(false); acceptFiles(Array.from(event.dataTransfer.files)); }}>
                    <input ref={fileInputRef} id={inputId} className="visually-hidden" type="file"
                        accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} tabIndex={-1}
                        aria-label="Choose your medical document" aria-describedby={helpId}
                        onChange={event => { acceptFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
                    <div className="fuc-upload-visual" data-state={uploadState} aria-hidden="true">
                        <UploadCloud className="fuc-drop-icon" size={40} strokeWidth={1.5} />
                        <FileText className="fuc-upload-paper" size={28} strokeWidth={1.5} />
                        <span className="fuc-upload-scan" />
                    </div>
                    <p className="fuc-drop-title">{transferring ? 'Uploading your document…' : analyzing ? 'Making sense of your document…' : dragging ? 'Drop your document here.' : 'Choose a file or drag & drop it here.'}</p>
                    <p className="fuc-drop-help" id={helpId}>{transferring
                        ? transferProgress === null ? 'Sending your document to the analysis service.' : `${transferProgress}% transferred · ${formatFileSize(activeFile!.file.size)}`
                        : analyzing ? 'Upload complete. Preparing your explanation.' : 'PDF, JPG or PNG · Up to 10 MB · One document'}</p>
                    <button type="button" className="fuc-browse" disabled={disabled} aria-describedby={error ? errorId : helpId}
                        onClick={() => fileInputRef.current?.click()}>{files.length ? 'Choose another file' : 'Browse file'}</button>
                </div>
                {error && <p id={errorId} role="alert" className="fuc-error"><AlertCircle size={17} />{error}</p>}
            </div>
            <AnimatePresence initial={false}>
                {files.length > 0 && <motion.div key="files" className="fuc-files"
                    initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2 }}>
                    <ul><AnimatePresence mode="wait">
                        {files.map(item => {
                            const known = typeof item.progress === 'number';
                            const progress = known ? Math.max(0, Math.min(100, item.progress!)) : 0;
                            const working = item.status === 'uploading' || item.status === 'analyzing';
                            const accepted = item.status === 'ready' || item.status === 'analyzing' || item.status === 'completed';
                            const displayedProgress = accepted ? 100 : progress;
                            const indeterminate = item.status === 'uploading' && !known;
                            const progressLabel = { ready: 'File selected', uploading: 'Upload progress', analyzing: 'Upload complete', completed: 'Analysis complete', error: 'Request needs attention' }[item.status];
                            const label = { ready: 'Ready to analyze', uploading: 'Uploading…', analyzing: 'Analyzing…', completed: 'Completed', error: 'Needs attention' }[item.status];
                            const extension = item.file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
                            return <motion.li key={`${item.id}:${item.file.name}:${item.file.size}:${item.file.lastModified}`} className="fuc-file" data-status={item.status}
                                initial={reduce ? false : { opacity: 0, transform: 'translateX(-20px)' }}
                                animate={{ opacity: 1, transform: 'translateX(0px)' }}
                                exit={{ opacity: 0, transform: reduce ? 'none' : 'translateX(-20px)' }}
                                transition={{ duration: reduce ? 0 : 0.3 }} layout={reduce ? false : 'position'}>
                                <span className="fuc-file-extension" aria-hidden="true">{extension}</span>
                                <div className="fuc-file-detail">
                                    <p className="fuc-file-name" title={item.file.name}>{item.file.name}</p>
                                    <div className="fuc-file-meta"><span>{item.status === 'uploading' && known ? `${formatFileSize(item.file.size * progress / 100)} of ${formatFileSize(item.file.size)}` : formatFileSize(item.file.size)}</span><span aria-hidden="true">·</span><span className="fuc-status" role="status">{label}</span></div>
                                    <div className="fuc-progress-meta"><span>{progressLabel}</span><strong>{indeterminate ? 'Sending…' : item.status === 'error' ? '' : `${Math.round(displayedProgress)}%`}</strong></div>
                                    <div className={`fuc-progress ${indeterminate ? 'is-indeterminate' : ''} ${accepted ? 'is-complete' : ''}`}
                                        role="progressbar" aria-label={item.status === 'ready' ? 'File selection' : item.status === 'completed' ? 'Document analysis' : 'Document upload'}
                                        aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate || item.status === 'error' ? undefined : Math.round(displayedProgress)}
                                        aria-valuetext={item.status === 'ready' ? 'File selected. Ready to analyze; not sent yet.' : item.status === 'analyzing' ? 'Upload complete. Analysis is in progress.' : item.status === 'error' ? 'Request failed. Your file is still selected.' : undefined}>
                                        <span style={indeterminate ? undefined : { transform: `scaleX(${item.status === 'error' ? 0 : displayedProgress / 100})` }} />
                                    </div>
                                </div>
                                <div className="fuc-file-actions">
                                    {accepted && <CheckCircle2 className="fuc-complete" size={22} aria-label={item.status === 'ready' ? 'File accepted' : item.status === 'analyzing' ? 'Upload complete' : 'Analysis complete'} />}
                                    {item.status === 'uploading' && <LoaderCircle className="fuc-spinner" size={19} aria-hidden="true" />}
                                    <button type="button" className="fuc-icon-button fuc-delete-button" disabled={disabled || working}
                                        aria-label={`Remove ${item.file.name}`} onClick={() => onFileRemove(item.id)}><Trash2 size={18} /></button>
                                </div>
                            </motion.li>;
                        })}
                    </AnimatePresence></ul>
                </motion.div>}
            </AnimatePresence>
            {footer && <div className="fuc-footer">{footer}</div>}
        </motion.div>;
    },
);
FileUploadCard.displayName = 'FileUploadCard';
