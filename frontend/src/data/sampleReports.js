// Existing illustrative reports from backend/app/sample_data.py, with guidance
// produced by the existing backend/app/specialist_guide.py rules.
export default {
  "sample_lipid_glucose": {
    "file_name": "Metabolic_Lipid_Panel_Routine.pdf",
    "record_type": "LAB_REPORT",
    "extracted_data": {
      "document_title": "Comprehensive Metabolic & Lipid Diagnostic Panel",
      "laboratory": "Apex BioPath Diagnostics",
      "patient_note": "Fasting sample verified (12-hour fast).",
      "biomarkers": [
        {
          "test_name": "Fasting Blood Glucose",
          "observed_value": "118",
          "unit": "mg/dL",
          "reference_range": "70 - 99",
          "status": "HIGH",
          "clinical_meaning": "Measures the amount of sugar in your bloodstream after fasting. A result between 100 and 125 mg/dL suggests impaired fasting glucose (pre-diabetes range)."
        },
        {
          "test_name": "Total Cholesterol",
          "observed_value": "238",
          "unit": "mg/dL",
          "reference_range": "< 200",
          "status": "HIGH",
          "clinical_meaning": "The total amount of cholesterol circulating in your bloodstream. Levels above 200 mg/dL warrant evaluation of cardiovascular wellness."
        },
        {
          "test_name": "LDL Cholesterol (Direct)",
          "observed_value": "154",
          "unit": "mg/dL",
          "reference_range": "< 100",
          "status": "HIGH",
          "clinical_meaning": "Often called 'low-density' cholesterol. Elevated levels can gradually form plaque deposits within arterial walls over time."
        },
        {
          "test_name": "HDL Cholesterol",
          "observed_value": "52",
          "unit": "mg/dL",
          "reference_range": "> 40",
          "status": "NORMAL",
          "clinical_meaning": "Known as 'protective' cholesterol. Your level is healthy and helps transport excess lipids back to the liver for clearance."
        },
        {
          "test_name": "Serum Triglycerides",
          "observed_value": "172",
          "unit": "mg/dL",
          "reference_range": "< 150",
          "status": "HIGH",
          "clinical_meaning": "Circulating fats commonly linked to caloric intake and dietary carbohydrates. Slightly elevated above the standard threshold."
        },
        {
          "test_name": "Serum Creatinine",
          "observed_value": "0.92",
          "unit": "mg/dL",
          "reference_range": "0.70 - 1.30",
          "status": "NORMAL",
          "clinical_meaning": "A key marker of kidney filtration efficiency. This indicates your kidneys are filtering metabolic waste effectively."
        }
      ],
      "medicines": [],
      "ai_suggested_specialist": "Cardiologist or Endocrinologist",
      "specialist_recommendation": {
        "specialist_name": "Endocrinologist",
        "sub_title": "Metabolic & Hormone Specialist",
        "department": "Endocrinology & Metabolism",
        "urgency": "Routine Clinical Review",
        "reason": "Your report shows values connected to blood sugar regulation or hormone balance. An Endocrinologist specializes in diabetes prevention, thyroid care, and metabolic health.",
        "questions": [
          "What lifestyle or dietary adjustments would help normalize these levels?",
          "Do I need follow-up lab work in 3 to 6 months to check the trend?",
          "Are there any daily symptoms (such as fatigue or thirst) that I should track?"
        ],
        "matched_trigger": "Glucose"
      }
    },
    "simple_explanation": "Your blood test shows that your fasting blood sugar is slightly higher than normal (118 mg/dL), which means your body is taking longer to clear sugar after fasting. Additionally, your total cholesterol (238 mg/dL) and LDL cholesterol (154 mg/dL) are above the recommended healthy range, while your protective HDL cholesterol and kidney functions remain completely normal. These findings suggest it would be beneficial to review your daily nutrition, reduce refined carbohydrates, and discuss a heart-healthy action plan with a specialist.",
    "api_enriched_data": {
      "found": false,
      "searched_term": "None",
      "note": "Lab report analyzed. No prescription medications identified in this biomarker document."
    },
    "specialist_recommendation": {
      "specialist_name": "Endocrinologist",
      "sub_title": "Metabolic & Hormone Specialist",
      "department": "Endocrinology & Metabolism",
      "urgency": "Routine Clinical Review",
      "reason": "Your report shows values connected to blood sugar regulation or hormone balance. An Endocrinologist specializes in diabetes prevention, thyroid care, and metabolic health.",
      "questions": [
        "What lifestyle or dietary adjustments would help normalize these levels?",
        "Do I need follow-up lab work in 3 to 6 months to check the trend?",
        "Are there any daily symptoms (such as fatigue or thirst) that I should track?"
      ],
      "matched_trigger": "Glucose"
    },
    "is_sample": true,
    "sample_key": "sample_lipid_glucose",
    "disclaimer": "Illustrative sample only. This is not your medical report, a live openFDA lookup, or medical advice. Always review your own results with a qualified clinician."
  },
  "sample_cbc_anemia": {
    "file_name": "Complete_Blood_Count_CBC.png",
    "record_type": "LAB_REPORT",
    "extracted_data": {
      "document_title": "Automated Hematology Complete Blood Count",
      "laboratory": "St. Jude Clinical Laboratories",
      "patient_note": "Specimen integrity satisfactory; no hemolysis detected.",
      "biomarkers": [
        {
          "test_name": "Hemoglobin (Hgb)",
          "observed_value": "10.4",
          "unit": "g/dL",
          "reference_range": "12.0 - 16.0",
          "status": "LOW",
          "clinical_meaning": "The vital iron-containing protein that carries life-sustaining oxygen throughout your body. A lower value explains feelings of fatigue."
        },
        {
          "test_name": "Hematocrit (Hct)",
          "observed_value": "32.1",
          "unit": "%",
          "reference_range": "36.0 - 46.0",
          "status": "LOW",
          "clinical_meaning": "The percentage of your blood made up of red blood cells. Slightly reduced in parallel with hemoglobin."
        },
        {
          "test_name": "Mean Corpuscular Volume (MCV)",
          "observed_value": "73.5",
          "unit": "fL",
          "reference_range": "80.0 - 100.0",
          "status": "LOW",
          "clinical_meaning": "Reflects red blood cell size. Smaller red cells typically point to mild iron deficiency or microcytic shifts."
        },
        {
          "test_name": "White Blood Cell Count (WBC)",
          "observed_value": "6.8",
          "unit": "10^3/uL",
          "reference_range": "4.5 - 11.0",
          "status": "NORMAL",
          "clinical_meaning": "Your body's immune defense cells. This healthy count shows no signs of active systemic infection."
        },
        {
          "test_name": "Platelet Count",
          "observed_value": "265",
          "unit": "10^3/uL",
          "reference_range": "150 - 450",
          "status": "NORMAL",
          "clinical_meaning": "Specialized cells responsible for normal blood clotting and tissue repair. Completely within normal parameters."
        }
      ],
      "medicines": [],
      "ai_suggested_specialist": "Hematologist",
      "specialist_recommendation": {
        "specialist_name": "Hematologist",
        "sub_title": "Blood & Bone Marrow Specialist",
        "department": "Hematology",
        "urgency": "Routine Clinical Review",
        "reason": "Your complete blood count contains variations in oxygen-carrying red cells, immune white cells, or clotting platelets. A Hematologist determines the root cause of these shifts.",
        "questions": [
          "Could nutritional factors such as iron, vitamin B12, or folate explain these counts?",
          "Do you advise an iron panel or repeat complete blood count (CBC)?",
          "Are there specific symptoms like dizziness or bruising I should watch for?"
        ],
        "matched_trigger": "Hemoglobin"
      }
    },
    "simple_explanation": "Your blood count indicates mild microcytic anemia, meaning your hemoglobin (10.4 g/dL) is lower than normal and your red blood cells are smaller than typical. This is very frequently caused by low iron stores in the body and can cause you to feel tired or easily fatigued during exercise. Your immune cells and clotting platelets are completely normal and healthy. A doctor can check your ferritin and iron levels to verify if an iron supplement is right for you.",
    "api_enriched_data": {
      "found": false,
      "searched_term": "None",
      "note": "Complete Blood Count analyzed. No pharmaceutical drugs detected on this panel."
    },
    "specialist_recommendation": {
      "specialist_name": "Hematologist",
      "sub_title": "Blood & Bone Marrow Specialist",
      "department": "Hematology",
      "urgency": "Routine Clinical Review",
      "reason": "Your complete blood count contains variations in oxygen-carrying red cells, immune white cells, or clotting platelets. A Hematologist determines the root cause of these shifts.",
      "questions": [
        "Could nutritional factors such as iron, vitamin B12, or folate explain these counts?",
        "Do you advise an iron panel or repeat complete blood count (CBC)?",
        "Are there specific symptoms like dizziness or bruising I should watch for?"
      ],
      "matched_trigger": "Hemoglobin"
    },
    "is_sample": true,
    "sample_key": "sample_cbc_anemia",
    "disclaimer": "Illustrative sample only. This is not your medical report, a live openFDA lookup, or medical advice. Always review your own results with a qualified clinician."
  },
  "sample_prescription_metformin": {
    "file_name": "Rx_Metformin_Lisinopril.jpg",
    "record_type": "PRESCRIPTION",
    "extracted_data": {
      "document_title": "Outpatient Medical Prescription",
      "prescribing_clinic": "Metro Health Primary Care Clinic",
      "patient_note": "Chronic care management regimen.",
      "biomarkers": [],
      "medicines": [
        {
          "brand_name": "Glucophage",
          "generic_name": "Metformin Hydrochloride",
          "dosage": "500 mg",
          "form": "Oral Tablet",
          "frequency_instructions": "Take 1 tablet twice daily with morning and evening meals.",
          "indication_summary": "First-line oral medication for blood glucose management in type 2 diabetes."
        },
        {
          "brand_name": "Zestril",
          "generic_name": "Lisinopril",
          "dosage": "10 mg",
          "form": "Oral Tablet",
          "frequency_instructions": "Take 1 tablet once daily in the morning with a full glass of water.",
          "indication_summary": "ACE inhibitor medication prescribed to regulate blood pressure and protect kidney vessels."
        }
      ],
      "ai_suggested_specialist": "Endocrinologist or Cardiologist",
      "specialist_recommendation": {
        "specialist_name": "Cardiologist",
        "sub_title": "Heart & Vascular Specialist",
        "department": "Cardiovascular Medicine",
        "urgency": "Routine Clinical Review",
        "reason": "Certain lipid markers or cardiovascular medications indicate your cardiovascular system should be reviewed. A Cardiologist ensures your arteries and heart remain well protected.",
        "questions": [
          "What is my overall 5-year or 10-year cardiovascular risk score?",
          "Can dietary modifications alone lower my LDL/triglycerides, or is medication recommended?",
          "Should I schedule an ECG or echocardiogram to establish a baseline?"
        ],
        "matched_trigger": "Lisinopril"
      }
    },
    "simple_explanation": "This prescription is a standard dual therapy designed to manage blood sugar and safeguard blood pressure. Metformin (Glucophage 500mg) helps your muscles and liver respond naturally to insulin and should be taken with meals to prevent mild stomach discomfort. Lisinopril (10mg) gently relaxes your blood vessels to keep your blood pressure smooth and protect your kidneys over the long term.",
    "api_enriched_data": {
      "found": true,
      "searched_term": "Metformin",
      "matched_brand": "GLUCOPHAGE",
      "matched_generic": "METFORMIN HYDROCHLORIDE",
      "drug_class": "Biguanide Blood Glucose Lowering Compound",
      "official_uses": "Indicated as an adjunct to diet and exercise to improve glycemic control in adults with type 2 diabetes mellitus.",
      "safety_warnings": "Lactic acidosis is a rare but serious metabolic complication that can occur due to metformin accumulation. Avoid excessive alcohol intake. Discontinue prior to iodinated contrast radiological procedures.",
      "boxed_warning": "WARNING: LACTIC ACIDOSIS. Post-marketing cases have occurred primarily in patients with significant renal impairment or severe acute illness.",
      "side_effects": "Common initial reactions include diarrhea, nausea, abdominal discomfort, and metallic taste. Taking with meals substantially reduces these symptoms.",
      "dosage_guidance": "Usually started at 500 mg orally twice daily with meals. May be adjusted gradually by your licensed prescriber.",
      "fda_plain_summary": "Glucophage (Metformin Hydrochloride) is an FDA-approved biguanide medication that helps control blood sugar in type 2 diabetes. Always take it with food to avoid stomach cramps, and never stop taking it without discussing with your doctor.",
      "source": "US FDA Regulatory Open Data (api.fda.gov)"
    },
    "specialist_recommendation": {
      "specialist_name": "Cardiologist",
      "sub_title": "Heart & Vascular Specialist",
      "department": "Cardiovascular Medicine",
      "urgency": "Routine Clinical Review",
      "reason": "Certain lipid markers or cardiovascular medications indicate your cardiovascular system should be reviewed. A Cardiologist ensures your arteries and heart remain well protected.",
      "questions": [
        "What is my overall 5-year or 10-year cardiovascular risk score?",
        "Can dietary modifications alone lower my LDL/triglycerides, or is medication recommended?",
        "Should I schedule an ECG or echocardiogram to establish a baseline?"
      ],
      "matched_trigger": "Lisinopril"
    },
    "is_sample": true,
    "sample_key": "sample_prescription_metformin",
    "disclaimer": "Illustrative sample only. This is not your medical report, a live openFDA lookup, or medical advice. Always review your own results with a qualified clinician."
  },
  "sample_prescription_amoxicillin": {
    "file_name": "Rx_Amoxicillin_Albuterol.jpeg",
    "record_type": "PRESCRIPTION",
    "extracted_data": {
      "document_title": "Acute Care Physician Prescription",
      "prescribing_clinic": "Riverside Urgent Care & Family Medicine",
      "patient_note": "Complete full course as directed.",
      "biomarkers": [],
      "medicines": [
        {
          "brand_name": "Amoxil",
          "generic_name": "Amoxicillin",
          "dosage": "500 mg",
          "form": "Oral Capsule",
          "frequency_instructions": "Take 1 capsule every 8 hours for 7 full days with plenty of water.",
          "indication_summary": "Broad-spectrum penicillin antibiotic targeting bacterial ear, throat, or chest infections."
        },
        {
          "brand_name": "ProAir HFA",
          "generic_name": "Albuterol Sulfate",
          "dosage": "90 mcg/actuation",
          "form": "Inhalation Aerosol",
          "frequency_instructions": "Inhale 2 puffs every 4 to 6 hours as needed for sudden wheezing or shortness of breath.",
          "indication_summary": "Rapid-acting bronchodilator that relaxes airway muscle spasms to restore effortless breathing."
        }
      ],
      "ai_suggested_specialist": "Pulmonologist or Primary Care Physician",
      "specialist_recommendation": {
        "specialist_name": "Pulmonologist",
        "sub_title": "Respiratory & Lung Specialist",
        "department": "Pulmonary Medicine",
        "urgency": "Routine Clinical Review",
        "reason": "These medications and observations relate to airway openness and breathing wellness. A Pulmonologist ensures your lungs operate with maximum oxygen efficiency.",
        "questions": [
          "Am I using my inhaler device with correct inhalation technique?",
          "Do I need a spirometry breathing test to measure lung capacity?",
          "What is my personalized asthma or breathing action plan during seasonal changes?"
        ],
        "matched_trigger": "Albuterol"
      }
    },
    "simple_explanation": "This prescription treats an acute respiratory or bacterial condition with an antibiotic and a breathing inhaler. Amoxicillin (500mg) clears bacterial infections; it is critical that you finish all 7 days of capsules even if you feel completely better early on. The Albuterol inhaler quickly opens up your airways if you feel tight in the chest or wheezy, working within minutes to ease breathing.",
    "api_enriched_data": {
      "found": true,
      "searched_term": "Amoxicillin",
      "matched_brand": "AMOXIL",
      "matched_generic": "AMOXICILLIN",
      "drug_class": "Penicillin-Class Antibacterial",
      "official_uses": "Indicated in the treatment of infections due to susceptible strains of designated organisms including respiratory tract infections, otitis media, and skin infections.",
      "safety_warnings": "Serious and occasionally fatal hypersensitivity (anaphylactic) reactions have been reported in patients on penicillin therapy. Discontinue immediately if hives, rash, or breathing difficulty occurs.",
      "boxed_warning": null,
      "side_effects": "Common adverse events include nausea, vomiting, loose stools, and cutaneous rash. Contact your clinician if watery diarrhea develops.",
      "dosage_guidance": "Standard adult dose: 500 mg every 8 hours. Complete the entire prescribed duration.",
      "fda_plain_summary": "Amoxil (Amoxicillin) is a penicillin antibiotic that cures bacterial infections. Take it on schedule every 8 hours. Never share or stop your antibiotic early, as stopping can cause resistant bacteria to return.",
      "source": "US FDA Regulatory Open Data (api.fda.gov)"
    },
    "specialist_recommendation": {
      "specialist_name": "Pulmonologist",
      "sub_title": "Respiratory & Lung Specialist",
      "department": "Pulmonary Medicine",
      "urgency": "Routine Clinical Review",
      "reason": "These medications and observations relate to airway openness and breathing wellness. A Pulmonologist ensures your lungs operate with maximum oxygen efficiency.",
      "questions": [
        "Am I using my inhaler device with correct inhalation technique?",
        "Do I need a spirometry breathing test to measure lung capacity?",
        "What is my personalized asthma or breathing action plan during seasonal changes?"
      ],
      "matched_trigger": "Albuterol"
    },
    "is_sample": true,
    "sample_key": "sample_prescription_amoxicillin",
    "disclaimer": "Illustrative sample only. This is not your medical report, a live openFDA lookup, or medical advice. Always review your own results with a qualified clinician."
  }
}
