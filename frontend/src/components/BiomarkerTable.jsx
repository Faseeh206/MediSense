import { useState } from 'react';
import { ListFilter, ArrowUpRight } from 'lucide-react';
import SpringText from './ui/spring-text';
import BiomarkerRow from './BiomarkerRow';
import { filterMarkers, needsAttention } from '../utils/resultsPresentation';

export default function BiomarkerTable({ biomarkers = [] }) {
    const [selection, setSelection] = useState({ source: biomarkers, filter: 'ALL' });
    if (!biomarkers.length) return null;
    const filter = selection.source === biomarkers ? selection.filter : 'ALL';
    const attention = biomarkers.filter(needsAttention), displayed = filterMarkers(biomarkers, filter);
    return <section className="result-measurements" aria-labelledby="result-measurements-title">
        <div className="result-section-heading result-measurements-heading"><div><SpringText tag="h3" id="result-measurements-title">The details, in focus.</SpringText><p id="result-filter-count" role="status">Showing {displayed.length} of {biomarkers.length} measurements{filter === 'ATTENTION' ? ' flagged for review.' : '.'}{filter === 'ATTENTION' && attention.length === biomarkers.length ? ' Every measurement in this report is flagged, so both views contain the same results.' : ''}</p></div>
            <div className="result-filter" role="group" aria-label="Filter lab results"><button type="button" aria-pressed={filter === 'ALL'} aria-controls="result-marker-list" onClick={() => setSelection({ source: biomarkers, filter: 'ALL' })}><ListFilter size={16}/>All results <span>{biomarkers.length}</span></button><button type="button" aria-pressed={filter === 'ATTENTION'} aria-controls="result-marker-list" onClick={() => setSelection({ source: biomarkers, filter: 'ATTENTION' })}><ArrowUpRight size={17}/>Attention needed <span>{attention.length}</span></button></div>
        </div>
        <div id="result-marker-list" className="result-marker-list" aria-describedby="result-filter-count">{displayed.length ? displayed.map(marker => <BiomarkerRow key={`${marker.test_name}-${biomarkers.indexOf(marker)}`} biomarker={marker}/>) : <div className="result-empty"><strong>No results are flagged for review.</strong><p>You can switch to All results to see every measurement. An unclassified result is not assumed to be within range.</p></div>}</div>
    </section>;
}
