// Sourced educational adult guides, checked 2026-10-28. These never replace a
// printed lab interval or determine a patient's abnormal/normal status.
const encyclopedia = id => `https://medlineplus.gov/ency/article/${id}.htm`;
const adultNote = 'General adult guide only. Your lab method, age, sex and pregnancy can change the applicable interval.';
const sexRange = (male, female) => ({ display: `Adult male: ${male}; adult female: ${female}`, range: null });
const entries = [
    { names: ['fasting blood glucose','fasting glucose','fasting blood sugar','fasting plasma glucose','fbs','fbg'], units: { 'mg/dl': '70 - 99', 'mmol/l': '3.9 - 5.5' }, source: encyclopedia('003482'), note: 'Fasting adult guide only; not for random glucose, children or pregnancy-specific testing.' },
    { names: ['sodium','serum sodium','blood sodium','na','na+'], units: { 'meq/l': '135 - 145', 'mmol/l': '135 - 145' }, source: encyclopedia('003481') },
    { names: ['potassium','serum potassium','blood potassium','k','k+'], units: { 'meq/l': '3.7 - 5.2', 'mmol/l': '3.7 - 5.2' }, source: encyclopedia('003484') },
    { names: ['chloride','serum chloride','cl'], units: { 'meq/l': '96 - 106', 'mmol/l': '96 - 106' }, source: encyclopedia('003468') },
    { names: ['albumin','serum albumin'], units: { 'g/dl': '3.4 - 5.4', 'g/l': '34 - 54' }, source: encyclopedia('003468') },
    { names: ['total calcium','calcium','serum calcium'], units: { 'mg/dl': '8.5 - 10.2', 'mmol/l': '2.13 - 2.55' }, source: encyclopedia('003468'), note: 'General adult total-calcium guide; not ionized or corrected calcium. Albumin can affect interpretation.' },
    { names: ['total protein','serum total protein'], units: { 'g/dl': '6.0 - 8.3', 'g/l': '60 - 83' }, source: encyclopedia('003468') },
    { names: ['total bilirubin','bilirubin total'], units: { 'mg/dl': '0.1 - 1.2', 'umol/l': '2 - 21' }, source: encyclopedia('003468') },
    { names: ['bun','blood urea nitrogen'], units: { 'mg/dl': '6 - 20', 'mmol/l': '2.14 - 7.14' }, source: encyclopedia('003468') },
    { names: ['wbc','wbc count','white blood cell count','white blood cell count wbc','white blood cells','total leukocyte count','tlc'], units: { '109/l': '4.5 - 11', '103/ul': '4.5 - 11', '103/mm3': '4.5 - 11', 'k/ul': '4.5 - 11', 'cells/ul': '4500 - 11000', '/ul': '4500 - 11000' }, source: encyclopedia('003643') },
    { names: ['platelet count','platelets','plt','platelet'], units: { '109/l': '150 - 400', '103/ul': '150 - 400', '103/mm3': '150 - 400', 'k/ul': '150 - 400', 'cells/ul': '150000 - 400000', '/ul': '150000 - 400000' }, source: encyclopedia('003647') },
    { names: ['hemoglobin','haemoglobin','hemoglobin hgb','haemoglobin hgb','hgb','hb'], units: { 'g/dl': sexRange('13.8 - 17.2','12.1 - 15.1'), 'g/l': sexRange('138 - 172','121 - 151') }, source: encyclopedia('003645') },
    { names: ['hematocrit','haematocrit','hematocrit hct','hct','pcv','packed cell volume'], units: { '%': sexRange('37 - 48','34 - 43') }, source: encyclopedia('003646') },
    { names: ['rbc','rbc count','red blood cell count','red blood cell count rbc','red blood cells'], units: { '106/ul': sexRange('4.2 - 5.7','3.8 - 5.1'), '1012/l': sexRange('4.2 - 5.7','3.8 - 5.1'), 'million/ul': sexRange('4.2 - 5.7','3.8 - 5.1') }, source: encyclopedia('003644') },
    { names: ['mcv','mean corpuscular volume','mean corpuscular volume mcv','mean cell volume'], units: { fl: '79 - 95' }, source: encyclopedia('003648') },
    { names: ['mch','mean corpuscular hemoglobin','mean corpuscular haemoglobin'], units: { pg: sexRange('27 - 33','26 - 33'), 'pg/cell': sexRange('27 - 33','26 - 33') }, source: encyclopedia('003648') },
    { names: ['mchc','mean corpuscular hemoglobin concentration','mean corpuscular haemoglobin concentration'], units: { 'g/dl': '32 - 36', 'g/l': '320 - 360' }, source: encyclopedia('003648') },
    { names: ['creatinine','serum creatinine','blood creatinine'], units: { 'mg/dl': sexRange('0.7 - 1.3','0.5 - 0.95'), 'umol/l': sexRange('62 - 115','44 - 84') }, source: encyclopedia('003475') },
    { names: ['total cholesterol','cholesterol total','cholesterol'], units: { 'mg/dl': '< 200' }, source: 'https://medlineplus.gov/cholesterollevelswhatyouneedtoknow.html', note: 'General desirable level for adults 20+. Individual cardiovascular targets may differ.' },
    { names: ['ldl cholesterol','ldl cholesterol direct','ldl cholesterol calculated','ldl','ldlc'], units: { 'mg/dl': '< 100' }, source: 'https://medlineplus.gov/cholesterollevelswhatyouneedtoknow.html', note: 'General desirable level for adults 20+. People at higher cardiovascular risk may need a lower target.' },
    { names: ['hdl cholesterol','hdl','hdlc'], units: { 'mg/dl': { display: 'Adults 20+: below 40 is low for men; below 50 is low for women; 60 or above is preferred', range: null } }, source: 'https://medlineplus.gov/cholesterollevelswhatyouneedtoknow.html' },
    { names: ['serum triglycerides','triglycerides','triglyceride','tg'], units: { 'mg/dl': '< 150', 'mmol/l': '< 1.69' }, source: encyclopedia('000403'), note: 'General adult guide; fasting status, treatment goals and age can change interpretation.' },
];

const nameKey = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
export const referenceUnitKey = value => String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[µμ]/g, 'u').replace(/[×*]/g, 'x').replace(/\s|\^/g, '').replace(/^x(?=10)/, '');
export function referenceInfo(marker = {}) {
    const raw = String(marker.reference_range || '').trim();
    if (raw && !/^(?:n\/?a|none|unknown|not (?:provided|supplied)|--?)$/i.test(raw)) {
        return { label: 'Lab reference', display: raw, range: raw, isGeneral: false, source: '', note: '' };
    }
    const name = nameKey(marker.test_name), unit = referenceUnitKey(marker.unit);
    const entry = entries.find(item => item.names.some(alias => nameKey(alias) === name));
    const value = entry?.units[unit];
    if (!value) return { label: 'Reference', display: 'Needs a lab-specific interval', range: null, isGeneral: false, source: '', note: 'A general guide is unavailable for this exact test and unit. Ask your lab or clinician for its interval.' };
    return { label: 'General adult guide', display: typeof value === 'string' ? value : value.display,
        range: typeof value === 'string' ? value : value.range, isGeneral: true,
        source: entry.source, note: entry.note || adultNote };
}
