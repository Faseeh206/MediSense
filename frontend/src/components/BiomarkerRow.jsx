import { ArrowDownRight, ArrowUpRight, Check, CircleHelp, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import SpringText from './ui/spring-text';
import { markerRange, markerStatus, STATUS_LABEL } from '../utils/resultsPresentation';
import { referenceInfo } from '../utils/referenceGuides';
const ICONS = { NORMAL: Check, HIGH: ArrowUpRight, LOW: ArrowDownRight, CRITICAL: TriangleAlert, ABNORMAL: TriangleAlert, UNKNOWN: CircleHelp };
export default function BiomarkerRow({ biomarker }) {
    const root = useRef(null);
    useEffect(() => {
        const element = root.current;
        if (!('IntersectionObserver' in window)) { element.setAttribute('data-range-active',''); return; }
        const observer = new IntersectionObserver(([entry]) => element.toggleAttribute('data-range-active',entry.isIntersecting));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const status = markerStatus(biomarker), range = markerRange(biomarker), reference = referenceInfo(biomarker), Icon = ICONS[status];
    return <article ref={root} className="result-surface biomarker-row" data-result-status={status}>
        <div className="marker-identity"><SpringText tag="h4">{biomarker.test_name || 'Unnamed measurement'}</SpringText><span className="marker-status"><Icon size={14}/>{STATUS_LABEL[status]}</span></div>
        <div className="marker-reading"><strong>{biomarker.observed_value ?? 'Not provided'}</strong>{biomarker.unit && <span>{biomarker.unit}</span>}</div>
        <div className="marker-context"><p>{biomarker.clinical_meaning || 'No additional explanation was supplied for this measurement.'}</p><span>{reference.label}: <strong>{reference.display}</strong></span>{reference.isGeneral && <p className="range-footnote">{reference.note} <a href={reference.source} target="_blank" rel="noopener noreferrer">Source: MedlinePlus</a></p>}</div>
        <div className="marker-visual">{range ? <><div className="marker-range" role="img" aria-label={`${biomarker.test_name || 'Measurement'}: ${biomarker.observed_value} ${biomarker.unit || ''}; ${reference.label}: ${reference.display}. ${STATUS_LABEL[status]}.`}>
            <div className="marker-range-bands">{range.start > 0 && <span className="range-band range-band--low" style={{ width: `${range.start}%` }}><i/></span>}<span className="range-band range-band--normal" style={{ width: `${range.end - range.start}%` }}><i/></span>{range.end < 100 && <span className="range-band range-band--high" style={{ width: `${100 - range.end}%` }}><i/></span>}</div>
            {range.start > 0 && <span className="range-reference-tick" style={{ left: `${range.start}%` }}/>}{range.end < 100 && <span className="range-reference-tick" style={{ left: `${range.end}%` }}/>}<span className="range-pointer" style={{ left: `${range.position}%` }}/>
        </div><div className="range-labels" aria-hidden="true"><span>{range.labels[0]}</span><span>{range.labels[1]}</span><span>{range.labels[2]}</span></div>{range.clipped && <p className="range-footnote">Marker is at the scale edge. The exact result is shown above.</p>}</> : <p className="range-unavailable">{reference.isGeneral ? 'The guide depends on patient context, so no single range is plotted.' : reference.range ? 'A numeric range cannot be plotted for this result.' : reference.note}</p>}</div>
    </article>;
}

