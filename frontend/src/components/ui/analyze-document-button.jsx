import { ArrowUpRight, FileScan } from 'lucide-react';
import { useRef } from 'react';
import { useActionMotion } from '../../hooks/useActionMotion';
import './analyze-document-button.css';

export default function AnalyzeDocumentButton({ href, onClick, className = '', compact = false, children = 'Analyze document', ...props }) {
  const root = useRef(null);
  useActionMotion(root, props.disabled);
  const Element = href ? 'a' : 'button';
  return <Element ref={root} data-motion-action href={href} type={href ? undefined : 'button'} onClick={onClick}
    className={`analyze-document-button ${compact ? 'analyze-document-button--compact' : ''} ${className}`}
    aria-label={compact ? 'Analyze document' : undefined} {...props}>
    <span className="analyze-document-mark" aria-hidden="true"><FileScan size={21} strokeWidth={1.6} /></span>
    <span className="analyze-document-label"><span className="analyze-document-full">{children}</span>{compact && <span className="analyze-document-short">Analyze</span>}</span>
    <span className="analyze-document-arrow" aria-hidden="true"><ArrowUpRight data-motion-arrow size={19} strokeWidth={1.8} /></span>
  </Element>;
}
