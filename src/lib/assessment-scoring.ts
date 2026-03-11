import { AssessmentAnswers } from '@/components/assessment/QuestionnaireFlow';

export type AssessmentScores = {
  metabolicWellnessScore: number;
  activityRecoveryScore: number;
  lifestyleRiskScore: number;
  bmi: number;
  bmiCategory: string;
  insights: {
    category: 'Metabolic' | 'Recovery' | 'Lifestyle';
    title: string;
    description: string;
    flag: 'FAVORABLE' | 'CLINICALLY_NOTABLE' | 'WARNING';
  }[];
};

export function calculateAssessmentScores(answers: AssessmentAnswers): AssessmentScores {
  // 1. BMI Calculation
  let bmi = 22; // default
  let bmiCategory = 'Normal';
  const h = parseFloat(answers.heightMetric);
  const w = parseFloat(answers.weightMetric);
  if (h > 0 && w > 0) {
    bmi = w / ((h / 100) * (h / 100));
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCategory = 'Overweight';
    else if (bmi >= 30) bmiCategory = 'Obese';
  }

  // 2. Base Scores
  let metabolic = 85;
  let recovery = 80;
  let lifestyle = 85;
  const insights: AssessmentScores['insights'] = [];

  // --- LIFESTYLE DEDUCTIONS ---
  if (answers.smoking.includes('Current')) {
    lifestyle -= 25;
    metabolic -= 15;
    insights.push({
      category: 'Lifestyle',
      title: 'Cardiovascular Risk Factor',
      description: 'Smoking directly impacts cardiovascular health, raises blood pressure, and accelerates arterial aging.',
      flag: 'CLINICALLY_NOTABLE'
    });
  } else if (answers.smoking.includes('Ex-smoker')) {
    lifestyle -= 5;
    insights.push({
      category: 'Lifestyle',
      title: 'Positive Change',
      description: 'Quitting smoking significantly reduces long-term cardiovascular risk over time.',
      flag: 'FAVORABLE'
    });
  }

  if (answers.dietPattern.includes('High Carb/Sugar')) {
    metabolic -= 15;
    lifestyle -= 10;
    insights.push({
      category: 'Metabolic',
      title: 'Dietary Glucose Load',
      description: 'A high sugar diet heavily impacts insulin sensitivity, making metabolic dysfunction more likely over time.',
      flag: 'WARNING'
    });
  } else if (answers.dietPattern.includes('Balanced') || answers.dietPattern.includes('Intermittent Fasting')) {
    metabolic += 5;
  }

  // --- RECOVERY DEDUCTIONS ---
  if (answers.sleepDuration.includes('< 5')) {
    recovery -= 30;
    metabolic -= 10;
    insights.push({
      category: 'Recovery',
      title: 'Sleep Deprivation Penalty',
      description: 'Under 5 hours of sleep massively impairs metabolic clearance and dramatically raises cortisol and insulin resistance.',
      flag: 'CLINICALLY_NOTABLE'
    });
  } else if (answers.sleepDuration.includes('5-6')) {
    recovery -= 15;
    metabolic -= 5;
  } else if (answers.sleepDuration.includes('7-8')) {
    recovery += 10;
    insights.push({
      category: 'Recovery',
      title: 'Optimal Sleep',
      description: '7-8 hours supports excellent hormonal regulation and cardiovascular recovery.',
      flag: 'FAVORABLE'
    });
  }

  if (answers.activityLevel.includes('Sedentary')) {
    recovery -= 20;
    metabolic -= 15;
    lifestyle -= 15;
    insights.push({
      category: 'Lifestyle',
      title: 'Activity Deficit',
      description: 'A mostly sedentary lifestyle is a primary driver of poor metabolic health and insulin resistance.',
      flag: 'WARNING'
    });
  } else if (answers.activityLevel.includes('Active')) {
    recovery += 15;
    metabolic += 15;
    lifestyle += 10;
    insights.push({
      category: 'Lifestyle',
      title: 'Highly Active',
      description: 'Excellent activity levels promote high insulin sensitivity and cardiovascular longevity.',
      flag: 'FAVORABLE'
    });
  }

  // --- MEDICAL HISTORY IMPACT ---
  let hasMetabolicHistory = false;
  answers.personalHistory.forEach(h => {
    if (h.includes('Diabetes') || h.includes('Hypertension') || h.includes('Cholesterol')) {
      hasMetabolicHistory = true;
      metabolic -= 10;
    }
  });

  if (hasMetabolicHistory) {
    insights.push({
      category: 'Metabolic',
      title: 'History of Metabolic Markers',
      description: 'Existing markers (BP, Cholesterol, or Sugar) necessitate closer monitoring via clinical blood work.',
      flag: 'CLINICALLY_NOTABLE'
    });
  }

  answers.familyHistory.forEach(h => {
    if (h.includes('Diabetes') || h.includes('Heart Disease')) {
      metabolic -= 5; // Slight genetic penalty
      if (answers.activityLevel.includes('Sedentary') || answers.dietPattern.includes('High Carb/Sugar')) {
         insights.push({
           category: 'Metabolic',
           title: 'Genetic Tendency + Lifestyle Risk',
           description: 'Your family history combined with some lifestyle factors increases your relative risk heavily. Intervention is highly effective here.',
           flag: 'WARNING'
         });
      }
    }
  });

  // --- SYMPTOM IMPACT ---
  if (answers.recentSymptoms.includes('Brain Fog') && answers.recentSymptoms.includes('Fatigue / Low Energy')) {
    recovery -= 15;
    insights.push({
      category: 'Recovery',
      title: 'Systemic Fatigue',
      description: 'You reported high fatigue and brain fog. This correlates with poor recovery, thyroid issues, or vitamin deficiencies.',
      flag: 'WARNING'
    });
  }

  if (answers.recentSymptoms.includes('Frequent Thirst / Urination')) {
    metabolic -= 20;
    insights.push({
      category: 'Metabolic',
      title: 'Pre-diabetic Indicator',
      description: 'Frequent thirst or urination is a classic hallmark of poor glucose control. A fasting glucose or HbA1c test is strongly recommended.',
      flag: 'CLINICALLY_NOTABLE'
    });
  }

  // Constraints
  metabolic = Math.min(100, Math.max(0, metabolic));
  recovery = Math.min(100, Math.max(0, recovery));
  lifestyle = Math.min(100, Math.max(0, lifestyle));

  // Generate generic favorable insight if nothing is flagged
  if (insights.length === 0 || insights.every(i => i.flag === 'FAVORABLE')) {
    insights.push({
      category: 'Lifestyle',
      title: 'Baseline Stable',
      description: 'Your lifestyle indicators are currently stable without major red flags. Continue monitoring your health.',
      flag: 'FAVORABLE'
    });
  }

  return {
    metabolicWellnessScore: Math.round(metabolic),
    activityRecoveryScore: Math.round(recovery),
    lifestyleRiskScore: Math.round(lifestyle),
    bmi: parseFloat(bmi.toFixed(1)),
    bmiCategory,
    insights
  };
}
