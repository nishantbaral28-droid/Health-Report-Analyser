import { ClinicalStatus, NumericStatus } from './biomarkers';

interface Biomarker {
  name: string;
  category: string;
  clinicalStatus: ClinicalStatus;
  numericStatus: NumericStatus;
  numericValue: number | null;
  riskLevel: 'normal' | 'borderline' | 'high_risk' | 'low' | 'unverified';
}

export interface ReportScores {
  vitality: {
    score: number;
    label: string;
    description: string;
  };
  longevity: {
    score?: number;
    label: string;
    description: string;
    hasSufficientData: boolean;
  };
  healthAge: {
    tendency?: number; // offset from actual age
    label: string;
    description: string;
    comparisonText?: string;
    bioAge?: number;
    hasSufficientData: boolean;
  };
  lifestyleVector: {
    focusArea: string;
    biggestWin: string;
    nextSteps: string[];
  };
}

export function calculateReportScores(biomarkers: Biomarker[], userAge?: number): ReportScores {
  const biomarkerMap = new Map(biomarkers.map((biomarker) => [biomarker.name.toLowerCase(), biomarker]));
  const getBiomarker = (...names: string[]) => {
    for (const name of names) {
      const found = biomarkerMap.get(name.toLowerCase());
      if (found) return found;
    }
    return undefined;
  };

  // --- 1. Vitality Score (Immediate Systemic Balance) ---
  const total = biomarkers.length;
  const normal = biomarkers.filter(b => b.riskLevel === 'normal').length;
  const highPriority = biomarkers.filter(b => b.clinicalStatus === 'HIGH_PRIORITY').length;
  const notable = biomarkers.filter(b => b.clinicalStatus === 'CLINICALLY_NOTABLE').length;

  let vScore = (normal / Math.max(total, 1)) * 100;
  vScore -= (highPriority * 15); // Heavy penalty for urgent markers
  vScore -= (notable * 5); // Moderate penalty for notable markers
  vScore = Math.max(0, Math.min(100, Math.round(vScore)));

  const vLabel = vScore > 85 ? 'Peak Vitality' : vScore > 65 ? 'Stable System' : 'Physiological Strain';
  const vDesc = vScore > 85 
    ? 'Your key health markers look strong and well balanced right now.' 
    : vScore > 65 
      ? 'Most markers look steady, with a few areas that could use attention.' 
      : 'Your results show a few clear stress signals that are worth addressing soon.';

  // --- 2. Longevity Score (Long-term Resilience Indicators) ---
  // Influencers: HDL, Vitamin D, HbA1c, CRP, Triglycerides
  let lScore = 75; // Baseline

  // Positive Drivers
  const hdl = getBiomarker('HDL Cholesterol');
  if (hdl?.numericValue && hdl.numericValue >= 60) lScore += 10;
  else if (hdl?.clinicalStatus === 'CLINICALLY_NOTABLE') lScore -= 10;

  const vitD = getBiomarker('Vitamin D');
  if (vitD?.numericValue && vitD.numericValue >= 40) lScore += 5;
  else if (vitD?.numericStatus === 'BELOW_RANGE') lScore -= 10;

  const crp = getBiomarker('C-Reactive Protein');
  if (crp?.numericValue && crp.numericValue < 1.0) lScore += 10;
  else if (crp?.clinicalStatus === 'CLINICALLY_NOTABLE') lScore -= 15;

  // Negative Drivers (Metabolic Strain)
  const a1c = getBiomarker('HbA1c');
  if (a1c?.clinicalStatus === 'CLINICALLY_NOTABLE' || a1c?.clinicalStatus === 'HIGH_PRIORITY') lScore -= 20;
  else if (a1c?.clinicalStatus === 'BORDERLINE') lScore -= 10;

  const tg = getBiomarker('Triglycerides');
  if (tg?.clinicalStatus === 'CLINICALLY_NOTABLE') lScore -= 10;

  const longevityInputs = [hdl, vitD, crp, a1c, tg].filter(Boolean).length;
  const longevityHasSufficientData = longevityInputs >= 2;

  lScore = Math.max(5, Math.min(100, Math.round(lScore)));

  const lLabel = !longevityHasSufficientData
    ? 'More Data Needed'
    : lScore > 80
      ? 'Longevity Optimized'
      : lScore > 50
        ? 'Moderate Resilience'
        : 'Focus Required';
  const lDesc = !longevityHasSufficientData
    ? 'Add markers like HbA1c, HDL, triglycerides, CRP, or vitamin D for a meaningful long-term health view.'
    : lScore > 80
      ? 'These results support strong long-term health and healthy aging.'
      : lScore > 50
        ? 'You have a fair foundation for healthy aging, with some room to improve.'
        : 'A few changes could make a meaningful difference to your long-term health.';

  // --- 3. Health Age / Biological Age Tendency ---
  // We use metabolic and inflammatory markers to estimate an age "offset"
  let ageOffset = 0; 

  if (crp?.clinicalStatus === 'CLINICALLY_NOTABLE') ageOffset += 3;
  if (a1c?.clinicalStatus === 'BORDERLINE' || a1c?.clinicalStatus === 'CLINICALLY_NOTABLE') ageOffset += 4;
  if (hdl?.clinicalStatus === 'CLINICALLY_NOTABLE') ageOffset += 2;

  // Younger tendencies
  if (longevityHasSufficientData && lScore > 85) ageOffset -= 2;
  if (vScore > 90) ageOffset -= 1;

  const actualAge = userAge || 35; // Fallback
  const tendencyAge = actualAge + ageOffset;

  const healthAgeInputs = [crp, a1c, hdl].filter(Boolean).length;
  const healthAgeHasSufficientData = healthAgeInputs >= 2;

  const ageLabel = !healthAgeHasSufficientData
    ? 'More Data Needed'
    : ageOffset > 2
      ? 'Aging Early'
      : ageOffset < -1
        ? 'Aging Slowly'
        : 'Age-Aligned';
  const ageComp = !healthAgeHasSufficientData
    ? 'Add HbA1c, HDL, and CRP to estimate health age more reliably.'
    : userAge
      ? `Your biomarkers resemble a health pattern of approx. ${tendencyAge} years.`
      : `Your current biomarkers resemble a slightly ${ageOffset > 1 ? 'older' : ageOffset < -1 ? 'younger' : 'typical'} health pattern.`;

  const ageDesc = !healthAgeHasSufficientData
     ? 'This report does not include enough aging-related markers to estimate your health age with confidence.'
     : ageOffset > 2
       ? 'Your current markers look a bit older than expected for your age.'
       : ageOffset < -1
         ? 'Your markers suggest a younger-than-expected health profile.'
         : 'Your markers are broadly in line with what is expected for your age.';

  // --- 4. Lifestyle Vectors ---
  let focusArea = 'Maintenance';
  let biggestWin = 'Routine Checkups';
  let nextSteps = ['Keep track of regular metabolic markers.'];

  if (a1c || hdl || tg) {
    if (a1c?.riskLevel !== 'normal' || tg?.riskLevel !== 'normal') {
      focusArea = 'Metabolic Efficiency';
      biggestWin = 'Blood Sugar Stability';
      nextSteps = ['Reduce processed carbohydrate intake', 'Increase zones 2 cardiovascular activity'];
    }
  }

  if (crp?.riskLevel !== 'normal' || (vitD && vitD.riskLevel !== 'normal')) {
    focusArea = 'Immune & Inflammation';
    biggestWin = 'Lowering Systemic Load';
    nextSteps = ['Optimize sleep hygiene', 'Consider Vitamin D supplementation if advised by GP'];
  }

  const hgb = getBiomarker('Hemoglobin');
  if (hgb?.riskLevel !== 'normal') {
    focusArea = 'Energy & Oxygenation';
    biggestWin = 'Optimizing Iron Stores';
    nextSteps = ['Increase iron-rich whole foods', 'Discuss ferritin testing with your doctor'];
  }

  return {
    vitality: { score: vScore, label: vLabel, description: vDesc },
    longevity: { score: longevityHasSufficientData ? lScore : undefined, label: lLabel, description: lDesc, hasSufficientData: longevityHasSufficientData },
    healthAge: {
      tendency: healthAgeHasSufficientData ? ageOffset : undefined,
      label: ageLabel,
      description: ageDesc,
      comparisonText: ageComp,
      bioAge: healthAgeHasSufficientData ? tendencyAge : undefined,
      hasSufficientData: healthAgeHasSufficientData
    },
    lifestyleVector: { focusArea, biggestWin, nextSteps }
  };
}
