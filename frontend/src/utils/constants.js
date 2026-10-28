export const SAMPLES = [
  {
    key: 'sample_lipid_glucose',
    title: 'Metabolic & Lipid Panel',
    subtitle: 'Apex BioPath Diagnostics',
    type: 'LAB_REPORT',
    badge: 'Blood Panel',
    description: 'Elevated fasting glucose (118 mg/dL) and total cholesterol (238 mg/dL) with normal renal indicators.',
    flaggedCount: 4,
  },
  {
    key: 'sample_cbc_anemia',
    title: 'Complete Blood Count (CBC)',
    subtitle: 'St. Jude Clinical Laboratories',
    type: 'LAB_REPORT',
    badge: 'Hematology',
    description: 'Mild microcytic anemia indicators: hemoglobin 10.4 g/dL and reduced hematocrit.',
    flaggedCount: 3,
  },
  {
    key: 'sample_prescription_metformin',
    title: 'Metformin & Lisinopril',
    subtitle: 'Metro Health Primary Care',
    type: 'PRESCRIPTION',
    badge: 'Dual Therapy',
    description: 'A sample blood-sugar and blood-pressure prescription with illustrative medicine context.',
    flaggedCount: 2,
  },
  {
    key: 'sample_prescription_amoxicillin',
    title: 'Amoxicillin & Albuterol',
    subtitle: 'Riverside Urgent Care',
    type: 'PRESCRIPTION',
    badge: 'Acute Care',
    description: 'Broad-spectrum antibiotic course alongside rapid-acting bronchodilator inhaler.',
    flaggedCount: 2,
  },
];

export const STATUS_STYLES = {
  NORMAL: {
    color: 'var(--status-normal)',
    bg: 'var(--status-normal-bg)',
    border: 'var(--status-normal-border)',
    label: 'Normal',
  },
  HIGH: {
    color: 'var(--status-high)',
    bg: 'var(--status-high-bg)',
    border: 'var(--status-high-border)',
    label: 'Elevated',
  },
  LOW: {
    color: 'var(--status-low)',
    bg: 'var(--status-low-bg)',
    border: 'var(--status-low-border)',
    label: 'Low',
  },
  DEFAULT: {
    color: 'var(--accent-amber)',
    bg: 'var(--accent-amber-subtle)',
    border: 'var(--border-accent)',
    label: 'Analyzed',
  },
};
