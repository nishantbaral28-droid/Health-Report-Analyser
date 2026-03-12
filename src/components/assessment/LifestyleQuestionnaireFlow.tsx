'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Target, HeartPulse } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export type LifestyleAssessmentAnswers = {
  ageRange: string;
  sex: string;
  heightMetric: string;
  weightMetric: string;
  smoking: string;
  activityLevel: string;
  sleepDuration: string;
  dietPattern: string;
  personalHistory: string[];
  familyHistory: string[];
  recentSymptoms: string[];
};

const initialAnswers: LifestyleAssessmentAnswers = {
  ageRange: '',
  sex: '',
  heightMetric: '',
  weightMetric: '',
  smoking: '',
  activityLevel: '',
  sleepDuration: '',
  dietPattern: '',
  personalHistory: [],
  familyHistory: [],
  recentSymptoms: [],
};

const STEPS = [
  { id: 'basics', title: 'The Basics' },
  { id: 'lifestyle', title: 'Lifestyle & Habits' },
  { id: 'history', title: 'Health History' },
  { id: 'symptoms', title: 'Current Wellness' },
];

export default function LifestyleQuestionnaireFlow() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<LifestyleAssessmentAnswers>(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleNext = () => setStep((current) => Math.min(current + 1, STEPS.length - 1));
  const handlePrev = () => setStep((current) => Math.max(current - 1, 0));

  const updateArray = (key: keyof LifestyleAssessmentAnswers, value: string, isChecked: boolean) => {
    setAnswers((prev) => {
      const items = prev[key] as string[];
      if (value === 'None') return { ...prev, [key]: ['None'] };

      let nextItems = isChecked ? [...items, value] : items.filter((item) => item !== value);
      nextItems = nextItems.filter((item) => item !== 'None');

      return { ...prev, [key]: nextItems };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/lifestyle-assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();

      if (data?.session_id) {
        router.push(`/lifestyle-assessment/results?id=${data.session_id}`);
      } else if (data?.fallback_payload) {
        router.push(`/lifestyle-assessment/results?data=${encodeURIComponent(data.fallback_payload)}`);
      } else {
        throw new Error(data.error || 'No session created');
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      alert(error instanceof Error ? `Submission Error: ${error.message}` : 'Failed to generate dashboard. Please try again.');
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 0:
        return Boolean(answers.ageRange && answers.sex && answers.heightMetric && answers.weightMetric);
      case 1:
        return Boolean(answers.smoking && answers.activityLevel && answers.sleepDuration && answers.dietPattern);
      case 2:
        return answers.personalHistory.length > 0 && answers.familyHistory.length > 0;
      case 3:
        return answers.recentSymptoms.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="surface-card p-6 md:p-10 w-full relative group transition-all glow-blue">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--bg-card-hover)] rounded-t-2xl overflow-hidden">
        <div
          className="h-full bg-[var(--accent-purple)] transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--accent-purple)] uppercase tracking-wider">
          Step {step + 1} of {STEPS.length}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{STEPS[step].title}</span>
      </div>

      {step === 0 && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-6">Let&apos;s start with the basics</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Age Range</label>
              <div className="flex flex-wrap gap-2">
                {['18-30', '31-45', '46-60', '60+'].map((age) => (
                  <Chip key={age} selected={answers.ageRange === age} onClick={() => setAnswers({ ...answers, ageRange: age })}>
                    {age}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Biological Sex</label>
              <div className="flex flex-wrap gap-2">
                {['Male', 'Female'].map((sex) => (
                  <Chip key={sex} selected={answers.sex === sex} onClick={() => setAnswers({ ...answers, sex })}>
                    {sex}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Height (cm)"
                placeholder="e.g. 175"
                value={answers.heightMetric}
                onChange={(value) => setAnswers({ ...answers, heightMetric: value })}
              />
              <TextField
                label="Weight (kg)"
                placeholder="e.g. 70"
                value={answers.weightMetric}
                onChange={(value) => setAnswers({ ...answers, weightMetric: value })}
              />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-6">Your Lifestyle & Habits</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Physical Activity</label>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {['Sedentary (mostly sitting)', 'Light (1-2 days/wk)', 'Moderate (3-4 days/wk)', 'Active (5+ days/wk)'].map((option) => (
                  <Chip key={option} selected={answers.activityLevel === option} onClick={() => setAnswers({ ...answers, activityLevel: option })}>
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Sleep Duration (Average per night)</label>
              <div className="flex flex-wrap gap-2">
                {['< 5 hours', '5-6 hours', '7-8 hours', '> 8 hours'].map((option) => (
                  <Chip key={option} selected={answers.sleepDuration === option} onClick={() => setAnswers({ ...answers, sleepDuration: option })}>
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Diet Pattern</label>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {['Balanced (Omnivore)', 'Vegetarian/Vegan', 'High Carb/Sugar', 'Keto / Low Carb', 'Intermittent Fasting'].map((option) => (
                  <Chip key={option} selected={answers.dietPattern === option} onClick={() => setAnswers({ ...answers, dietPattern: option })}>
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Smoking Status</label>
              <div className="flex flex-wrap gap-2">
                {['Non-smoker', 'Ex-smoker', 'Current smoker'].map((option) => (
                  <Chip key={option} selected={answers.smoking === option} onClick={() => setAnswers({ ...answers, smoking: option })}>
                    {option}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-6">Health History</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">Select all that apply to you or your immediate family (parents, siblings).</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Personal History (You)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Diabetes / Prediabetes', 'Hypertension', 'High Cholesterol', 'Thyroid Disorder', 'Fatty Liver', 'Heart Disease', 'None'].map((option) => (
                  <MultiChip
                    key={option}
                    selected={answers.personalHistory.includes(option)}
                    onClick={() => updateArray('personalHistory', option, !answers.personalHistory.includes(option))}
                  >
                    {option}
                  </MultiChip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Family History (Immediate)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Diabetes', 'Hypertension', 'High Cholesterol', 'Heart Disease', 'None'].map((option) => (
                  <MultiChip
                    key={option}
                    selected={answers.familyHistory.includes(option)}
                    onClick={() => updateArray('familyHistory', option, !answers.familyHistory.includes(option))}
                  >
                    {option}
                  </MultiChip>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-6">Current Wellness & Symptoms</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">Are you experiencing any of these regularly over the past month?</p>

          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Fatigue / Low Energy',
                'Brain Fog',
                'Poor Sleep / Insomnia',
                'Frequent Thirst / Urination',
                'Unexplained Weight Gain',
                'Unexplained Weight Loss',
                'Digestive Issues',
                'Frequent Craving',
                'None',
              ].map((option) => (
                <MultiChip
                  key={option}
                  selected={answers.recentSymptoms.includes(option)}
                  onClick={() => updateArray('recentSymptoms', option, !answers.recentSymptoms.includes(option))}
                >
                  {option}
                </MultiChip>
              ))}
            </div>
          </div>

          <div className="mt-8 p-4 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 rounded-xl flex gap-3 items-start">
            <HeartPulse className="w-5 h-5 text-[var(--accent-purple)] mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              This is a preliminary lifestyle screening, not a medical diagnosis. Click below to generate your personalized health insight dashboard securely.
            </p>
          </div>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
        {step > 0 ? (
          <button onClick={handlePrev} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
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
            Generate Dashboard
          </button>
        )}
      </div>
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

function Chip({ children, selected, onClick }: { children: ReactNode; selected: boolean; onClick: () => void }) {
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

function MultiChip({ children, selected, onClick }: { children: ReactNode; selected: boolean; onClick: () => void }) {
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className="leading-tight">{children}</span>
      </div>
    </button>
  );
}
