import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("medisense.specialist")

# Mapping clinical markers and medication classes to relevant medical specialists
SPECIALIST_RULES = [
    {
        "keys": ["glucose", "fasting blood sugar", "fbs", "hba1c", "glycated hemoglobin", "insulin", "tsh", "thyroid", "free t4", "free t3"],
        "specialist": "Endocrinologist",
        "sub_title": "Metabolic & Hormone Specialist",
        "department": "Endocrinology & Metabolism",
        "why": "Your report shows values connected to blood sugar regulation or hormone balance. An Endocrinologist specializes in diabetes prevention, thyroid care, and metabolic health.",
        "questions": [
            "What lifestyle or dietary adjustments would help normalize these levels?",
            "Do I need follow-up lab work in 3 to 6 months to check the trend?",
            "Are there any daily symptoms (such as fatigue or thirst) that I should track?"
        ]
    },
    {
        "keys": ["cholesterol", "ldl", "hdl", "triglycerides", "lipid", "vldl", "troponin", "blood pressure", "hypertension", "lisinopril", "amlodipine", "atorvastatin", "rosuvastatin"],
        "specialist": "Cardiologist",
        "sub_title": "Heart & Vascular Specialist",
        "department": "Cardiovascular Medicine",
        "why": "Certain lipid markers or cardiovascular medications indicate your cardiovascular system should be reviewed. A Cardiologist ensures your arteries and heart remain well protected.",
        "questions": [
            "What is my overall 5-year or 10-year cardiovascular risk score?",
            "Can dietary modifications alone lower my LDL/triglycerides, or is medication recommended?",
            "Should I schedule an ECG or echocardiogram to establish a baseline?"
        ]
    },
    {
        "keys": ["creatinine", "bun", "blood urea nitrogen", "egfr", "glomerular filtration", "uric acid", "proteinuria", "microalbumin"],
        "specialist": "Nephrologist",
        "sub_title": "Kidney Health Specialist",
        "department": "Nephrology & Renal Medicine",
        "why": "Your results include renal filtration markers such as creatinine or BUN. A Nephrologist evaluates how effectively your kidneys are clearing waste products from the bloodstream.",
        "questions": [
            "Are my filtration markers stable compared to past tests?",
            "What daily water intake and sodium targets are optimal for my kidneys?",
            "Are there any pain relievers (like NSAIDs) or supplements I should avoid?"
        ]
    },
    {
        "keys": ["hemoglobin", "hgb", "rbc", "red blood cell", "wbc", "white blood cell", "platelet", "mcv", "mch", "ferritin", "iron", "anemia"],
        "specialist": "Hematologist",
        "sub_title": "Blood & Bone Marrow Specialist",
        "department": "Hematology",
        "why": "Your complete blood count contains variations in oxygen-carrying red cells, immune white cells, or clotting platelets. A Hematologist determines the root cause of these shifts.",
        "questions": [
            "Could nutritional factors such as iron, vitamin B12, or folate explain these counts?",
            "Do you advise an iron panel or repeat complete blood count (CBC)?",
            "Are there specific symptoms like dizziness or bruising I should watch for?"
        ]
    },
    {
        "keys": ["alt", "sgpt", "ast", "sgot", "bilirubin", "alkaline phosphatase", "alp", "ggt", "liver"],
        "specialist": "Gastroenterologist & Hepatologist",
        "sub_title": "Digestive & Liver Specialist",
        "department": "Gastroenterology & Hepatology",
        "why": "Enzyme levels in this report relate to liver metabolism and digestive function. A Hepatologist can confirm whether temporary inflammation or fatty changes are present.",
        "questions": [
            "Could recent medications, over-the-counter pain relievers, or alcohol have elevated these enzymes?",
            "Would an abdominal ultrasound be beneficial to see the liver structure?",
            "When should we re-test to confirm these levels are returning to baseline?"
        ]
    },
    {
        "keys": ["albuterol", "inhaler", "fluticasone", "budesonide", "montelukast", "asthma", "copd", "respiratory", "bronchial"],
        "specialist": "Pulmonologist",
        "sub_title": "Respiratory & Lung Specialist",
        "department": "Pulmonary Medicine",
        "why": "These medications and observations relate to airway openness and breathing wellness. A Pulmonologist ensures your lungs operate with maximum oxygen efficiency.",
        "questions": [
            "Am I using my inhaler device with correct inhalation technique?",
            "Do I need a spirometry breathing test to measure lung capacity?",
            "What is my personalized asthma or breathing action plan during seasonal changes?"
        ]
    },
    {
        "keys": ["esr", "erythrocyte sedimentation", "crp", "c-reactive protein", "rheumatoid factor", "rf", "ana", "joint"],
        "specialist": "Rheumatologist",
        "sub_title": "Autoimmune & Joint Specialist",
        "department": "Rheumatology",
        "why": "Markers of systemic inflammation or joint health are featured. A Rheumatologist investigates inflammatory triggers and protects joint flexibility.",
        "questions": [
            "Does this inflammation pattern suggest an active autoimmune response?",
            "What specific autoimmune antibody panels should we run next?",
            "Which anti-inflammatory strategies are safest for my joints?"
        ]
    },
    {
        "keys": ["amoxicillin", "azithromycin", "ciprofloxacin", "cephalexin", "doxycycline", "antibiotic", "infection"],
        "specialist": "Primary Care Physician (PCP)",
        "sub_title": "General Medical Practitioner",
        "department": "Family Medicine & Primary Care",
        "why": "You are taking an antimicrobial treatment. Your family doctor or general physician should review your recovery progress and confirm the infection has fully resolved.",
        "questions": [
            "Should I take a probiotic during or after completing this course of medication?",
            "What signs confirm the infection is completely cleared?",
            "What should I do if any minor stomach upset or rash occurs?"
        ]
    }
]

DEFAULT_SPECIALIST = {
    "specialist": "General Physician / Internist",
    "sub_title": "Primary Care & Internal Medicine",
    "department": "Internal Medicine",
    "why": "Your results provide valuable health insight across multiple body systems. An Internist or General Physician provides comprehensive medical oversight and can coordinate any targeted care if required.",
    "questions": [
        "How do these findings compare with my baseline health profile?",
        "Are there any specific lifestyle habits or preventive screenings you recommend at this stage?",
        "When is the most appropriate date for my next routine wellness checkup?"
    ]
}

def determine_specialist(biomarkers: List[Dict[str, Any]], medicines: List[Dict[str, Any]], ai_suggested: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates extracted lab results, medicines, and AI suggestions to match the most
    appropriate medical specialist.
    """
    # 1. Search for abnormal biomarkers first (HIGH or LOW flags)
    high_or_low_texts = []
    all_texts = []

    for item in biomarkers:
        name = str(item.get("test_name", "")).lower()
        status = str(item.get("status", "")).upper()
        all_texts.append(name)
        if status in ["HIGH", "LOW", "ABNORMAL", "CRITICAL"]:
            high_or_low_texts.append(name)

    for item in medicines:
        b_name = str(item.get("brand_name", "")).lower()
        g_name = str(item.get("generic_name", "")).lower()
        all_texts.append(b_name)
        all_texts.append(g_name)

    # First check abnormal biomarkers against specialist rules
    for rule in SPECIALIST_RULES:
        for keyword in rule["keys"]:
            if any(keyword in abnormal for abnormal in high_or_low_texts):
                urgency = "Recommended Within 1-2 Weeks" if any("CRITICAL" in str(b.get("status", "")).upper() for b in biomarkers) else "Routine Clinical Review"
                return {
                    "specialist_name": rule["specialist"],
                    "sub_title": rule["sub_title"],
                    "department": rule["department"],
                    "urgency": urgency,
                    "reason": rule["why"],
                    "questions": rule["questions"],
                    "matched_trigger": keyword.title()
                }

    # Second check all extracted keys
    for rule in SPECIALIST_RULES:
        for keyword in rule["keys"]:
            if any(keyword in text for text in all_texts):
                return {
                    "specialist_name": rule["specialist"],
                    "sub_title": rule["sub_title"],
                    "department": rule["department"],
                    "urgency": "Routine Clinical Review",
                    "reason": rule["why"],
                    "questions": rule["questions"],
                    "matched_trigger": keyword.title()
                }

    # If AI suggested a specialist, construct tailored response
    if ai_suggested and len(ai_suggested.strip()) > 3:
        return {
            "specialist_name": ai_suggested.strip(),
            "sub_title": "Consulting Medical Specialist",
            "department": "Clinical Specialty Care",
            "urgency": "Routine Clinical Review",
            "reason": f"Based on the clinical markers in your document, consulting a {ai_suggested} is recommended for personalized interpretation.",
            "questions": DEFAULT_SPECIALIST["questions"],
            "matched_trigger": "Document Analysis"
        }

    # Default fallback
    return {
        "specialist_name": DEFAULT_SPECIALIST["specialist"],
        "sub_title": DEFAULT_SPECIALIST["sub_title"],
        "department": DEFAULT_SPECIALIST["department"],
        "urgency": "Routine Clinical Review",
        "reason": DEFAULT_SPECIALIST["why"],
        "questions": DEFAULT_SPECIALIST["questions"],
        "matched_trigger": "General Health Panel"
    }
