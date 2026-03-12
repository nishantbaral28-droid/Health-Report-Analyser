import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { Activity, Target, ShieldAlert, CheckCircle2, AlertTriangle, UploadCloud, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { LifestyleAssessmentScores } from '@/lib/lifestyle-assessment-scoring';

export const metadata = {
  title: 'Your Health Snapshot | MetaHealth',
};

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

function decodeFallbackPayload(payload: string): { computed_scores: LifestyleAssessmentScores } | null {
  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default async function LifestyleAssessmentResultsPage(props: { searchParams: Promise<{ id?: string; data?: string }> }) {
  const searchParams = await props.searchParams;
  const id = searchParams.id;
  const fallbackData = searchParams.data;

  if (!id && !fallbackData) return notFound();

  let scores: LifestyleAssessmentScores | null = null;

  if (id) {
    const session = await getSession(id);
    if (session) {
      scores = session.computed_scores as LifestyleAssessmentScores;
    }
  }

  if (!scores && fallbackData) {
    const decoded = decodeFallbackPayload(fallbackData);
    if (decoded?.computed_scores) {
      scores = decoded.computed_scores;
    }
  }

  if (!scores) return notFound();

  return (
    <main className="min-h-screen bg-[var(--bg-base)] pb-20 pt-10 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--accent-purple)] rounded-full opacity-[0.03] blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
            <ShieldAlert className="w-3.5 h-3.5" />
            Questionnaire-Based Insight
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
            Lifestyle Health <span className="gradient-text">Snapshot</span>
          </h1>

          <p className="text-sm text-[var(--text-secondary)] max-w-2xl bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)]">
            <strong className="text-white">Note:</strong> This is a preliminary habits heuristic based on your self-reported age, sex, habits, history, and symptoms. Age and sex are used only as light context modifiers, while your daily habits remain the main score driver. It is <strong className="text-orange-400">NOT</strong> a diagnostic medical report. Upload a clinical lab report for verified bio-marker analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ScoreGauge title="Metabolic Wellness" score={scores.metabolicWellnessScore} color="var(--accent-green)" />
          <ScoreGauge title="Recovery & Activity" score={scores.activityRecoveryScore} color="var(--accent-blue)" />
        </div>

        <div className="surface-card p-6 flex flex-wrap gap-6 items-center justify-around text-center">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Calculated BMI</p>
            <p className="text-3xl font-black text-white">{scores.bmi}</p>
            <p className="text-sm font-medium text-[var(--accent-cyan)]">{scores.bmiCategory}</p>
          </div>
          <div className="w-px h-12 bg-[var(--border-color)] hidden sm:block" />
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Lifestyle Habits Score</p>
            <p
              className="text-3xl font-black"
              style={{
                color:
                  scores.lifestyleRiskScore > 75
                    ? 'var(--accent-green)'
                    : scores.lifestyleRiskScore > 50
                      ? 'var(--accent-blue)'
                      : 'var(--accent-red)',
              }}
            >
              {scores.lifestyleRiskScore}/100
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Target className="w-5 h-5 text-[var(--accent-purple)]" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Identified Lifestyle Vectors</h2>
          </div>

          <div className="grid gap-4">
            {scores.insights.map((insight, index) => (
              <LifestyleInsightCard key={`${insight.title}-${index}`} insight={insight} />
            ))}
          </div>
        </div>

        <div className="mt-12 surface-card p-1 glow-purple">
          <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]">
            <Activity className="w-10 h-10 text-[var(--accent-purple)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Verified Insights</h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto mb-8">
              Your lifestyle screening indicates areas for optimization. Upload a recent blood test or lab report to unlock your clinical dashboard and track your real metabolic markers.
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
                href="https://metabolic-health-dashboard.vercel.app"
                target="_blank"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-base)] text-white font-bold text-sm hover:border-[var(--border-light)] transition-colors"
              >
                Get Premium Tracker <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ScoreGauge({ title, score, color }: { title: string; score: number; color: string }) {
  const displayColor = score > 75 ? color : score >= 50 ? '#f59e0b' : 'var(--accent-red)';

  return (
    <div className="surface-card p-6 flex items-center gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-base)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={displayColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${score * 3.14} 314`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{score}</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {score > 75 ? 'Optimal range based on reported habits.' : 'Room for improvement identified.'}
        </p>
      </div>
    </div>
  );
}

function LifestyleInsightCard({
  insight,
}: {
  insight: LifestyleAssessmentScores['insights'][number];
}) {
  const isWarning = insight.flag === 'WARNING';
  const isNotable = insight.flag === 'CLINICALLY_NOTABLE';

  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  let bgClass = 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30';
  let badgeClass = 'bg-emerald-500/20 text-emerald-400';

  if (isWarning) {
    icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
    bgClass = 'bg-amber-500/10 border-amber-500/30';
    badgeClass = 'bg-amber-500/20 text-amber-500';
  } else if (isNotable) {
    icon = <AlertTriangle className="w-5 h-5 text-orange-400" />;
    bgClass = 'bg-orange-500/10 border-orange-500/30';
    badgeClass = 'bg-orange-500/20 text-orange-500';
  }

  return (
    <div className={`p-5 rounded-2xl border ${bgClass} flex gap-4 items-start`}>
      <div className="mt-1">{icon}</div>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
          <h3 className="text-base font-bold text-white">{insight.title}</h3>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeClass}`}>
            {insight.category} Marker
          </span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}
