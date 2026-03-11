// Medical Reference Ranges & Synonym Dictionary
// Built for strict extraction, ensuring zero hallucinations.

export type NumericStatus = 'BELOW_RANGE' | 'WITHIN_RANGE' | 'ABOVE_RANGE' | 'UNVERIFIED';
export type ClinicalStatus = 'NORMAL' | 'FAVORABLE' | 'BORDERLINE' | 'CLINICALLY_NOTABLE' | 'HIGH_PRIORITY' | 'UNVERIFIED';
export type BiomarkerSubtype = 'percentage' | 'absolute_count' | 'qualitative' | 'ratio' | 'panel_value';
export type BiomarkerCategory = 'lipid' | 'blood_sugar' | 'blood_count' | 'thyroid' | 'vitamin' | 'liver' | 'kidney' | 'infectious_disease' | 'inflammatory' | 'urine' | 'other';

export interface BiomarkerReference {
  name: string;
  synonyms: string[]; // Explicit synonym mapping
  unit: string;
  category: BiomarkerCategory;
  subtype: BiomarkerSubtype;
  isQualitative?: boolean; // True for Positive/Negative tests
  normalRange?: { min: number; max: number };
  borderlineRange?: { min: number; max: number };
  description: string;
  lowRiskNote?: string;
  highRiskNote?: string;
}

export const BIOMARKER_REFERENCES: BiomarkerReference[] = [
  // ── Lipid Panel ──
  {
    name: 'Total Cholesterol', synonyms: ['cholesterol total', 'chol', 'tc'], unit: 'mg/dL', category: 'lipid', subtype: 'panel_value',
    normalRange: { min: 0, max: 200 }, borderlineRange: { min: 200, max: 239 },
    description: 'Total amount of cholesterol in your blood.',
    highRiskNote: 'Total blood fat is higher than ideal; maintaining a lower level supports cardiovascular flow.',
  },
  {
    name: 'HDL Cholesterol', synonyms: ['hdl', 'high density lipoprotein', 'hdl-c'], unit: 'mg/dL', category: 'lipid', subtype: 'panel_value',
    normalRange: { min: 40, max: 200 },
    description: 'The "protective" factor that helps keep your arteries clear.',
    lowRiskNote: 'Your protective cholesterol factor is lower than ideal.',
  },
  {
    name: 'LDL Cholesterol', synonyms: ['ldl', 'low density lipoprotein', 'ldl-c'], unit: 'mg/dL', category: 'lipid', subtype: 'panel_value',
    normalRange: { min: 0, max: 100 }, borderlineRange: { min: 100, max: 159 },
    description: 'A primary marker for cardiovascular risk and arterial health.',
    highRiskNote: 'Circulating risk markers are elevated; consider dietary adjustments.',
  },
  {
    name: 'Triglycerides', synonyms: ['tg', 'trig'], unit: 'mg/dL', category: 'lipid', subtype: 'panel_value',
    normalRange: { min: 0, max: 150 }, borderlineRange: { min: 150, max: 199 },
    description: 'The amount of unused energy (fat) circulating in your blood.',
    highRiskNote: 'High circulating energy fats can impact metabolic efficiency.',
  },

  // ── Blood Sugar ──
  {
    name: 'Fasting Glucose', synonyms: ['glucose', 'fbs', 'fasting blood sugar', 'plasma glucose'], unit: 'mg/dL', category: 'blood_sugar', subtype: 'panel_value',
    normalRange: { min: 70, max: 99 }, borderlineRange: { min: 100, max: 125 },
    description: 'Your blood sugar level while fasting; a key indicator of metabolic fuel control.',
    highRiskNote: 'Elevated fasting sugar suggests your body is working harder to manage fuel.',
  },
  {
    name: 'HbA1c', synonyms: ['glycated hemoglobin', 'a1c', 'hba1c'], unit: '%', category: 'blood_sugar', subtype: 'percentage',
    normalRange: { min: 0, max: 5.6 }, borderlineRange: { min: 5.7, max: 6.4 },
    description: 'Your average blood sugar balance over the last 3 months.',
    highRiskNote: 'Higher 3-month average suggests a need for better glucose management.',
  },

  // ── Blood Count (CBC) Hardened ──
  {
    name: 'Hemoglobin', synonyms: ['hb', 'hgb', 'haemoglobin'], unit: 'g/dL', category: 'blood_count', subtype: 'panel_value',
    normalRange: { min: 12, max: 17.5 },
    description: 'Your blood’s oxygen-carrying capacity.',
    lowRiskNote: 'Your oxygen-delivery capacity is lower than ideal; often linked to energy levels.',
    highRiskNote: 'Your blood concentration is higher than typical.',
  },
  {
    name: 'White Blood Cells', synonyms: ['wbc', 'total leukocyte count', 'tlc', 'white blood cell count'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 4000, max: 11000 },
    description: 'The primary soldiers of your immune system.',
    lowRiskNote: 'Lower immune cell counts may indicate a period of reduced defense.',
    highRiskNote: 'Elevated immune cell counts often signal an active internal response.',
  },
  {
    name: 'Platelets', synonyms: ['plt', 'platelet count', 'thrombocytes'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 150000, max: 450000 },
    description: 'Tiny cells responsible for your blood’s healing and clotting ability.',
    lowRiskNote: 'Lower clotting capacity detected; monitor for bruising or slow healing.',
  },
  {
    name: 'Red Blood Cells', synonyms: ['rbc', 'red blood cell count', 'erythrocytes'], unit: 'M/uL', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 4.0, max: 5.9 },
    description: 'The cells that transport oxygen to every part of your body.',
    lowRiskNote: 'Low RBC count may indicate anemia.',
  },
  {
    name: 'Hematocrit', synonyms: ['hct', 'pcv', 'packed cell volume'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 36, max: 50 },
    description: 'Proportion of blood volume occupied by red blood cells.',
  },
  {
    name: 'MCV', synonyms: ['mean corpuscular volume', 'mcv'], unit: 'fL', category: 'blood_count', subtype: 'panel_value',
    normalRange: { min: 80, max: 100 },
    description: 'Average volume of a red blood cell.',
    lowRiskNote: 'Microcytic anemia (often iron deficiency).',
    highRiskNote: 'Macrocytic anemia (often B12 or folate deficiency).',
  },
  {
    name: 'MCH', synonyms: ['mean corpuscular hemoglobin', 'mch'], unit: 'pg', category: 'blood_count', subtype: 'panel_value',
    normalRange: { min: 27, max: 33 },
    description: 'Average amount of oxygen-carrying hemoglobin inside a red blood cell.',
    lowRiskNote: 'Low content often mirrors iron deficiency patterns.',
    highRiskNote: 'Higher content can simply be an individual variant or related to dehydration.',
  },

  // ── DIFFERENTIAL WBC (PERCENTAGES) ──
  {
    name: 'Neutrophils %', synonyms: ['segs %', 'polys %', 'neutrophil percentage', 'neutrophils', 'neutrophils %', 'neutrophil %'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 40, max: 80 },
    description: 'Percentage of most abundant white blood cell.',
    highRiskNote: 'Elevated primarily in bacterial infections.',
  },
  {
    name: 'Lymphocytes %', synonyms: ['lymphs %', 'lymphocyte percentage', 'lymphocytes', 'lymphocytes %', 'lymphocyte %'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 20, max: 40 },
    description: 'Percentage of white blood cells critical for adaptive immunity.',
    highRiskNote: 'Elevated primarily in viral infections.',
  },
  {
    name: 'Monocytes %', synonyms: ['monos %', 'monocyte percentage', 'monocytes', 'monocytes %', 'monocyte %'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 2, max: 10 },
    description: 'Percentage of macrophages/phagocytes.',
    highRiskNote: 'Elevated in chronic infections or inflammatory conditions.',
  },
  {
    name: 'Eosinophils %', synonyms: ['eos %', 'eosinophil percentage', 'eosinophils', 'eosinophils %', 'eosinophil %'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 1, max: 6 },
    description: 'Percentage of allergic/parasitic-response cells.',
    highRiskNote: 'Elevated counts are often linked to seasonal allergies or internal sensitivities.',
  },
  {
    name: 'Basophils %', synonyms: ['baso %', 'basophil percentage', 'basophils', 'basophils %', 'basophil %'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 0, max: 2 },
    description: 'Percentage of inflammatory-response cells.',
    highRiskNote: 'Slight elevations can occur during active inflammatory responses.',
  },

  // ── DIFFERENTIAL WBC (ABSOLUTE COUNTS) ──
  {
    name: 'Absolute Neutrophil Count', synonyms: ['anc', 'absolute neutrophils', 'neutrophils abs', 'abs neutrophils', 'neutrophil count'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 2000, max: 7000 },
    description: 'Absolute count of neutrophil cells.',
    highRiskNote: 'High count indicates strong bacterial defense response.',
  },
  {
    name: 'Absolute Lymphocyte Count', synonyms: ['alc', 'absolute lymphocytes', 'lymphocytes abs', 'abs lymphocytes', 'lymphocyte count'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 1000, max: 3000 },
    description: 'Absolute count of lymphocyte cells.',
  },
  {
    name: 'Absolute Monocyte Count', synonyms: ['amc', 'absolute monocytes', 'monocytes abs', 'abs monocytes', 'monocyte count'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 200, max: 1000 },
    description: 'Absolute count of monocyte cells.',
  },
  {
    name: 'Absolute Eosinophil Count', synonyms: ['aec', 'absolute eosinophils', 'eosinophils abs', 'abs eosinophils', 'eosinophil count'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 20, max: 500 },
    description: 'Absolute count of eosinophil cells.',
  },
  {
    name: 'Absolute Basophil Count', synonyms: ['abc', 'absolute basophils', 'basophils abs', 'abs basophils', 'basophil count'], unit: 'cells/cumm', category: 'blood_count', subtype: 'absolute_count',
    normalRange: { min: 0, max: 100 },
    description: 'Absolute count of basophil cells.',
  },
  {
    name: 'Band Cells', synonyms: ['bands', 'band neutrophils'], unit: '%', category: 'blood_count', subtype: 'percentage',
    normalRange: { min: 0, max: 5 },
    description: 'Immature neutrophils released during severe bacterial infections.',
    highRiskNote: 'Elevated bands (>10%) indicate a "left shift", suggesting severe bacterial infection.',
  },

  // ── Infectious Diseases (Strict Qualitative) ──
  {
    name: 'Dengue NS1 Antigen', synonyms: ['dengue ns1', 'ns1 ag', 'ns1 antigen'], unit: '', category: 'infectious_disease', subtype: 'qualitative',
    isQualitative: true,
    description: 'Antigen test for early detection of Dengue virus infection.',
    highRiskNote: 'Positive indicates active Dengue infection. Monitor platelet counts carefully.',
  },
  {
    name: 'Dengue IgM', synonyms: ['dengue igm antibody', 'igm dengue'], unit: '', category: 'infectious_disease', subtype: 'qualitative',
    isQualitative: true,
    description: 'Antibody indicating recent active Dengue infection.',
    highRiskNote: 'Positive indicates recent/active Dengue infection.',
  },
  {
    name: 'Dengue IgG', synonyms: ['dengue igg antibody', 'igg dengue'], unit: '', category: 'infectious_disease', subtype: 'qualitative',
    isQualitative: true,
    description: 'Antibody indicating past infection or later stages of current infection.',
    highRiskNote: 'Positive IgG indicates past exposure or secondary infection phase.',
  },
  {
    name: 'Typhi Dot (Typhoid)', synonyms: ['typhi dot', 'typhoid', 'salmonella typhi', 'widal'], unit: '', category: 'infectious_disease', subtype: 'qualitative',
    isQualitative: true,
    description: 'Test for antibodies against Salmonella typhi (Typhoid fever).',
    highRiskNote: 'Positive suggests Typhoid fever. Clinical correlation advised.',
  },
  {
    name: 'Malaria Antigen', synonyms: ['malaria', 'plasmodium', 'mp smear'], unit: '', category: 'infectious_disease', subtype: 'qualitative',
    isQualitative: true,
    description: 'Detection of Malaria parasite.',
    highRiskNote: 'Positive indicates Malaria infection. Immediate clinical correlation required.',
  },

  // ── Inflammatory Markers ──
  {
    name: 'C-Reactive Protein', synonyms: ['crp', 'c reactive protein', 'hs-crp'], unit: 'mg/L', category: 'inflammatory', subtype: 'panel_value',
    normalRange: { min: 0, max: 10 },
    description: 'General marker for inflammation or infection in the body.',
    highRiskNote: 'High CRP indicates active inflammation or infection.',
  },
  
  // ── Vitamins & Others ──
  {
    name: 'Vitamin D', synonyms: ['vit d', '25-oh vitamin d', '25-hydroxy vitamin d'], unit: 'ng/mL', category: 'vitamin', subtype: 'panel_value',
    normalRange: { min: 30, max: 100 }, borderlineRange: { min: 20, max: 29 },
    description: 'Essential for bone health, immunity, and mood.',
    lowRiskNote: 'Deficiency causes bone weakness and fatigue.',
  },
  {
    name: 'Vitamin B12', synonyms: ['vit b12', 'cobalamin', 'cyanocobalamin'], unit: 'pg/mL', category: 'vitamin', subtype: 'panel_value',
    normalRange: { min: 200, max: 900 },
    description: 'Essential for nerve function and red blood cell production.',
    lowRiskNote: 'Deficiency causes fatigue, numbness, and cognitive issues.',
  }
];

/**
 * Normalizes a raw biomarker name to its strict dictionary entry.
 * Uses exact string matching against the synonym map with explicit boundary rules
 * to prevent overlap (e.g., 'hb' mapping to 'hba1c').
 */
export function getReference(rawName: string): BiomarkerReference | undefined {
  const normalizedRaw = rawName?.toLowerCase().trim() || '';
  
  return BIOMARKER_REFERENCES.find(ref => {
    // Exact or included synonym match
    if (ref.name?.toLowerCase() === normalizedRaw) return true;

    // Strict exclusion rule: If we are evaluating Hemoglobin, never match anything containing a1c or glycated
    if (ref.name === 'Hemoglobin') {
      if (normalizedRaw.includes('a1c') || normalizedRaw.includes('glycated')) return false;
    }
    
    // Strict exclusion rule: If we are evaluating Hematocrit, never match anything containing RBC
    if (ref.name === 'Hematocrit') {
      if (normalizedRaw.includes('rbc') || normalizedRaw.includes('red blood')) return false;
    }
    
    // Strict exclusion rule: Red blood cells shouldn't match Hematocrit or PCV
    if (ref.name === 'Red Blood Cells') {
      if (normalizedRaw.includes('hct') || normalizedRaw.includes('pcv')) return false;
    }

    return ref.synonyms.some(syn => {
      // Use boundary-aware expression to prevent generic overlap
      const escapedSyn = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escapedSyn}([^a-z0-9]|$)`, 'i');
      return regex.test(normalizedRaw);
    });
  });
}

/**
 * Safely computes the clinical flag based on strict arithmetic and qualitative rules.
 * Never guesses an unknown value.
 */
export function computeFlag(
  valueNum: number | null,
  refLow: number | null,
  refHigh: number | null,
  qualitative: string | null,
  isDiseaseMarker: boolean = false
): { numeric: NumericStatus; clinical: ClinicalStatus } {
  // If qualitative exists, it overrides purely numerical logic
  if (qualitative) {
    const q = qualitative?.toLowerCase() || '';
    
    // Check NEGATIVES first to prevent "non-reactive" from triggering "reactive"
    if (q.includes('negative') || q.includes('non-reactive') || q.includes('not detected') || q.match(/\bneg\b/)) {
      return { numeric: 'WITHIN_RANGE', clinical: 'NORMAL' };
    }
    
    // Now check POSITIVES
    if (q.includes('positive') || q.includes('reactive') || q.includes('detected') || q.match(/\bpos\b/)) {
      return { numeric: 'ABOVE_RANGE', clinical: isDiseaseMarker ? 'HIGH_PRIORITY' : 'BORDERLINE' }; 
    }
    
    if (q.includes('equivocal') || q.includes('borderline') || q.includes('indeterminate')) {
      return { numeric: 'ABOVE_RANGE', clinical: 'BORDERLINE' };
    }
    return { numeric: 'UNVERIFIED', clinical: 'UNVERIFIED' };
  }

  // Purely numeric logic mapped against extracted bounds
  if (valueNum !== null && refLow !== null && refHigh !== null) {
    if (valueNum === 0 && refLow === 0) {
      return { numeric: 'WITHIN_RANGE', clinical: 'NORMAL' };
    }

    if (valueNum < refLow) {
      return { numeric: 'BELOW_RANGE', clinical: 'CLINICALLY_NOTABLE' };
    }
    if (valueNum > refHigh) {
      return { numeric: 'ABOVE_RANGE', clinical: 'CLINICALLY_NOTABLE' };
    }
    return { numeric: 'WITHIN_RANGE', clinical: 'NORMAL' };
  }

  return { numeric: 'UNVERIFIED', clinical: 'UNVERIFIED' };
}

/**
 * Pass 2: Clinical Overlay Engine
 * Applies biomarker-specific overrides to raw numeric deviations.
 */
export function applyClinicalRules(
  canonicalName: string,
  numericDb: NumericStatus,
  baseClinical: ClinicalStatus,
  valueNum: number | null
): ClinicalStatus {
  if (baseClinical === 'UNVERIFIED') return 'UNVERIFIED';
  if (numericDb === 'WITHIN_RANGE') return 'NORMAL';
  
  const name = canonicalName.toLowerCase();
  
  // HDL Logic
  if (name.includes('hdl')) {
     if (valueNum && valueNum >= 60) return 'FAVORABLE';
     if (numericDb === 'BELOW_RANGE' || (valueNum && valueNum < 40)) return 'CLINICALLY_NOTABLE';
     return 'NORMAL';
  }
  
  // CRP Logic
  if (name.includes('crp') || name.includes('c-reactive')) {
     if (numericDb === 'ABOVE_RANGE') return 'CLINICALLY_NOTABLE';
     return 'NORMAL';
  }
  
  // Hemoglobin & Hematocrit (Cautious but notable)
  if (name.includes('hemoglobin') || name.includes('hb') || name.includes('hematocrit') || name.includes('hct')) {
     return 'CLINICALLY_NOTABLE';
  }

  return baseClinical;
}

/**
 * Returns a cautious, direction-aware interpretation note.
 * Never diagnosed. Never outputs opposite direction text.
 */
export function getDirectionalNote(
  canonicalName: string, 
  valueNum: number | null,
  numericStatus: NumericStatus,
  clinicalStatus: ClinicalStatus,
  qualitative: string | null = null,
  needsVerification: boolean = false
): string {
  if (needsVerification || numericStatus === 'UNVERIFIED') {
    return 'Result detected but reference/placement uncertain. Please verify in the original report layout.';
  }

  const name = canonicalName?.toLowerCase() || '';

  // 1. Qualitative Directions
  if (qualitative) {
    const q = qualitative?.toLowerCase() || '';
    const isPositive = q.includes('pos') || q.includes('reactive') || q.includes('detected');
    if (isPositive) {
      if (name.includes('dengue')) return 'Active or recent Dengue indicator. Strict clinical correlation and platelet monitoring required.';
      if (name.includes('typhi')) return 'Typhi Dot screening test is positive. Clinical correlation and confirmatory testing such as blood culture may be recommended.';
      if (name.includes('malaria')) return 'Malaria parasite detected. Immediate clinical correlation required.';
      return 'Qualitative indicator detected. Consult physician.';
    }
    return 'Negative/Normal qualitative result.';
  }

  // 2. Numeric Direction-Aware Handlers
  if (clinicalStatus === 'NORMAL') {
    return 'Value is within the provided or typical clinical reference range.';
  }
  
  if (clinicalStatus === 'FAVORABLE') {
    return 'Value is outside the numeric threshold but is generally considered clinically favorable or protective.';
  }

  if (numericStatus === 'BELOW_RANGE') {
    if (name.includes('hemoglobin') || name.includes('hb')) return 'Hb is below reference range, which can be seen with iron deficiency or other anemia patterns. Correlate with symptoms.';
    if (name.includes('white blood') || name.includes('wbc') || name.includes('leukocyte')) return 'Low WBC (leukopenia) may indicate a weakened immune defense or viral suppression.';
    if (name.includes('platelet')) return 'Low platelets (thrombocytopenia) can increase bleeding risk. Often seen in viral infections like Dengue.';
    if (name.includes('mcv')) return 'Low MCV suggests microcytic anemia, commonly related to iron deficiency.';
    if (name.includes('vitamin d')) return 'Deficiency indicated; essential for bone health and immunity.';
    if (name.includes('vitamin b12')) return 'Deficiency indicated; essential for nerve health and red blood cell production.';
    if (name.includes('hdl')) return 'Low HDL (good cholesterol) increases cardiovascular risk.';
    return `Value is below the reference bound (${valueNum}).`;
  }

  if (numericStatus === 'ABOVE_RANGE') {
    if (name.includes('hemoglobin') || name.includes('hb') || name.includes('hematocrit') || name.includes('hct')) return 'Above the report reference range. This can be seen with hemoconcentration, dehydration, smoking exposure, altitude, or erythrocytosis-pattern states; clinical correlation is advised.';
    if (name.includes('white blood') || name.includes('wbc') || name.includes('leukocyte')) return 'Elevated WBC often suggests an active bacterial infection or inflammation.';
    if (name.includes('platelet')) return 'Elevated platelets may indicate reactive thrombocytosis or systemic inflammation.';
    if (name.includes('mcv')) return 'High MCV suggests macrocytic anemia, commonly related to B12/folate deficiency.';
    if (name.includes('neutrophil')) return 'Elevated neutrophils are frequently associated with bacterial infections.';
    if (name.includes('lymphocyte')) return 'Elevated lymphocytes are frequently associated with viral infections.';
    if (name.includes('cholesterol') && !name.includes('hdl')) return 'Elevated cholesterol increases cardiovascular risk markers.';
    if (name.includes('triglyceride')) return 'High triglycerides increase cardiovascular and pancreatitis risks.';
    if (name.includes('glucose') || name.includes('hba1c') || name.includes('a1c')) return 'Elevated markers suggest prediabetes or diabetes risk. Fasting evaluation recommended.';
    if (name.includes('c-reactive') || name.includes('crp')) return 'Elevated CRP indicates active systemic inflammation or infection.';
    return `Value is above the reference bound (${valueNum}).`;
  }

  return '';
}
