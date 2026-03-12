export type ScoreType = 'cortisol' | 'diabetes';

export type ScoreDirection = 'higher_better' | 'higher_worse';

export type AssessmentFlag = 'FAVORABLE' | 'WARNING' | 'CLINICALLY_NOTABLE';

export type AssessmentInsight = {
  category: string;
  title: string;
  description: string;
  flag: AssessmentFlag;
};

type BaseResponses = {
  ageRange: string;
  heightMetric: string;
  weightMetric: string;
};

export type CortisolQuestionnaireAnswers = BaseResponses & {
  stressLevel: string;
  sleepDuration: string;
  sleepQuality: string;
  caffeineIntake: string;
  workPattern: string;
  exerciseStyle: string;
  recoveryRoutine: string;
  symptoms: string[];
};

export type DiabetesQuestionnaireAnswers = BaseResponses & {
  sex: string;
  activityLevel: string;
  sleepDuration: string;
  sugarPattern: string;
  sugaryDrinks: string;
  smoking: string;
  personalHistory: string[];
  familyHistory: string[];
  symptoms: string[];
};

export type AssessmentAnswers =
  | {
      scoreType: 'cortisol';
      responses: CortisolQuestionnaireAnswers;
    }
  | {
      scoreType: 'diabetes';
      responses: DiabetesQuestionnaireAnswers;
    };

export type AssessmentMetric = {
  title: string;
  score: number;
  label: string;
  description: string;
  direction: ScoreDirection;
};

export type AssessmentScores = {
  scoreType: ScoreType;
  headline: string;
  subheadline: string;
  methodNote: string;
  primaryMetric: AssessmentMetric;
  supportMetrics: [AssessmentMetric, AssessmentMetric];
  bmi: number;
  bmiCategory: string;
  insights: AssessmentInsight[];
  // Compatibility fields for older result rendering and stored sessions.
  metabolicWellnessScore: number;
  activityRecoveryScore: number;
  lifestyleRiskScore: number;
};

type BmiSummary = {
  bmi: number;
  bmiCategory: string;
};

function calculateBmi(heightMetric: string, weightMetric: string): BmiSummary {
  let bmi = 22;
  let bmiCategory = 'Normal';
  const height = parseFloat(heightMetric);
  const weight = parseFloat(weightMetric);

  if (height > 0 && weight > 0) {
    bmi = weight / ((height / 100) * (height / 100));
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCategory = 'Overweight';
    else if (bmi >= 30) bmiCategory = 'Obese';
  }

  return { bmi: parseFloat(bmi.toFixed(1)), bmiCategory };
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function pushInsight(collection: AssessmentInsight[], insight: AssessmentInsight) {
  if (!collection.some((item) => item.title === insight.title)) {
    collection.push(insight);
  }
}

function sortInsights(insights: AssessmentInsight[]) {
  const order: Record<AssessmentFlag, number> = {
    CLINICALLY_NOTABLE: 0,
    WARNING: 1,
    FAVORABLE: 2,
  };

  return [...insights].sort((a, b) => order[a.flag] - order[b.flag]);
}

function getHigherBetterBand(score: number) {
  if (score >= 80) {
    return {
      label: 'Strong',
      summary: 'This pattern looks supportive right now.',
    };
  }
  if (score >= 60) {
    return {
      label: 'Watch Closely',
      summary: 'There is some strain, but there is still room to improve with habit changes.',
    };
  }
  return {
    label: 'Needs Attention',
    summary: 'Your answers show a pattern that deserves closer attention and follow-up.',
  };
}

function getHigherWorseBand(score: number) {
  if (score >= 70) {
    return {
      label: 'Higher Risk',
      summary: 'Your answers show multiple diabetes-related risk signals.',
    };
  }
  if (score >= 45) {
    return {
      label: 'Elevated Risk',
      summary: 'There are some meaningful risk signals, but they may still be modifiable.',
    };
  }
  return {
    label: 'Lower Risk',
    summary: 'Your answers suggest a lower near-term risk pattern from this questionnaire.',
  };
}

function buildMetric(
  title: string,
  score: number,
  direction: ScoreDirection,
  description: string
): AssessmentMetric {
  const normalized = clampScore(score);
  const band = direction === 'higher_better' ? getHigherBetterBand(normalized) : getHigherWorseBand(normalized);

  return {
    title,
    score: normalized,
    label: band.label,
    description: description || band.summary,
    direction,
  };
}

function calculateCortisolScores(responses: CortisolQuestionnaireAnswers): AssessmentScores {
  const { bmi, bmiCategory } = calculateBmi(responses.heightMetric, responses.weightMetric);
  const insights: AssessmentInsight[] = [];
  const symptoms = responses.symptoms.filter((item) => item !== 'None');

  let cortisolBalance = 74;
  let recoveryReserve = 70;
  let stressLoad = 28;

  const agePenaltyMultiplier =
    responses.ageRange === '18-30'
      ? 0.96
      : responses.ageRange === '46-60'
        ? 1.06
        : responses.ageRange === '60+'
          ? 1.12
          : 1;

  const recoveryPenaltyMultiplier =
    responses.ageRange === '18-30'
      ? 0.95
      : responses.ageRange === '46-60'
        ? 1.08
        : responses.ageRange === '60+'
          ? 1.14
          : 1;

  const applyBalance = (delta: number) => {
    cortisolBalance += delta < 0 ? delta * agePenaltyMultiplier : delta;
  };

  const applyRecovery = (delta: number) => {
    recoveryReserve += delta < 0 ? delta * recoveryPenaltyMultiplier : delta;
  };

  const applyStressLoad = (delta: number) => {
    stressLoad += delta;
  };

  switch (responses.stressLevel) {
    case 'Moderate / fluctuating':
      applyBalance(-8);
      applyRecovery(-5);
      applyStressLoad(10);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'Moderate Stress Pattern',
        description: 'Your daily stress load already looks high enough to affect recovery if it stays consistent.',
        flag: 'WARNING',
      });
      break;
    case 'High most days':
      applyBalance(-16);
      applyRecovery(-12);
      applyStressLoad(18);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'High Stress Load',
        description: 'Feeling highly stressed most days is one of the clearest signals that your cortisol pattern may be under pressure.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    case 'Constantly overwhelmed':
      applyBalance(-24);
      applyRecovery(-18);
      applyStressLoad(26);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'Overload Signal',
        description: 'A constant sense of overload often goes together with poor sleep, higher stimulant use, and reduced recovery capacity.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    default:
      applyBalance(6);
      applyRecovery(6);
      applyStressLoad(-6);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'Stress Looks Manageable',
        description: 'Your answers suggest your day-to-day stress load is more contained right now.',
        flag: 'FAVORABLE',
      });
  }

  switch (responses.sleepDuration) {
    case '< 5 hours':
      applyBalance(-18);
      applyRecovery(-24);
      applyStressLoad(16);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Very Short Sleep',
        description: 'Sleeping under 5 hours regularly can push stress signaling higher and make recovery much harder.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    case '5-6 hours':
      applyBalance(-10);
      applyRecovery(-12);
      applyStressLoad(8);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Short Sleep Window',
        description: 'Consistently short sleep is one of the biggest habit drivers of a strained cortisol pattern.',
        flag: 'WARNING',
      });
      break;
    case '> 8 hours':
      applyBalance(3);
      applyRecovery(4);
      applyStressLoad(-3);
      break;
    default:
      applyBalance(8);
      applyRecovery(12);
      applyStressLoad(-8);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Healthy Sleep Duration',
        description: 'A 7 to 8 hour sleep window usually gives your recovery systems the best chance to reset well.',
        flag: 'FAVORABLE',
      });
  }

  switch (responses.sleepQuality) {
    case 'Light / easily disturbed':
      applyBalance(-6);
      applyRecovery(-8);
      applyStressLoad(5);
      break;
    case 'Wake once or twice':
      applyBalance(-10);
      applyRecovery(-12);
      applyStressLoad(8);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Sleep Maintenance Strain',
        description: 'Waking during the night can be a meaningful signal that your recovery rhythm is less stable.',
        flag: 'WARNING',
      });
      break;
    case 'Wake often or too early':
      applyBalance(-16);
      applyRecovery(-18);
      applyStressLoad(12);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Broken Sleep Pattern',
        description: 'Frequent wake-ups or waking too early often travel with higher stress load and lower day-to-day resilience.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    default:
      applyBalance(8);
      applyRecovery(10);
      applyStressLoad(-6);
  }

  switch (responses.caffeineIntake) {
    case '2-3 caffeinated drinks':
      applyBalance(-3);
      applyRecovery(-2);
      applyStressLoad(3);
      break;
    case '4+ caffeinated drinks':
      applyBalance(-8);
      applyRecovery(-6);
      applyStressLoad(10);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'High Caffeine Reliance',
        description: 'Needing several caffeinated drinks most days can be a sign that your baseline energy and recovery are under strain.',
        flag: 'WARNING',
      });
      break;
    case 'Energy drinks most days':
      applyBalance(-14);
      applyRecovery(-10);
      applyStressLoad(14);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'Stimulant-Driven Energy',
        description: 'Frequent energy drink use can amplify an already strained stress-and-recovery pattern.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    default:
      applyBalance(2);
      applyRecovery(2);
      applyStressLoad(-2);
  }

  switch (responses.workPattern) {
    case 'Long hours / frequent deadlines':
      applyBalance(-6);
      applyRecovery(-6);
      applyStressLoad(8);
      break;
    case 'Rotating shifts / night schedule':
      applyBalance(-10);
      applyRecovery(-12);
      applyStressLoad(12);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'Circadian Disruption',
        description: 'Shift work or frequent night schedules can make cortisol rhythm and sleep quality harder to stabilize.',
        flag: 'WARNING',
      });
      break;
    case 'Caregiving / always on-call':
      applyBalance(-12);
      applyRecovery(-10);
      applyStressLoad(13);
      pushInsight(insights, {
        category: 'Stress Load',
        title: 'Constant Responsiveness',
        description: 'Being mentally on-call often reduces recovery time even when you are technically resting.',
        flag: 'WARNING',
      });
      break;
    default:
      applyBalance(3);
      applyRecovery(4);
      applyStressLoad(-3);
  }

  switch (responses.exerciseStyle) {
    case 'Gentle movement / walking / yoga':
      applyBalance(4);
      applyRecovery(6);
      applyStressLoad(-3);
      break;
    case 'Moderate training 3-4x / week':
      applyBalance(6);
      applyRecovery(8);
      applyStressLoad(-5);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Helpful Movement Pattern',
        description: 'Moderate, repeatable training is usually supportive for both stress resilience and better sleep.',
        flag: 'FAVORABLE',
      });
      break;
    case 'High-intensity most days':
      if (responses.sleepDuration === '< 5 hours' || responses.sleepQuality === 'Wake often or too early') {
        applyBalance(-8);
        applyRecovery(-10);
        applyStressLoad(8);
        pushInsight(insights, {
          category: 'Recovery',
          title: 'Training-Recovery Mismatch',
          description: 'Very frequent hard training can work against recovery if sleep quality is already poor.',
          flag: 'WARNING',
        });
      } else {
        applyBalance(2);
        applyRecovery(1);
      }
      break;
    case 'Little movement':
      applyBalance(-8);
      applyRecovery(-10);
      applyStressLoad(8);
      break;
    default:
      break;
  }

  switch (responses.recoveryRoutine) {
    case 'A few times per week':
      applyBalance(4);
      applyRecovery(5);
      applyStressLoad(-4);
      break;
    case 'Rarely':
      applyBalance(-6);
      applyRecovery(-8);
      applyStressLoad(6);
      break;
    case 'Almost never':
      applyBalance(-12);
      applyRecovery(-14);
      applyStressLoad(10);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Low Recovery Rituals',
        description: 'Without any regular wind-down habit, stress tends to stay switched on for longer through the day.',
        flag: 'WARNING',
      });
      break;
    default:
      applyBalance(10);
      applyRecovery(14);
      applyStressLoad(-10);
      pushInsight(insights, {
        category: 'Recovery',
        title: 'Protective Wind-Down Routine',
        description: 'A regular wind-down practice is one of the best ways to support sleep quality and a steadier stress pattern.',
        flag: 'FAVORABLE',
      });
  }

  if (symptoms.includes('Waking tired')) {
    applyBalance(-8);
    applyRecovery(-10);
    applyStressLoad(6);
  }
  if (symptoms.includes('Afternoon energy crash')) {
    applyBalance(-6);
    applyRecovery(-8);
    applyStressLoad(6);
  }
  if (symptoms.includes('Feeling wired but tired')) {
    applyBalance(-10);
    applyRecovery(-8);
    applyStressLoad(8);
  }
  if (symptoms.includes('Trouble staying asleep')) {
    applyBalance(-10);
    applyRecovery(-12);
    applyStressLoad(8);
  }
  if (symptoms.includes('Irritability or anxiety')) {
    applyBalance(-6);
    applyRecovery(-4);
    applyStressLoad(6);
  }
  if (symptoms.includes('Sugar or salty cravings')) {
    applyBalance(-5);
    applyRecovery(-3);
    applyStressLoad(5);
  }
  if (symptoms.includes('Weight gain around the midsection')) {
    applyBalance(-6);
    applyStressLoad(6);
  }
  if (symptoms.includes('Tension headaches')) {
    applyBalance(-5);
    applyRecovery(-3);
    applyStressLoad(4);
  }

  if (symptoms.length >= 4) {
    applyBalance(-8);
    applyRecovery(-8);
    applyStressLoad(8);
    pushInsight(insights, {
      category: 'Pattern',
      title: 'Clustered Stress Symptoms',
      description: 'Several stress-linked symptoms showing up together makes this look more like a repeating pattern than an isolated bad week.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }

  if (
    bmi >= 30 &&
    (responses.stressLevel === 'High most days' || responses.stressLevel === 'Constantly overwhelmed')
  ) {
    applyBalance(-8);
    applyStressLoad(6);
    pushInsight(insights, {
      category: 'Pattern',
      title: 'Stress + Weight Pattern',
      description: 'Higher body weight together with high stress can make sleep, energy, and appetite regulation feel harder to stabilize.',
      flag: 'WARNING',
    });
  }

  cortisolBalance = clampScore(cortisolBalance);
  recoveryReserve = clampScore(recoveryReserve);
  stressLoad = clampScore(stressLoad);

  if (insights.length === 0) {
    pushInsight(insights, {
      category: 'Pattern',
      title: 'Stable Stress Pattern',
      description: 'Your responses do not show a strong cortisol-strain pattern from this questionnaire right now.',
      flag: 'FAVORABLE',
    });
  }

  return {
    scoreType: 'cortisol',
    headline: 'Cortisol Score Check',
    subheadline: 'A questionnaire-based look at stress load, sleep strain, and recovery support.',
    methodNote:
      'This is a cortisol-pattern heuristic, not a cortisol lab result. It uses your reported stress, sleep, recovery habits, and body signals to estimate whether your daily pattern looks more balanced or more strained.',
    primaryMetric: buildMetric(
      'Cortisol Balance Score',
      cortisolBalance,
      'higher_better',
      getHigherBetterBand(cortisolBalance).summary
    ),
    supportMetrics: [
      buildMetric(
        'Recovery Reserve',
        recoveryReserve,
        'higher_better',
        recoveryReserve >= 70
          ? 'Your recovery habits look supportive overall.'
          : 'Your answers suggest recovery capacity is getting squeezed.'
      ),
      buildMetric(
        'Daily Stress Load',
        stressLoad,
        'higher_worse',
        stressLoad >= 60
          ? 'Your current routine may be keeping your stress load elevated.'
          : 'Your reported daily load looks more manageable at the moment.'
      ),
    ],
    bmi,
    bmiCategory,
    insights: sortInsights(insights),
    metabolicWellnessScore: cortisolBalance,
    activityRecoveryScore: recoveryReserve,
    lifestyleRiskScore: stressLoad,
  };
}

function calculateDiabetesScores(responses: DiabetesQuestionnaireAnswers): AssessmentScores {
  const { bmi, bmiCategory } = calculateBmi(responses.heightMetric, responses.weightMetric);
  const insights: AssessmentInsight[] = [];
  const personalHistory = responses.personalHistory.filter((item) => item !== 'None');
  const familyHistory = responses.familyHistory.filter((item) => item !== 'None');
  const symptoms = responses.symptoms.filter((item) => item !== 'None');

  let diabetesRisk = 28;
  let lifestyleSupport = 68;
  let symptomSignal = 18;

  const ageRiskAdjustment =
    responses.ageRange === '18-30' ? -3 : responses.ageRange === '31-45' ? 4 : responses.ageRange === '46-60' ? 10 : 15;

  diabetesRisk += ageRiskAdjustment;

  if (responses.sex === 'Male' && (responses.ageRange === '46-60' || responses.ageRange === '60+')) {
    diabetesRisk += 2;
  }

  if (bmi >= 30) {
    diabetesRisk += 18;
    lifestyleSupport -= 10;
    pushInsight(insights, {
      category: 'Risk Profile',
      title: 'BMI-Linked Risk',
      description: 'Your reported height and weight suggest a BMI range that can meaningfully increase diabetes risk over time.',
      flag: 'CLINICALLY_NOTABLE',
    });
  } else if (bmi >= 25) {
    diabetesRisk += 10;
    lifestyleSupport -= 5;
  } else if (bmi < 18.5) {
    lifestyleSupport -= 3;
  }

  switch (responses.activityLevel) {
    case 'Sedentary (mostly sitting)':
      diabetesRisk += 12;
      lifestyleSupport -= 16;
      pushInsight(insights, {
        category: 'Lifestyle',
        title: 'Low Daily Movement',
        description: 'Low movement is one of the most consistent habit-level risk factors for poorer blood sugar regulation.',
        flag: 'WARNING',
      });
      break;
    case 'Light (1-2 days / week)':
      diabetesRisk += 4;
      lifestyleSupport -= 5;
      break;
    case 'Moderate (3-4 days / week)':
      diabetesRisk -= 4;
      lifestyleSupport += 8;
      break;
    case 'Active (5+ days / week)':
      diabetesRisk -= 8;
      lifestyleSupport += 12;
      pushInsight(insights, {
        category: 'Lifestyle',
        title: 'Helpful Activity Pattern',
        description: 'Consistent movement supports insulin sensitivity and is one of the strongest protective factors in this score.',
        flag: 'FAVORABLE',
      });
      break;
    default:
      break;
  }

  switch (responses.sleepDuration) {
    case '< 5 hours':
      diabetesRisk += 10;
      lifestyleSupport -= 8;
      break;
    case '5-6 hours':
      diabetesRisk += 5;
      lifestyleSupport -= 4;
      break;
    case '7-8 hours':
      lifestyleSupport += 5;
      break;
    default:
      break;
  }

  switch (responses.sugarPattern) {
    case 'Some refined carbs most days':
      diabetesRisk += 6;
      lifestyleSupport -= 6;
      break;
    case 'High refined carbs / sweets daily':
      diabetesRisk += 14;
      lifestyleSupport -= 12;
      pushInsight(insights, {
        category: 'Lifestyle',
        title: 'High Sugar Pattern',
        description: 'A daily pattern of refined carbs or sweets can make blood sugar stability much harder over time.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    case 'Late-night snacking often':
      diabetesRisk += 10;
      lifestyleSupport -= 8;
      pushInsight(insights, {
        category: 'Lifestyle',
        title: 'Late-Night Eating',
        description: 'Frequent late-night snacking can make appetite regulation and glucose control less predictable.',
        flag: 'WARNING',
      });
      break;
    default:
      diabetesRisk -= 4;
      lifestyleSupport += 8;
      pushInsight(insights, {
        category: 'Lifestyle',
        title: 'Balanced Food Pattern',
        description: 'A steadier whole-food eating pattern is one of the strongest protective habits in this score.',
        flag: 'FAVORABLE',
      });
  }

  switch (responses.sugaryDrinks) {
    case '1-3 per week':
      diabetesRisk += 4;
      lifestyleSupport -= 2;
      break;
    case '4-6 per week':
      diabetesRisk += 8;
      lifestyleSupport -= 5;
      break;
    case 'Daily':
      diabetesRisk += 14;
      lifestyleSupport -= 8;
      pushInsight(insights, {
        category: 'Lifestyle',
        title: 'Daily Sugary Drinks',
        description: 'Regular sugary drinks are a strong habit-level driver of higher diabetes risk.',
        flag: 'CLINICALLY_NOTABLE',
      });
      break;
    default:
      lifestyleSupport += 4;
  }

  if (responses.smoking === 'Current smoker') {
    diabetesRisk += 6;
    lifestyleSupport -= 6;
  } else if (responses.smoking === 'Ex-smoker') {
    lifestyleSupport -= 2;
  }

  if (personalHistory.includes('Prediabetes / insulin resistance')) {
    diabetesRisk += 22;
    symptomSignal += 10;
    pushInsight(insights, {
      category: 'Risk Profile',
      title: 'Prediabetes History',
      description: 'A personal history of prediabetes or insulin resistance is the single strongest questionnaire signal in this score.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }
  if (personalHistory.includes('High blood pressure')) {
    diabetesRisk += 8;
  }
  if (personalHistory.includes('High cholesterol')) {
    diabetesRisk += 5;
  }
  if (personalHistory.includes('Fatty liver')) {
    diabetesRisk += 10;
    pushInsight(insights, {
      category: 'Risk Profile',
      title: 'Fatty Liver Context',
      description: 'Fatty liver often travels with broader insulin resistance and metabolic risk.',
      flag: 'WARNING',
    });
  }
  if (personalHistory.includes('Gestational diabetes / PCOS')) {
    diabetesRisk += 10;
    symptomSignal += 4;
    pushInsight(insights, {
      category: 'Risk Profile',
      title: 'Hormonal Glucose Context',
      description: 'A history of gestational diabetes or PCOS can raise the importance of ongoing glucose monitoring.',
      flag: 'WARNING',
    });
  }

  if (familyHistory.includes('Type 2 diabetes')) {
    diabetesRisk += 12;
    pushInsight(insights, {
      category: 'Risk Profile',
      title: 'Family Diabetes History',
      description: 'A close family history of type 2 diabetes can raise baseline risk even before symptoms appear.',
      flag: 'WARNING',
    });
  }
  if (familyHistory.includes('High blood pressure')) diabetesRisk += 4;
  if (familyHistory.includes('Heart disease')) diabetesRisk += 4;
  if (familyHistory.includes('Obesity')) diabetesRisk += 5;

  if (symptoms.includes('Frequent thirst')) {
    diabetesRisk += 14;
    symptomSignal += 16;
  }
  if (symptoms.includes('Frequent urination')) {
    diabetesRisk += 14;
    symptomSignal += 16;
  }
  if (symptoms.includes('Strong sugar cravings')) {
    diabetesRisk += 6;
    symptomSignal += 8;
  }
  if (symptoms.includes('Fatigue after meals')) {
    diabetesRisk += 8;
    symptomSignal += 10;
  }
  if (symptoms.includes('Blurred vision')) {
    diabetesRisk += 10;
    symptomSignal += 12;
  }
  if (symptoms.includes('Slow wound healing')) {
    diabetesRisk += 12;
    symptomSignal += 12;
  }
  if (symptoms.includes('Tingling in hands or feet')) {
    diabetesRisk += 10;
    symptomSignal += 10;
  }

  if (symptoms.includes('Frequent thirst') && symptoms.includes('Frequent urination')) {
    diabetesRisk += 12;
    symptomSignal += 8;
    pushInsight(insights, {
      category: 'Symptoms',
      title: 'Classic Glucose Warning Pattern',
      description: 'Frequent thirst and urination together are some of the most important symptoms to follow up with a clinician.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }

  if (
    (personalHistory.includes('Prediabetes / insulin resistance') || familyHistory.includes('Type 2 diabetes')) &&
    responses.activityLevel === 'Sedentary (mostly sitting)' &&
    (responses.sugarPattern === 'High refined carbs / sweets daily' || responses.sugaryDrinks === 'Daily')
  ) {
    diabetesRisk += 8;
    lifestyleSupport -= 6;
    pushInsight(insights, {
      category: 'Risk Profile',
      title: 'Risk Stack Present',
      description: 'Your family or personal history combined with current lifestyle patterns creates a stronger diabetes-risk stack.',
      flag: 'CLINICALLY_NOTABLE',
    });
  }

  diabetesRisk = clampScore(diabetesRisk);
  lifestyleSupport = clampScore(lifestyleSupport);
  symptomSignal = clampScore(symptomSignal);

  if (insights.length === 0) {
    pushInsight(insights, {
      category: 'Lifestyle',
      title: 'Lower Risk Pattern',
      description: 'Your responses do not show a strong diabetes-risk pattern from this questionnaire right now.',
      flag: 'FAVORABLE',
    });
  }

  return {
    scoreType: 'diabetes',
    headline: 'Diabetes Score Check',
    subheadline: 'A questionnaire-based look at diabetes-related risk factors, symptoms, and daily habits.',
    methodNote:
      'This is a diabetes-risk heuristic, not a blood sugar diagnosis. It uses your reported age, body-size context, family history, habits, and symptoms to estimate how concerning the pattern looks.',
    primaryMetric: buildMetric(
      'Diabetes Risk Score',
      diabetesRisk,
      'higher_worse',
      getHigherWorseBand(diabetesRisk).summary
    ),
    supportMetrics: [
      buildMetric(
        'Lifestyle Support Score',
        lifestyleSupport,
        'higher_better',
        lifestyleSupport >= 70
          ? 'Your current habits look more supportive for glucose stability.'
          : 'Your current habits are leaving some room for better glucose support.'
      ),
      buildMetric(
        'Symptom Signal',
        symptomSignal,
        'higher_worse',
        symptomSignal >= 55
          ? 'Your symptoms deserve clinical follow-up rather than watch-and-wait.'
          : 'Your symptom load looks lighter from this questionnaire.'
      ),
    ],
    bmi,
    bmiCategory,
    insights: sortInsights(insights),
    metabolicWellnessScore: diabetesRisk,
    activityRecoveryScore: lifestyleSupport,
    lifestyleRiskScore: symptomSignal,
  };
}

export function calculateAssessmentScores(answers: AssessmentAnswers): AssessmentScores {
  if (answers.scoreType === 'cortisol') {
    return calculateCortisolScores(answers.responses);
  }

  return calculateDiabetesScores(answers.responses);
}
