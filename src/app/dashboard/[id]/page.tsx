// health-report-analyzer/src/app/dashboard/[id]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowLeft, FileText, TrendingUp, AlertTriangle, CheckCircle2,
  AlertCircle, Heart, Droplets, Stethoscope, Pill, TestTubes, Info,
  Target, Sparkles, ChevronDown, ChevronUp, Clock, Zap
} from 'lucide-react';
import BiomarkerCard from '@/components/dashboard/BiomarkerCard';
import LipidChart from '@/components/dashboard/LipidChart';
import BloodSugarChart from '@/components/dashboard/BloodSugarChart';
import DashboardScoreCard from '@/components/dashboard/DashboardScoreCard';
import MetaHealthCTA from '@/components/dashboard/MetaHealthCTA';
import { calculateReportScores, type ReportScores } from '@/lib/report-scoring';
import { type NumericStatus, type ClinicalStatus } from '@/lib/biomarkers';

interface Biomarker {
  name: string;
  value: string;
  unit: string;
  flagged?: boolean;
  numericValue: number | null;
  riskLevel: 'normal' | 'borderline' | 'high_risk' | 'low' | 'unverified';
  category: string;
  description: string;
  note: string;
  normalRange: { min: number; max: number } | null;
  confidence: number;
  source?: string;
  source_anchor?: string;
  evidence_snippet?: string;
  needs_verification?: boolean;
  conflict_group_id?: string | null;
  blocked_reason?: string;
  numericStatus?: NumericStatus;
  clinicalStatus?: ClinicalStatus;
  confidence_score?: number;
}

interface Insights {
  summary: string;
  biomarkers: Biomarker[];
  blocked: Biomarker[];
  recommendations: string[];
  stats: { totalParsed: number; totalVerified: number; totalBlocked: number; normal: number; borderline: number; highRisk: number };
  isDemo?: boolean;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  lipid: { label: 'Lipid Profile', icon: <Heart className="w-4 h-4" />, color: 'var(--accent-purple)' },
  blood_sugar: { label: 'Blood Sugar', icon: <Droplets className="w-4 h-4" />, color: 'var(--accent-blue)' },
  blood_count: { label: 'Complete Blood Count', icon: <TestTubes className="w-4 h-4" />, color: 'var(--accent-red)' },
  thyroid: { label: 'Thyroid Panel', icon: <Stethoscope className="w-4 h-4" />, color: 'var(--accent-cyan)' },
  vitamin: { label: 'Vitamins & Minerals', icon: <Pill className="w-4 h-4" />, color: 'var(--accent-green)' },
  infectious_disease: { label: 'Infectious Diseases', icon: <AlertTriangle className="w-4 h-4" />, color: '#f59e0b' },
  other: { label: 'Other Biomarkers', icon: <Activity className="w-4 h-4" />, color: 'var(--text-muted)' },
};

export default function DashboardPage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [showNormal, setShowNormal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('current_insights');
    const storedUrl = sessionStorage.getItem('current_fileUrl');
    if (stored) setInsights(JSON.parse(stored));
    if (storedUrl) setFileUrl(storedUrl);
  }, []);

  const scores: ReportScores | null = useMemo(() => {
    if (!insights) return null;
    return calculateReportScores(insights.biomarkers as any);
  }, [insights]);

  if (!insights || !scores) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md">
          <Activity className="w-14 h-14 text-[var(--accent-purple)] animate-pulse mx-auto" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Report Data Found</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">Upload a medical report from the home page to generate your personalized health insights dashboard.</p>
          <button onClick={() => router.push('/')} className="mt-4 px-6 py-3 rounded-lg text-sm font-semibold text-white hover:scale-105 transition-transform" style={{ background: 'var(--gradient-primary)' }}>
            ← Upload a Report
          </button>
        </div>
      </div>
    );
  }

  const notableBiomarkers = insights.biomarkers.filter(b => b.riskLevel !== 'normal');
  const normalBiomarkers = insights.biomarkers.filter(b => b.riskLevel === 'normal');

  const groupPriority: Record<string, Biomarker[]> = {};
  notableBiomarkers.forEach(b => {
    const cat = b.category || 'other';
    if (!groupPriority[cat]) groupPriority[cat] = [];
    groupPriority[cat].push(b);
  });

  const groupNormal: Record<string, Biomarker[]> = {};
  normalBiomarkers.forEach(b => {
    const cat = b.category || 'other';
    if (!groupNormal[cat]) groupNormal[cat] = [];
    groupNormal[cat].push(b);
  });

  const findVal = (key: string) => insights.biomarkers.find(b => b.name.toLowerCase().includes(key.toLowerCase()))?.numericValue;
  const cholesterol = findVal('cholesterol');
  const hdl = findVal('hdl');
  const ldl = findVal('ldl');
  const triglycerides = findVal('triglyceride');
  const glucose = findVal('glucose');
  const hba1cValue = insights.biomarkers.find(b => b.name.toLowerCase().includes('hba1c') || b.name.toLowerCase().includes('a1c'))?.numericValue;

  const hasLipid = cholesterol || hdl || ldl || triglycerides;
  const hasSugar = glucose || hba1cValue;
  const totalMarkers = insights.stats.normal + insights.stats.highRisk + insights.stats.borderline;
  const attentionPercent = totalMarkers > 0 ? Math.round(((insights.stats.highRisk + insights.stats.borderline) / totalMarkers) * 100) : 0;
  const focusDrivers = Object.entries(groupPriority)
    .map(([category, biomarkers]) => ({
      label: (CATEGORY_META[category] || CATEGORY_META.other).label,
      color: (CATEGORY_META[category] || CATEGORY_META.other).color,
      count: biomarkers.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {insights.isDemo && (
        <div className="bg-[var(--accent-purple)]/10 border-b border-[var(--accent-purple)]/20 px-4 py-2 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 text-[var(--accent-purple)]" />
          <p className="text-[10px] text-[var(--accent-purple)] font-bold uppercase tracking-wider">
            Demo Mode — Using Sample Report
          </p>
        </div>
      )}

      <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="w-10 h-10 rounded-xl border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-card)] transition-colors">
              <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Your Health <span className="gradient-text">Snapshot</span></h1>
              <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-widest mt-0.5">Report analyzed via MetaHealth AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--border-light)] transition-colors uppercase tracking-wider">
                <FileText className="w-4 h-4" /> View PDF
              </a>
            )}
            <button onClick={() => setDevMode(!devMode)} className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors">
              <Activity className={`w-4 h-4 ${devMode ? 'text-[var(--accent-purple)]' : 'text-[var(--text-muted)]'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <DashboardScoreCard
            title="Vitality Score"
            score={scores.vitality.score}
            label={scores.vitality.label}
            description={scores.vitality.description}
            icon={Zap}
            color="var(--accent-purple)"
          />
          <DashboardScoreCard
            title="Longevity Signal"
            score={scores.longevity.score}
            label={scores.longevity.label}
            description={scores.longevity.description}
            icon={Sparkles}
            color="var(--accent-cyan)"
          />
          <DashboardScoreCard
            title="Health Age"
            type="age"
            score={scores.healthAge.bioAge}
            label={scores.healthAge.label}
            description={scores.healthAge.description}
            comparisonText={scores.healthAge.comparisonText}
            icon={Clock}
            color="var(--accent-green)"
            scoreColorOverride={
              !scores.healthAge.hasSufficientData
                ? 'var(--text-muted)'
                : scores.healthAge.tendency && scores.healthAge.tendency > 1
                  ? 'var(--accent-red)'
                  : scores.healthAge.tendency && scores.healthAge.tendency < -1
                    ? 'var(--accent-green)'
                    : 'var(--accent-blue)'
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="surface-card border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan)]/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--accent-cyan)]" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Focus Vector</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Focus Area</p>
                <p className="text-sm font-bold text-white">{scores.lifestyleVector.focusArea}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Biggest Opportunity</p>
                <p className="text-sm font-bold text-[var(--accent-cyan)]">{scores.lifestyleVector.biggestWin}</p>
              </div>
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Marker Balance</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">How much of your report looks stable vs needs attention.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {totalMarkers} markers
              </div>
            </div>
            <MarkerBalanceRing
              normal={insights.stats.normal}
              attention={insights.stats.highRisk + insights.stats.borderline}
              attentionPercent={attentionPercent}
            />
          </div>

          <div className="surface-card p-6">
            <div className="mb-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-white">What&apos;s Driving Focus</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">The areas contributing most to your current focus vector.</p>
            </div>
            <FocusDriversChart drivers={focusDrivers} />
          </div>
        </div>

        {devMode && (
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
            <h3 className="text-amber-500 font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
              <AlertTriangle className="w-4 h-4" /> Traceability Data
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DevStat label="Total Extracted" value={insights.stats.totalParsed} />
              <DevStat label="Confident" value={insights.stats.totalVerified} />
              <DevStat label="Blocked" value={insights.stats.totalBlocked} />
              <DevStat label="Normal" value={insights.stats.normal} />
            </div>
            <pre className="text-[10px] text-amber-200/50 p-4 rounded-xl bg-black/40 max-h-40 overflow-auto border border-white/5">
              {JSON.stringify(insights.biomarkers, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-12">
          {notableBiomarkers.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <AlertCircle className="w-5 h-5 text-[var(--accent-red)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">Markers Needing Attention</h2>
                <span className="text-xs font-medium text-[var(--text-muted)] ml-2 bg-white/5 px-2 py-0.5 rounded-full">{notableBiomarkers.length} indicators</span>
              </div>

              {Object.entries(groupPriority).map(([category, biomarkers]) => {
                const meta = CATEGORY_META[category] || CATEGORY_META.other;
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]" style={{ color: meta.color }}>{meta.label}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {biomarkers.map((b, i) => (
                        <BiomarkerCard
                          key={i}
                          name={b.name}
                          value={b.numericValue ?? b.value}
                          unit={b.unit}
                          numericStatus={b.numericStatus}
                          clinicalStatus={b.clinicalStatus}
                          description={b.description}
                          note={b.note}
                          normalRange={b.normalRange}
                          confidence={b.confidence_score}
                          source={b.source_anchor}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasLipid && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp className="w-5 h-5 text-[var(--accent-purple)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">Cardiovascular Snapshot</h2>
              </div>
              <LipidChart cholesterol={cholesterol} hdl={hdl} ldl={ldl} triglycerides={triglycerides} />
            </div>
          )}

          {hasSugar && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-2">
                <Droplets className="w-5 h-5 text-[var(--accent-blue)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">Glucose Regulation</h2>
              </div>
              <BloodSugarChart glucose={glucose} hba1c={hba1cValue} />
            </div>
          )}

          {normalBiomarkers.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowNormal(!showNormal)}
                className="w-full flex items-center justify-between px-4 py-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)]" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Healthy Markers</p>
                    <p className="text-xs text-[var(--text-muted)]">{normalBiomarkers.length} biomarkers within expected range</p>
                  </div>
                </div>
                {showNormal ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </button>

              {showNormal && (
                <div className="space-y-8 pt-2">
                  {Object.entries(groupNormal).map(([category, biomarkers]) => {
                    const meta = CATEGORY_META[category] || CATEGORY_META.other;
                    return (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center gap-2 px-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]" style={{ color: meta.color }}>{meta.label}</span>
                          <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
                          {biomarkers.map((b, i) => (
                            <BiomarkerCard
                              key={i}
                              name={b.name}
                              value={b.numericValue ?? b.value}
                              unit={b.unit}
                              numericStatus={b.numericStatus}
                              clinicalStatus={b.clinicalStatus}
                              description={b.description}
                              note={b.note}
                              normalRange={b.normalRange}
                              confidence={b.confidence_score}
                              source={b.source_anchor}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <MetaHealthCTA />
      </div>
    </div>
  );
}

function DevStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/60">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MarkerBalanceRing({
  normal,
  attention,
  attentionPercent,
}: {
  normal: number;
  attention: number;
  attentionPercent: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (attentionPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--bg-card-hover)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--accent-red)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-white">{attentionPercent}%</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Need Attention
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-[12rem] flex-col gap-3">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Stable Markers</span>
            <span className="text-sm font-black text-[var(--accent-green)]">{normal}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-card-hover)]">
            <div
              className="h-2 rounded-full bg-[var(--accent-green)]"
              style={{ width: `${100 - attentionPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Priority Markers</span>
            <span className="text-sm font-black text-[var(--accent-red)]">{attention}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-card-hover)]">
            <div
              className="h-2 rounded-full bg-[var(--accent-red)]"
              style={{ width: `${attentionPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusDriversChart({
  drivers,
}: {
  drivers: Array<{ label: string; color: string; count: number }>;
}) {
  if (drivers.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-[var(--text-muted)]">
        No standout driver yet. Your report looks broadly stable.
      </div>
    );
  }

  const maxCount = Math.max(...drivers.map((driver) => driver.count));

  return (
    <div className="space-y-4">
      {drivers.map((driver) => (
        <div key={driver.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">{driver.label}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {driver.count} marker{driver.count > 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-card-hover)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.max((driver.count / maxCount) * 100, 16)}%`,
                background: `linear-gradient(90deg, ${driver.color}, rgba(255,255,255,0.16))`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
