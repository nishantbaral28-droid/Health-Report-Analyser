import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Droplets,
  MoonStar,
  ShieldAlert,
  Target,
  UploadCloud,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AssessmentMetric, AssessmentScores, AssessmentInsight } from '@/lib/assessment-scoring';

export const metadata = {
  title: 'Your Score Results | MetaHealth',
};

type LegacyAssessmentScores = {
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

type NormalizedAssessment = {
  badgeLabel: string;
  headline: string;
  subheadline: string;
  methodNote: string;
  primaryMetric: AssessmentMetric;
  supportMetrics: [AssessmentMetric, AssessmentMetric];
  bmi: number;
  bmiCategory: string;
  insights: AssessmentInsight[];
  icon: ReactNode;
};

function splitHeadline(text: string) {
  const parts = text.trim().split(' ');
  return {
    lead: parts.slice(0, -1).join(' '),
    accent: parts.slice(-1)[0] ?? text,
  };
}

async function getSession(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

function decodeFallbackPayload(payload: string): { computed_scores: AssessmentScores | LegacyAssessmentScores } | null {
  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isModernAssessment(
  scores: AssessmentScores | LegacyAssessmentScores
): scores is AssessmentScores {
  return 'primaryMetric' in scores && 'supportMetrics' in scores;
}

function normalizeAssessment(scores: AssessmentScores | LegacyAssessmentScores): NormalizedAssessment {
  if (isModernAssessment(scores)) {
    const isCortisol = scores.scoreType === 'cortisol';

    return {
      badgeLabel: isCortisol ? 'Cortisol Questionnaire' : 'Diabetes Questionnaire',
      headline: scores.headline,
      subheadline: scores.subheadline,
      methodNote: scores.methodNote,
      primaryMetric: scores.primaryMetric,
      supportMetrics: scores.supportMetrics,
      bmi: scores.bmi,
      bmiCategory: scores.bmiCategory,
      insights: scores.insights,
      icon: isCortisol ? <MoonStar className="w-3.5 h-3.5" /> : <Droplets className="w-3.5 h-3.5" />,
    };
  }

  return {
    badgeLabel: 'Lifestyle Questionnaire',
    headline: 'Lifestyle Health Snapshot',
    subheadline: 'A questionnaire-based look at general metabolic, recovery, and lifestyle patterns.',
    methodNote:
      'This is a preliminary habits heuristic based on self-reported responses. It is not a diagnostic result and should not replace clinical testing.',
    primaryMetric: {
      title: 'Metabolic Wellness',
      score: scores.metabolicWellnessScore,
      label: scores.metabolicWellnessScore >= 75 ? 'Strong' : scores.metabolicWellnessScore >= 55 ? 'Watch Closely' : 'Needs Attention',
      description: 'A higher score suggests your reported habits look more supportive for metabolic health.',
      direction: 'higher_better',
    },
    supportMetrics: [
      {
        title: 'Recovery & Activity',
        score: scores.activityRecoveryScore,
        label: scores.activityRecoveryScore >= 75 ? 'Strong' : scores.activityRecoveryScore >= 55 ? 'Watch Closely' : 'Needs Attention',
        description: 'A higher score reflects a stronger recovery and activity pattern.',
        direction: 'higher_better',
      },
      {
        title: 'Lifestyle Habits Score',
        score: scores.lifestyleRiskScore,
        label: scores.lifestyleRiskScore >= 75 ? 'Strong' : scores.lifestyleRiskScore >= 55 ? 'Watch Closely' : 'Needs Attention',
        description: 'A higher score suggests your current habits look more supportive overall.',
        direction: 'higher_better',
      },
    ],
    bmi: scores.bmi,
    bmiCategory: scores.bmiCategory,
    insights: scores.insights,
    icon: <Activity className="w-3.5 h-3.5" />,
  };
}

export default async function AssessmentResultsPage(props: { searchParams: Promise<{ id?: string; data?: string }> }) {
  const searchParams = await props.searchParams;
  const id = searchParams.id;
  const fallbackData = searchParams.data;

  if (!id && !fallbackData) return notFound();

  let scores: AssessmentScores | LegacyAssessmentScores | null = null;

  if (id) {
    const session = await getSession(id);
    if (session) {
      scores = session.computed_scores as AssessmentScores | LegacyAssessmentScores;
    }
  }

  if (!scores && fallbackData) {
    const decoded = decodeFallbackPayload(fallbackData);
    if (decoded?.computed_scores) {
      scores = decoded.computed_scores;
    }
  }

  if (!scores) return notFound();

  const normalized = normalizeAssessment(scores);
  const headline = splitHeadline(normalized.headline);

  return (
    <main className="min-h-screen bg-[var(--bg-base)] pb-20 pt-10 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--accent-purple)] rounded-full opacity-[0.03] blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
            {normalized.icon}
            {normalized.badgeLabel}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
            {headline.lead}{' '}
            <span className="gradient-text">{headline.accent}</span>
          </h1>

          <p className="text-base text-[var(--text-secondary)] max-w-2xl">{normalized.subheadline}</p>

          <p className="text-sm text-[var(--text-secondary)] max-w-2xl bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)]">
            <strong className="text-white">Note:</strong> {normalized.methodNote}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <MetricCard metric={normalized.primaryMetric} featured />
          {normalized.supportMetrics.map((metric) => (
            <MetricCard key={metric.title} metric={metric} />
          ))}
        </div>

        <div className="surface-card p-6 flex flex-wrap gap-6 items-center justify-around text-center">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Calculated BMI</p>
            <p className="text-3xl font-black text-white">{normalized.bmi}</p>
            <p className="text-sm font-medium text-[var(--accent-cyan)]">{normalized.bmiCategory}</p>
          </div>
          <div className="w-px h-12 bg-[var(--border-color)] hidden sm:block" />
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">
              Main Score Interpretation
            </p>
            <p className="text-2xl font-black text-white">{normalized.primaryMetric.label}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">{normalized.primaryMetric.description}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Target className="w-5 h-5 text-[var(--accent-purple)]" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Score Insights</h2>
          </div>

          <div className="grid gap-4">
            {normalized.insights.map((insight, index) => (
              <InsightCard key={`${insight.title}-${index}`} insight={insight} />
            ))}
          </div>
        </div>

        <div className="mt-12 surface-card p-1 glow-purple">
          <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
            <Activity className="w-10 h-10 text-[var(--accent-purple)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Verified Insights</h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto mb-8">
              Questionnaire scores are helpful for early screening, but a lab report gives you verified biomarkers and a more complete clinical dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/#upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-sm hover:scale-105 transition-transform"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <UploadCloud className="w-4 h-4" />
                Upload Lab Report
              </Link>
              <Link
                href="/assessment"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] text-white font-bold text-sm hover:border-[var(--border-light)] transition-colors"
              >
                Run Another Score <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ metric, featured = false }: { metric: AssessmentMetric; featured?: boolean }) {
  const { stroke, text } = getMetricTone(metric);
  const radius = featured ? 52 : 46;
  const circumference = 2 * Math.PI * radius;
  const filled = (metric.score / 100) * circumference;

  return (
    <div className="surface-card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">{metric.title}</p>
          <p className="mt-2 text-lg font-black text-white">{metric.label}</p>
        </div>
        <div className={clsxMetricBadge(metric)} style={{ color: stroke, borderColor: `${stroke}44`, backgroundColor: `${stroke}14` }}>
          {metric.direction === 'higher_better' ? 'Higher is better' : 'Higher means more concern'}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className={featured ? 'relative h-36 w-36' : 'relative h-28 w-28'}>
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-base)" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={featured ? 'text-4xl font-black text-white' : 'text-3xl font-black text-white'}>{metric.score}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Score</span>
          </div>
        </div>

        <p className={`leading-relaxed text-[var(--text-secondary)] ${featured ? 'text-sm max-w-sm' : 'text-xs max-w-xs'}`}>
          <span className="font-semibold" style={{ color: text }}>
            {metric.label}.
          </span>{' '}
          {metric.description}
        </p>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: AssessmentInsight }) {
  const isFavorable = insight.flag === 'FAVORABLE';
  const isWarning = insight.flag === 'WARNING';
  const isNotable = insight.flag === 'CLINICALLY_NOTABLE';

  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  let containerClass = 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30';
  let badgeClass = 'bg-emerald-500/20 text-emerald-400';

  if (isWarning) {
    icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
    containerClass = 'bg-amber-500/10 border-amber-500/30';
    badgeClass = 'bg-amber-500/20 text-amber-500';
  } else if (isNotable) {
    icon = <ShieldAlert className="w-5 h-5 text-orange-400" />;
    containerClass = 'bg-orange-500/10 border-orange-500/30';
    badgeClass = 'bg-orange-500/20 text-orange-400';
  }

  return (
    <div className={`p-5 rounded-2xl border ${containerClass} flex gap-4 items-start`}>
      <div className="mt-1">{icon}</div>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
          <h3 className="text-base font-bold text-white">{insight.title}</h3>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeClass}`}>
            {insight.category}
          </span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}

function getMetricTone(metric: AssessmentMetric) {
  if (metric.direction === 'higher_better') {
    if (metric.score >= 80) {
      return { stroke: 'var(--accent-green)', text: 'var(--accent-green)' };
    }
    if (metric.score >= 60) {
      return { stroke: 'var(--accent-blue)', text: 'var(--accent-blue)' };
    }
    return { stroke: 'var(--accent-red)', text: 'var(--accent-red)' };
  }

  if (metric.score >= 70) {
    return { stroke: 'var(--accent-red)', text: 'var(--accent-red)' };
  }
  if (metric.score >= 45) {
    return { stroke: '#f59e0b', text: '#f59e0b' };
  }
  return { stroke: 'var(--accent-green)', text: 'var(--accent-green)' };
}

function clsxMetricBadge(metric: AssessmentMetric) {
  return `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
    metric.direction === 'higher_better' ? '' : ''
  }`;
}
