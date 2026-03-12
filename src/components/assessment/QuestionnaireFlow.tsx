'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Droplets,
  HeartPulse,
  Loader2,
  MoonStar,
  Sparkles,
  Target,
} from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type {
  AssessmentAnswers,
  CortisolQuestionnaireAnswers,
  DiabetesQuestionnaireAnswers,
  ScoreType,
} from '@/lib/assessment-scoring';

const initialCortisolAnswers: CortisolQuestionnaireAnswers = {
  ageRange: '',
  heightMetric: '',
  weightMetric: '',
  stressLevel: '',
  sleepDuration: '',
  sleepQuality: '',
  caffeineIntake: '',
  workPattern: '',
  exerciseStyle: '',
  recoveryRoutine: '',
  symptoms: [],
};

const initialDiabetesAnswers: DiabetesQuestionnaireAnswers = {
  ageRange: '',
  sex: '',
  heightMetric: '',
  weightMetric: '',
  activityLevel: '',
  sleepDuration: '',
  sugarPattern: '',
  sugaryDrinks: '',
  smoking: '',
  personalHistory: [],
  familyHistory: [],
  symptoms: [],
};

const SCORE_PROGRAMS: Record<
  ScoreType,
  {
    title: string;
    subtitle: string;
    icon: ReactNode;
    steps: string[];
    disclaimer: string;
  }
> = {
  cortisol: {
    title: 'Cortisol Score',
    subtitle: 'Check how your stress, sleep, and recovery pattern looks from a short questionnaire.',
    icon: <MoonStar className="h-5 w-5 text-[var(--accent-purple)]" />,
    steps: ['The Basics', 'Stress & Sleep', 'Daily Load', 'Body Signals'],
    disclaimer:
      'This is a cortisol-pattern heuristic, not a cortisol blood test. It helps surface stress-and-recovery patterns that may deserve closer attention.',
  },
  diabetes: {
    title: 'Diabetes Score',
    subtitle: 'Check diabetes-related lifestyle and symptom risk from a focused questionnaire.',
    icon: <Droplets className="h-5 w-5 text-[var(--accent-blue)]" />,
    steps: ['The Basics', 'Daily Habits', 'Risk History', 'Body Signals'],
    disclaimer:
      'This is a diabetes-risk heuristic, not a diagnosis. It highlights risk drivers and symptom patterns worth following up on clinically.',
  },
};

export default function QuestionnaireFlow() {
  const [scoreType, setScoreType] = useState<ScoreType | null>(null);
  const [step, setStep] = useState(0);
  const [cortisolAnswers, setCortisolAnswers] = useState<CortisolQuestionnaireAnswers>(initialCortisolAnswers);
  const [diabetesAnswers, setDiabetesAnswers] = useState<DiabetesQuestionnaireAnswers>(initialDiabetesAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const currentProgram = scoreType ? SCORE_PROGRAMS[scoreType] : null;
  const currentAnswers = scoreType === 'cortisol' ? cortisolAnswers : scoreType === 'diabetes' ? diabetesAnswers : null;
  const totalSteps = currentProgram?.steps.length ?? 0;

  const diabetesPersonalHistory = useMemo(() => {
    const options = ['Prediabetes / insulin resistance', 'High blood pressure', 'High cholesterol', 'Fatty liver'];

    if (diabetesAnswers.sex === 'Female') {
      options.push('Gestational diabetes / PCOS');
    }

    return [...options, 'None'];
  }, [diabetesAnswers.sex]);

  const selectProgram = (nextScoreType: ScoreType) => {
    setScoreType(nextScoreType);
    setStep(0);
    setIsSubmitting(false);
  };

  const updateCortisolField = (key: keyof CortisolQuestionnaireAnswers, value: string) => {
    setCortisolAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const updateDiabetesField = (key: keyof DiabetesQuestionnaireAnswers, value: string) => {
    setDiabetesAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const updateArray = (
    key: 'symptoms' | 'personalHistory' | 'familyHistory',
    value: string,
    isChecked: boolean
  ) => {
    if (scoreType === 'cortisol') {
      setCortisolAnswers((prev) => {
        const items = key === 'symptoms' ? prev.symptoms : [];
        const nextItems = value === 'None'
          ? ['None']
          : isChecked
            ? [...items, value]
            : items.filter((item) => item !== value);

        return {
          ...prev,
          symptoms: nextItems.filter((item, index, arr) => item !== 'None' || (value === 'None' && index === arr.length - 1)),
        };
      });
      return;
    }

    setDiabetesAnswers((prev) => {
      const items = prev[key];
      const nextItems = value === 'None'
        ? ['None']
        : isChecked
          ? [...items, value]
          : items.filter((item) => item !== value);

      return {
        ...prev,
        [key]: nextItems.filter((item, index, arr) => item !== 'None' || (value === 'None' && index === arr.length - 1)),
      };
    });
  };

  const handlePrev = () => {
    if (step === 0) {
      setScoreType(null);
      setIsSubmitting(false);
      return;
    }

    setStep((current) => Math.max(current - 1, 0));
  };

  const handleNext = () => {
    if (!currentProgram) return;
    setStep((current) => Math.min(current + 1, currentProgram.steps.length - 1));
  };

  const handleSubmit = async () => {
    if (!scoreType || !currentAnswers) return;

    setIsSubmitting(true);

    const payload: AssessmentAnswers =
      scoreType === 'cortisol'
        ? { scoreType, responses: cortisolAnswers }
        : { scoreType, responses: diabetesAnswers };

    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      if (data?.session_id) {
        router.push(`/assessment/results?id=${data.session_id}`);
      } else if (data?.fallback_payload) {
        router.push(`/assessment/results?data=${encodeURIComponent(data.fallback_payload)}`);
      } else {
        throw new Error(data.error || 'No session created');
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      alert(error instanceof Error ? `Submission Error: ${error.message}` : 'Failed to generate score. Please try again.');
    }
  };

  const isStepValid = () => {
    if (scoreType === 'cortisol') {
      switch (step) {
        case 0:
          return Boolean(cortisolAnswers.ageRange && cortisolAnswers.heightMetric && cortisolAnswers.weightMetric);
        case 1:
          return Boolean(cortisolAnswers.stressLevel && cortisolAnswers.sleepDuration && cortisolAnswers.sleepQuality);
        case 2:
          return Boolean(
            cortisolAnswers.caffeineIntake &&
              cortisolAnswers.workPattern &&
              cortisolAnswers.exerciseStyle &&
              cortisolAnswers.recoveryRoutine
          );
        case 3:
          return cortisolAnswers.symptoms.length > 0;
        default:
          return false;
      }
    }

    if (scoreType === 'diabetes') {
      switch (step) {
        case 0:
          return Boolean(
            diabetesAnswers.ageRange &&
              diabetesAnswers.sex &&
              diabetesAnswers.heightMetric &&
              diabetesAnswers.weightMetric
          );
        case 1:
          return Boolean(
            diabetesAnswers.activityLevel &&
              diabetesAnswers.sleepDuration &&
              diabetesAnswers.sugarPattern &&
              diabetesAnswers.sugaryDrinks &&
              diabetesAnswers.smoking
          );
        case 2:
          return diabetesAnswers.personalHistory.length > 0 && diabetesAnswers.familyHistory.length > 0;
        case 3:
          return diabetesAnswers.symptoms.length > 0;
        default:
          return false;
      }
    }

    return false;
  };

  if (!scoreType) {
    return (
      <div className="surface-card w-full p-6 md:p-10 relative transition-all glow-blue">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--accent-purple)]">
            Check Your Score
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Choose what you want to screen for</h2>
          <p className="mt-3 text-sm md:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
            Pick a focused score and answer a short, relevant questionnaire. Each flow is designed around the risk drivers that matter most for that score.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ScoreTypeCard
            icon={<MoonStar className="h-6 w-6 text-[var(--accent-purple)]" />}
            title="Cortisol Score"
            description="Stress load, sleep strain, caffeine reliance, and recovery habits."
            accent="var(--accent-purple)"
            onClick={() => selectProgram('cortisol')}
          />
          <ScoreTypeCard
            icon={<Droplets className="h-6 w-6 text-[var(--accent-blue)]" />}
            title="Diabetes Score"
            description="Blood-sugar risk factors, family history, symptoms, and daily habits."
            accent="var(--accent-blue)"
            onClick={() => selectProgram('diabetes')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 md:p-10 w-full relative group transition-all glow-blue">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--bg-card-hover)] rounded-t-2xl overflow-hidden">
        <div
          className="h-full bg-[var(--accent-purple)] transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-[var(--accent-purple)] uppercase tracking-wider">
            Step {step + 1} of {totalSteps}
          </span>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{currentProgram?.steps[step]}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
          {currentProgram?.icon}
          <span>{currentProgram?.title}</span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
          {scoreType === 'cortisol' ? getCortisolStepHeading(step) : getDiabetesStepHeading(step)}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {scoreType === 'cortisol' ? getCortisolStepDescription(step) : getDiabetesStepDescription(step)}
        </p>
      </div>

      {scoreType === 'cortisol' ? (
        <CortisolStepContent
          step={step}
          answers={cortisolAnswers}
          updateField={updateCortisolField}
          updateArray={updateArray}
        />
      ) : (
        <DiabetesStepContent
          step={step}
          answers={diabetesAnswers}
          updateField={updateDiabetesField}
          updateArray={updateArray}
          personalHistoryOptions={diabetesPersonalHistory}
        />
      )}

      <div className="mt-8 rounded-xl border border-[var(--accent-purple)]/20 bg-[var(--accent-purple)]/10 p-4 flex gap-3 items-start">
        <HeartPulse className="w-5 h-5 text-[var(--accent-purple)] mt-0.5 flex-shrink-0" />
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">{currentProgram?.disclaimer}</p>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Change Score' : 'Back'}
        </button>

        {step < totalSteps - 1 ? (
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            style={{ background: 'var(--gradient-primary)' }}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isStepValid() || isSubmitting}
            className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-105"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            Generate Score
          </button>
        )}
      </div>
    </div>
  );
}

function CortisolStepContent({
  step,
  answers,
  updateField,
  updateArray,
}: {
  step: number;
  answers: CortisolQuestionnaireAnswers;
  updateField: (key: keyof CortisolQuestionnaireAnswers, value: string) => void;
  updateArray: (
    key: 'symptoms' | 'personalHistory' | 'familyHistory',
    value: string,
    isChecked: boolean
  ) => void;
}) {
  if (step === 0) {
    return (
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
        <QuestionBlock label="Age Range">
          {['18-30', '31-45', '46-60', '60+'].map((age) => (
            <Chip key={age} selected={answers.ageRange === age} onClick={() => updateField('ageRange', age)}>
              {age}
            </Chip>
          ))}
        </QuestionBlock>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Height (cm)"
            placeholder="e.g. 175"
            value={answers.heightMetric}
            onChange={(value) => updateField('heightMetric', value)}
          />
          <TextField
            label="Weight (kg)"
            placeholder="e.g. 70"
            value={answers.weightMetric}
            onChange={(value) => updateField('weightMetric', value)}
          />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
        <QuestionBlock label="How stressed do you feel on most days?">
          {['Low / manageable', 'Moderate / fluctuating', 'High most days', 'Constantly overwhelmed'].map((option) => (
            <Chip key={option} selected={answers.stressLevel === option} onClick={() => updateField('stressLevel', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Sleep Duration">
          {['< 5 hours', '5-6 hours', '7-8 hours', '> 8 hours'].map((option) => (
            <Chip key={option} selected={answers.sleepDuration === option} onClick={() => updateField('sleepDuration', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Sleep Quality">
          {['Restful through the night', 'Light / easily disturbed', 'Wake once or twice', 'Wake often or too early'].map((option) => (
            <Chip key={option} selected={answers.sleepQuality === option} onClick={() => updateField('sleepQuality', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
        <QuestionBlock label="Caffeine Pattern">
          {['0-1 caffeinated drinks', '2-3 caffeinated drinks', '4+ caffeinated drinks', 'Energy drinks most days'].map((option) => (
            <Chip key={option} selected={answers.caffeineIntake === option} onClick={() => updateField('caffeineIntake', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Daily Schedule">
          {['Regular daytime schedule', 'Long hours / frequent deadlines', 'Rotating shifts / night schedule', 'Caregiving / always on-call'].map((option) => (
            <Chip key={option} selected={answers.workPattern === option} onClick={() => updateField('workPattern', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Movement / Training Style">
          {['Gentle movement / walking / yoga', 'Moderate training 3-4x / week', 'High-intensity most days', 'Little movement'].map((option) => (
            <Chip key={option} selected={answers.exerciseStyle === option} onClick={() => updateField('exerciseStyle', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Wind-Down or Recovery Routine">
          {['Daily wind-down routine', 'A few times per week', 'Rarely', 'Almost never'].map((option) => (
            <Chip key={option} selected={answers.recoveryRoutine === option} onClick={() => updateField('recoveryRoutine', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <QuestionBlock label="What have you been feeling regularly over the past month?" description="Select all that apply.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Waking tired',
            'Afternoon energy crash',
            'Feeling wired but tired',
            'Trouble staying asleep',
            'Irritability or anxiety',
            'Sugar or salty cravings',
            'Weight gain around the midsection',
            'Tension headaches',
            'None',
          ].map((option) => (
            <MultiChip
              key={option}
              selected={answers.symptoms.includes(option)}
              onClick={() => updateArray('symptoms', option, !answers.symptoms.includes(option))}
            >
              {option}
            </MultiChip>
          ))}
        </div>
      </QuestionBlock>
    </div>
  );
}

function DiabetesStepContent({
  step,
  answers,
  updateField,
  updateArray,
  personalHistoryOptions,
}: {
  step: number;
  answers: DiabetesQuestionnaireAnswers;
  updateField: (key: keyof DiabetesQuestionnaireAnswers, value: string) => void;
  updateArray: (
    key: 'symptoms' | 'personalHistory' | 'familyHistory',
    value: string,
    isChecked: boolean
  ) => void;
  personalHistoryOptions: string[];
}) {
  if (step === 0) {
    return (
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
        <QuestionBlock label="Age Range">
          {['18-30', '31-45', '46-60', '60+'].map((age) => (
            <Chip key={age} selected={answers.ageRange === age} onClick={() => updateField('ageRange', age)}>
              {age}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Biological Sex">
          {['Male', 'Female'].map((option) => (
            <Chip key={option} selected={answers.sex === option} onClick={() => updateField('sex', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Height (cm)"
            placeholder="e.g. 175"
            value={answers.heightMetric}
            onChange={(value) => updateField('heightMetric', value)}
          />
          <TextField
            label="Weight (kg)"
            placeholder="e.g. 70"
            value={answers.weightMetric}
            onChange={(value) => updateField('weightMetric', value)}
          />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
        <QuestionBlock label="Physical Activity">
          {['Sedentary (mostly sitting)', 'Light (1-2 days / week)', 'Moderate (3-4 days / week)', 'Active (5+ days / week)'].map((option) => (
            <Chip key={option} selected={answers.activityLevel === option} onClick={() => updateField('activityLevel', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Sleep Duration">
          {['< 5 hours', '5-6 hours', '7-8 hours', '> 8 hours'].map((option) => (
            <Chip key={option} selected={answers.sleepDuration === option} onClick={() => updateField('sleepDuration', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Food Pattern">
          {['Balanced / mostly whole-food meals', 'Some refined carbs most days', 'High refined carbs / sweets daily', 'Late-night snacking often'].map((option) => (
            <Chip key={option} selected={answers.sugarPattern === option} onClick={() => updateField('sugarPattern', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Sugary Drinks">
          {['Rarely or never', '1-3 per week', '4-6 per week', 'Daily'].map((option) => (
            <Chip key={option} selected={answers.sugaryDrinks === option} onClick={() => updateField('sugaryDrinks', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>

        <QuestionBlock label="Smoking Status">
          {['Non-smoker', 'Ex-smoker', 'Current smoker'].map((option) => (
            <Chip key={option} selected={answers.smoking === option} onClick={() => updateField('smoking', option)}>
              {option}
            </Chip>
          ))}
        </QuestionBlock>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
        <QuestionBlock label="Personal History" description="Select all that apply to you.">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {personalHistoryOptions.map((option) => (
              <MultiChip
                key={option}
                selected={answers.personalHistory.includes(option)}
                onClick={() => updateArray('personalHistory', option, !answers.personalHistory.includes(option))}
              >
                {option}
              </MultiChip>
            ))}
          </div>
        </QuestionBlock>

        <QuestionBlock label="Immediate Family History" description="Parents or siblings. Select all that apply.">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['Type 2 diabetes', 'High blood pressure', 'Heart disease', 'Obesity', 'None'].map((option) => (
              <MultiChip
                key={option}
                selected={answers.familyHistory.includes(option)}
                onClick={() => updateArray('familyHistory', option, !answers.familyHistory.includes(option))}
              >
                {option}
              </MultiChip>
            ))}
          </div>
        </QuestionBlock>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <QuestionBlock label="What have you been experiencing regularly?" description="Select all that apply.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Frequent thirst',
            'Frequent urination',
            'Strong sugar cravings',
            'Fatigue after meals',
            'Blurred vision',
            'Slow wound healing',
            'Tingling in hands or feet',
            'None',
          ].map((option) => (
            <MultiChip
              key={option}
              selected={answers.symptoms.includes(option)}
              onClick={() => updateArray('symptoms', option, !answers.symptoms.includes(option))}
            >
              {option}
            </MultiChip>
          ))}
        </div>
      </QuestionBlock>
    </div>
  );
}

function getCortisolStepHeading(step: number) {
  switch (step) {
    case 0:
      return 'Start with a little context';
    case 1:
      return 'Tell us about your stress and sleep';
    case 2:
      return 'How does your daily load look?';
    default:
      return 'What signals is your body giving you?';
  }
}

function getCortisolStepDescription(step: number) {
  switch (step) {
    case 0:
      return 'We use age and body-size context lightly so the score is anchored to your overall recovery setting.';
    case 1:
      return 'Stress level and sleep quality are two of the biggest drivers of a cortisol-pattern score.';
    case 2:
      return 'Caffeine, schedule pressure, and recovery habits help show whether your routine is calming or amplifying the stress load.';
    default:
      return 'These body signals help separate a rough week from a repeatable stress pattern.';
  }
}

function getDiabetesStepHeading(step: number) {
  switch (step) {
    case 0:
      return 'Start with the basics';
    case 1:
      return 'Tell us about your daily habits';
    case 2:
      return 'Share any diabetes-related history';
    default:
      return 'Are there any symptoms showing up?';
  }
}

function getDiabetesStepDescription(step: number) {
  switch (step) {
    case 0:
      return 'Age, sex, and body-size context are well-known contributors to diabetes-risk screening.';
    case 1:
      return 'Movement, sleep, smoking, and sugar patterns are some of the strongest habit-level drivers in this score.';
    case 2:
      return 'Personal and family history meaningfully shift risk, especially when stacked with current habits.';
    default:
      return 'These symptoms do not diagnose diabetes, but they do help identify when clinical follow-up matters more.';
  }
}

function QuestionBlock({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">{label}</label>
      {description && <p className="mb-3 text-xs text-[var(--text-muted)]">{description}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
      <input
        type="number"
        className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] p-3 rounded-lg text-white"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ScoreTypeCard({
  icon,
  title,
  description,
  accent,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="surface-card group w-full rounded-2xl border p-6 text-left transition-all hover:scale-[1.01] hover:border-[var(--border-light)]"
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{ backgroundColor: 'var(--bg-card-hover)', color: accent }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}>
        Start questionnaire <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-full text-sm font-medium transition-all border',
        selected
          ? 'bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white shadow-lg glow-purple'
          : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white'
      )}
    >
      {children}
    </button>
  );
}

function MultiChip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-2.5 rounded-xl text-sm font-medium transition-all border text-left',
        selected
          ? 'bg-[var(--accent-blue)]/20 border-[var(--accent-blue)] text-[var(--accent-blue)]'
          : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
            selected ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)] text-white' : 'border-[var(--text-muted)]'
          )}
        >
          {selected && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className="leading-tight">{children}</span>
      </div>
    </button>
  );
}
