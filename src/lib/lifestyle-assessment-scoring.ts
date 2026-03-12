import type { LifestyleAssessmentAnswers } from '@/components/assessment/LifestyleQuestionnaireFlow';

export type LifestyleAssessmentScores = {
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

export function calculateLifestyleAssessmentScores(answers: LifestyleAssessmentAnswers): LifestyleAssessmentScores {
  let bmi = 22;
  let bmiCategory = 'Normal';
  const h = parseFloat(answers.heightMetric);
  const w = parseFloat(answers.weightMetric);
  if (h > 0 && w > 0) {
    bmi = w / ((h / 100) * (h / 100));
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCategory = 'Overweight';
    else if (bmi >= 30) bmiCategory = 'Obese';
  }

  let metabolic = 82;
  let recovery = 80;
  let lifestyle = 82;
  const insights: LifestyleAssessmentScores['insights'] = [];

  const personalHistory = answers.personalHistory.filter((item) => item !== 'None');
  const familyHistory = answers.familyHistory.filter((item) => item !== 'None');
  const symptoms = answers.recentSymptoms.filter((item) => item !== 'None');

  const ageRange = answers.ageRange;
  const sex = answers.sex;

  const metabolicPenaltyMultiplier =
    (ageRange === '18-30' ? 0.96 : ageRange === '46-60' ? 1.08 : ageRange === '60+' ? 1.14 : 1) *
    (sex === 'Male' && (ageRange === '46-60' || ageRange === '60+') ? 1.03 : sex === 'Female' && ageRange === '60+' ? 1.03 : 1);

  const metabolicBonusMultiplier = ageRange === '18-30' ? 1.04 : ageRange === '60+' ? 0.95 : 1;

  const recoveryPenaltyMultiplier =
    ageRange === '18-30' ? 0.95 : ageRange === '46-60' ? 1.08 : ageRange === '60+' ? 1.16 : 1;

  const recoveryBonusMultiplier = ageRange === '18-30' ? 1.05 : ageRange === '60+' ? 0.94 : 1;

  const pushInsight = (insight: LifestyleAssessmentScores['insights'][number]) => {
    if (!insights.some((item) => item.title === insight.title)) {
      insights.push(insight);
    }
  };

  const applyMetabolic = (delta: number) => {
    metabolic += delta < 0 ? delta * metabolicPenaltyMultiplier : delta * metabolicBonusMultiplier;
  };

  const applyRecovery = (delta: number) => {
    recovery += delta < 0 ? delta * recoveryPenaltyMultiplier : delta * recoveryBonusMultiplier;
  };

  const applyLifestyle = (delta: number) => {
    lifestyle += delta;
  };

  const hasHighGlucoseDiet = answers.dietPattern.includes('High Carb/Sugar');
  const isSedentary = answers.activityLevel.includes('Sedentary');
  const isActive = answers.activityLevel.includes('Active');

  if (answers.smoking.includes('Current')) {
    applyLifestyle(-25);
    applyMetabolic(-15);
    pushInsight({
      category: 'Lifestyle',
      title: 'Smoking-Linked Strain',
      description: 'Current smoking increases cardiovascular strain and can lower long-term metabolic resilience.',
      flag: 'CLINICALLY_NOTABLE',
    });
  } else if (answers.smoking.includes('Ex-smoker')) {
    applyLifestyle(-5);
    pushInsight({
      category: 'Lifestyle',
      title: 'Positive Smoking Change',
      description: 'Being an ex-smoker is a meaningful positive step, even if some long-term risk can still linger.',
      flag: 'FAVORABLE',
    });
  }

  if (hasHighGlucoseDiet) {
    applyMetabolic(-15);
    applyLifestyle(-10);
    pushInsight({
      category: 'Metabolic',
      title: 'High Sugar Intake',
      description: 'A high sugar or refined-carb eating pattern can make blood sugar regulation and weight control harder over time.',
      flag: 'WARNING',
    });
  } else if (answers.dietPattern.includes('Balanced')) {
    applyMetabolic(6);
    applyLifestyle(6);
    pushInsight({
      category: 'Lifestyle',
      title: 'Balanced Diet Pattern',
      description: 'A balanced eating pattern supports steadier energy, metabolic health, and long-term consistency.',
      flag: 'FAVORABLE',
    });
  } else if (answers.dietPattern.includes('Intermittent Fasting')) {
    applyMetabolic(5);
    applyLifestyle(3);
  } else if (answers.dietPattern.includes('Keto / Low Carb')) {
    applyMetabolic(4);
    applyLifestyle(2);
  } else if (answers.dietPattern.includes('Vegetarian/Vegan')) {
    applyLifestyle(3);
  }

  if (answers.sleepDuration.includes('< 5')) {
    applyRecovery(-30);
    applyMetabolic(-10);
    pushInsight({
      category: 'Recovery',
      title: 'Very Low Sleep',
      description: 'Regularly sleeping under 5 hours can affect recovery, appetite regulation, and metabolic balance.',
      flag: 'CLINICALLY_NOTABLE',
    });
  } else if (answers.sleepDuration.includes('5-6')) {
    applyRecovery(-15);
    applyMetabolic(-5);
    pushInsight({
      category: 'Recovery',
      title: 'Short Sleep Window',
      description: 'Sleeping 5 to 6 hours may be enough to function, but often leaves recovery and focus below their best.',
      flag: 'WARNING',
    });
  } else if (answers.sleepDuration.includes('7-8')) {
    applyRecovery(10);
    applyLifestyle(4);
    pushInsight({
      category: 'Recovery',
      title: 'Strong Sleep Routine',
      description: 'A 7 to 8 hour sleep pattern usually supports better recovery, energy, and resilience.',
      flag: 'FAVORABLE',
    });
  }

  if (isSedentary) {
    applyRecovery(-20);
    applyMetabolic(-15);
    applyLifestyle(-15);
    pushInsight({
      category: 'Lifestyle',
      title: 'Low Daily Movement',
      description: 'A mostly sedentary routine can reduce energy, recovery, and metabolic flexibility over time.',
      flag: 'WARNING',
    });
  } else if (answers.activityLevel.includes('Light')) {
    applyRecovery(-5);
    applyLifestyle(-4);
  } else if (answers.activityLevel.includes('Moderate')) {
    applyRecovery(6);
    applyMetabolic(4);
    applyLifestyle(5);
  } else if (isActive) {
    applyRecovery(15);
    applyMetabolic(12);
    applyLifestyle(10);
    pushInsight({
      category: 'Lifestyle',
      title: 'Strong Activity Pattern',
      description: 'Being consistently active supports cardiovascular fitness, insulin sensitivity, and day-to-day energy.',
      flag: 'FAVORABLE',
    });
  }

  if (bmi >= 30) {
    applyMetabolic(-15);
    applyRecovery(-10);
    pushInsight({
      category: 'Metabolic',
      title: 'BMI-Related Strain',
      description: 'Your reported height and weight suggest a BMI range that can add strain to metabolic and cardiovascular health.',
      flag: 'CLINICALLY_NOTABLE',
    });
  } else if (bmi >= 25) {
    applyMetabolic(-8);
    applyRecovery(-5);
  } else if (bmi < 18.5) {
    applyRecovery(-8);
    applyLifestyle(-4);
    pushInsight({
      category: 'Recovery',
      title: 'Low BMI Flag',
      description: 'A lower-than-expected BMI can sometimes reflect low reserves, poor intake, or other health factors worth monitoring.',
      flag: 'WARNING',
    });
  }

  if (personalHistory.some((item) => item.includes('Diabetes'))) {
    applyMetabolic(-20);
    applyLifestyle(-5);
    pushInsight({
      category: 'Metabolic',
      title: 'Blood Sugar History',
      description: 'A history of diabetes or prediabetes makes blood sugar regulation a key priority area.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }
  if (personalHistory.includes('Hypertension')) {
    applyMetabolic(-10);
    applyLifestyle(-5);
    pushInsight({
      category: 'Metabolic',
      title: 'Blood Pressure History',
      description: 'A history of high blood pressure increases the importance of lifestyle consistency and regular monitoring.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }
  if (personalHistory.includes('High Cholesterol')) {
    applyMetabolic(-10);
    pushInsight({
      category: 'Metabolic',
      title: 'Cholesterol History',
      description: 'A history of high cholesterol raises the importance of diet quality, movement, and routine follow-up testing.',
      flag: 'WARNING',
    });
  }
  if (personalHistory.includes('Thyroid Disorder')) {
    applyRecovery(-10);
    pushInsight({
      category: 'Recovery',
      title: 'Thyroid History',
      description: 'A thyroid disorder can affect energy, recovery, and weight regulation, so symptoms deserve closer attention.',
      flag: 'WARNING',
    });
  }
  if (personalHistory.includes('Fatty Liver')) {
    applyMetabolic(-15);
    pushInsight({
      category: 'Metabolic',
      title: 'Fatty Liver History',
      description: 'A history of fatty liver often goes together with broader metabolic risk and deserves consistent follow-up.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }
  if (personalHistory.includes('Heart Disease')) {
    applyMetabolic(-15);
    applyLifestyle(-10);
    pushInsight({
      category: 'Lifestyle',
      title: 'Cardiovascular History',
      description: 'A personal history of heart disease makes lifestyle protection and medical follow-up especially important.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }

  const familyRiskCount = familyHistory.filter((item) =>
    ['Diabetes', 'Hypertension', 'High Cholesterol', 'Heart Disease'].includes(item)
  ).length;
  applyMetabolic(-(familyRiskCount * 4));

  if (familyRiskCount > 0 && (isSedentary || hasHighGlucoseDiet || answers.smoking.includes('Current'))) {
    pushInsight({
      category: 'Metabolic',
      title: 'Family Risk + Lifestyle Load',
      description: 'Your family history combined with current habits suggests more benefit from early prevention and regular health checks.',
      flag: 'WARNING',
    });
  }

  if (symptoms.includes('Fatigue / Low Energy')) {
    applyRecovery(-10);
  }
  if (symptoms.includes('Brain Fog')) {
    applyRecovery(-8);
  }
  if (symptoms.includes('Poor Sleep / Insomnia')) {
    applyRecovery(-15);
    pushInsight({
      category: 'Recovery',
      title: 'Sleep Quality Strain',
      description: 'Ongoing insomnia or poor sleep can lower recovery quality, focus, and overall resilience.',
      flag: 'WARNING',
    });
  }
  if (symptoms.includes('Frequent Thirst / Urination')) {
    applyMetabolic(-20);
    pushInsight({
      category: 'Metabolic',
      title: 'Blood Sugar Warning Sign',
      description: 'Frequent thirst or urination can be a warning sign of poor glucose control and is worth following up clinically.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }
  if (symptoms.includes('Unexplained Weight Gain')) {
    applyMetabolic(-10);
    applyLifestyle(-5);
    pushInsight({
      category: 'Metabolic',
      title: 'Unexplained Weight Gain',
      description: 'Unexpected weight gain can point to changes in metabolism, sleep, hormones, or daily habits.',
      flag: 'WARNING',
    });
  }
  if (symptoms.includes('Unexplained Weight Loss')) {
    applyMetabolic(-8);
    applyRecovery(-6);
    pushInsight({
      category: 'Recovery',
      title: 'Unexplained Weight Loss',
      description: 'Unexpected weight loss deserves attention, especially if it is new or happening alongside other symptoms.',
      flag: 'WARNING',
    });
  }
  if (symptoms.includes('Digestive Issues')) {
    applyRecovery(-5);
    applyLifestyle(-5);
    pushInsight({
      category: 'Lifestyle',
      title: 'Digestive Friction',
      description: 'Frequent digestive issues can affect comfort, food choices, and day-to-day energy.',
      flag: 'WARNING',
    });
  }
  if (symptoms.includes('Frequent Craving')) {
    applyMetabolic(-10);
    pushInsight({
      category: 'Metabolic',
      title: 'Frequent Cravings',
      description: 'Frequent cravings can reflect unstable meal timing, high sugar intake, or uneven energy regulation.',
      flag: 'WARNING',
    });
  }

  if (symptoms.includes('Brain Fog') && symptoms.includes('Fatigue / Low Energy')) {
    applyRecovery(-10);
    pushInsight({
      category: 'Recovery',
      title: 'Low Energy Pattern',
      description: 'The combination of fatigue and brain fog points to a meaningful recovery signal rather than a minor inconvenience.',
      flag: 'WARNING',
    });
  }

  if (ageRange === '46-60' || ageRange === '60+') {
    pushInsight({
      category: 'Metabolic',
      title: 'Age Context Applied',
      description:
        sex === 'Male' && (ageRange === '46-60' || ageRange === '60+')
          ? 'Because heart and metabolic risk tend to rise earlier in men, your habits were weighted a little more strongly in this age range.'
          : sex === 'Female' && ageRange === '60+'
            ? 'Because heart and metabolic risk tends to rise later in women, your habits were weighted a little more strongly in this age range.'
            : 'Because recovery and heart-health risk tend to shift with age, your habits were weighted a little more strongly in this score.',
      flag: 'WARNING',
    });
  } else if (ageRange === '18-30') {
    pushInsight({
      category: 'Recovery',
      title: 'Age Context Applied',
      description: 'Younger adults often have a bit more recovery buffer, but daily habits still remain the main score driver.',
      flag: 'FAVORABLE',
    });
  }

  metabolic = Math.min(100, Math.max(0, metabolic));
  recovery = Math.min(100, Math.max(0, recovery));
  lifestyle = Math.min(100, Math.max(0, lifestyle));

  if (insights.length === 0 || insights.every((item) => item.flag === 'FAVORABLE')) {
    pushInsight({
      category: 'Lifestyle',
      title: 'Baseline Stable',
      description: 'Your questionnaire responses suggest a fairly steady baseline without major lifestyle red flags right now.',
      flag: 'FAVORABLE',
    });
  }

  const insightPriority: Record<LifestyleAssessmentScores['insights'][number]['flag'], number> = {
    CLINICALLY_NOTABLE: 0,
    WARNING: 1,
    FAVORABLE: 2,
  };

  insights.sort((a, b) => insightPriority[a.flag] - insightPriority[b.flag]);

  return {
    metabolicWellnessScore: Math.round(metabolic),
    activityRecoveryScore: Math.round(recovery),
    lifestyleRiskScore: Math.round(lifestyle),
    bmi: parseFloat(bmi.toFixed(1)),
    bmiCategory,
    insights,
  };
}
