import { Pill, Clock3 } from 'lucide-react';
import SpringText from './ui/spring-text';
export default function MedicineCard({ medicine }) {
    return <article className="result-surface result-medicine"><div className="medicine-title"><span className="result-material-icon"><Pill size={23}/></span><div><SpringText tag="h4">{medicine.brand_name || medicine.generic_name || 'Unnamed medicine'}</SpringText>{medicine.generic_name && medicine.generic_name !== medicine.brand_name && <p>{medicine.generic_name}</p>}</div></div>
        {(medicine.dosage || medicine.form) && <div className="medicine-dose">{medicine.dosage && <strong>{medicine.dosage}</strong>}{medicine.form && <span>{medicine.form}</span>}</div>}
        {medicine.frequency_instructions && <div className="medicine-directions"><Clock3 size={18}/><p><strong>From your prescription</strong>{medicine.frequency_instructions}</p></div>}
        {medicine.indication_summary && <p className="medicine-purpose">{medicine.indication_summary}</p>}
    </article>;
}
