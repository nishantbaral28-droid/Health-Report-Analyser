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

const CLINICAL_PRIORITY: Record<ClinicalStatus, number> = {
  HIGH_PRIORITY: 4.8,
  CLINICALLY_NOTABLE: 3.8,
  BORDERLINE: 2.6,
  FAVORABLE: 1.7,
  NORMAL: 1.2,
  UNVERIFIED: 1.4,
};

const RISK_PRIORITY: Record<Biomarker['riskLevel'], number> = {
  high_risk: 1.2,
  borderline: 0.9,
  low: 0.75,
  unverified: 0.4,
  normal: 0.2,
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

  const groupNormal: Record<string, Biomarker[]> = {};
  normalBiomarkers.forEach(b => {
    const cat = b.category || 'other';
    if (!groupNormal[cat]) groupNormal[cat] = [];
    groupNormal[cat].push(b);
  });

  const findMarkerValue = (name: string) =>
    insights.biomarkers.find((biomarker) => biomarker.name.toLowerCase() === name.toLowerCase())?.numericValue;

  const cholesterol = findMarkerValue('Total Cholesterol');
  const hdl = findMarkerValue('HDL Cholesterol');
  const ldl = findMarkerValue('LDL Cholesterol');
  const triglycerides = findMarkerValue('Triglycerides');
  const glucose = findMarkerValue('Fasting Glucose');
  const hba1cValue = findMarkerValue('HbA1c');

  const hasLipid = [cholesterol, hdl, ldl, triglycerides].some((value) => value !== null && value !== undefined);
  const hasSugar = [glucose, hba1cValue].some((value) => value !== null && value !== undefined);
  const rankedMarkerPool = [...(notableBiomarkers.length > 0 ? notableBiomarkers : insights.biomarkers)].sort(sortBiomarkersByPriority);
  const attentionMarkers = [...notableBiomarkers].sort(sortBiomarkersByPriority);
  const featuredMarker = rankedMarkerPool[0] ?? null;
  const rangeChartCandidates = [...rankedMarkerPool, ...insights.biomarkers]
    .filter(hasNumericRange)
    .sort(sortBiomarkersByPriority);
  const featuredRangeMarker = rangeChartCandidates[0] ?? null;

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
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--accent-red)]" />
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Featured Marker Pulse</h2>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                A compact view of the single marker that stands out the most in this report.
              </p>
            </div>
            <FeaturedMarkerPulse marker={featuredMarker} />
          </div>

          <div className="surface-card p-6">
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--accent-purple)]" />
                <h2 className="text-xs font-black uppercase tracking-widest text-white">Featured Marker Range</h2>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                See where the strongest numeric marker sits relative to its expected range.
              </p>
            </div>
            <FeaturedMarkerRange marker={featuredRangeMarker} />
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {attentionMarkers.map((marker, index) => {
                  const meta = CATEGORY_META[marker.category] || CATEGORY_META.other;

                  return (
                    <div key={`${marker.name}-${index}`} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span
                          className="rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                          style={{
                            color: meta.color,
                            borderColor: `${meta.color}33`,
                            backgroundColor: `${meta.color}12`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <BiomarkerCard
                        name={marker.name}
                        value={marker.numericValue ?? marker.value}
                        unit={marker.unit}
                        numericStatus={marker.numericStatus}
                        clinicalStatus={marker.clinicalStatus}
                        description={marker.description}
                        note={marker.note}
                        normalRange={marker.normalRange}
                        confidence={marker.confidence_score}
                        source={marker.source_anchor}
                      />
                    </div>
                  );
                })}
              </div>
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

function FeaturedMarkerPulse({ marker }: { marker: Biomarker | null }) {
  if (!marker) {
    return (
      <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-[var(--text-muted)]">
        No standout marker signal yet. This report looks broadly stable.
      </div>
    );
  }

  const tone = getMarkerTone(marker);
  const meta = CATEGORY_META[marker.category] || CATEGORY_META.other;
  const signalScore = Math.min(Math.max(Math.round((getMarkerPriorityScore(marker) / 190) * 100), 14), 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (signalScore / 100) * circumference;

  return (
    <div className="grid gap-5 lg:grid-cols-[132px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-32 w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-card-hover)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={tone.accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black leading-none text-white">{signalScore}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Signal
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              color: tone.accent,
              backgroundColor: tone.tint,
              borderColor: tone.border,
            }}
          >
            {tone.label}
          </span>
          <span
            className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              color: meta.color,
              borderColor: `${meta.color}33`,
              backgroundColor: `${meta.color}12`,
            }}
          >
            {meta.label}
          </span>
        </div>

        <div>
          <p className="text-lg font-bold leading-tight text-white">{marker.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {getMarkerSignalSummary(marker)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Current Reading
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{formatMarkerReading(marker)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Expected
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{getMarkerReferenceText(marker)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedMarkerRange({
  marker,
}: {
  marker: (Biomarker & { numericValue: number; normalRange: { min: number; max: number } }) | null;
}) {
  if (!marker) {
    return (
      <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-[var(--text-muted)]">
        This report doesn&apos;t include a standout numeric marker with a reference range to chart yet.
      </div>
    );
  }

  const tone = getMarkerTone(marker);
  const rangeWindow = getRangeWindow(marker);

  if (!rangeWindow) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight text-white">{marker.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {getRangeInsight(marker)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-black" style={{ color: tone.accent }}>
              {formatMarkerReading(marker)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Ref {formatMetricNumber(marker.normalRange.min)}-{formatMetricNumber(marker.normalRange.max)} {marker.unit}
            </p>
          </div>
        </div>

        <div className="relative mt-6 h-3 rounded-full bg-[var(--bg-card-hover)]">
          <div
            className="absolute inset-y-0 rounded-full bg-emerald-500/20"
            style={{
              left: `${rangeWindow.normalStart}%`,
              width: `${rangeWindow.normalWidth}%`,
            }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 rounded-full border-2 border-[var(--bg-card)]"
            style={{
              left: `${rangeWindow.markerPosition}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: tone.accent,
              boxShadow: '0 0 0 4px rgba(8, 10, 20, 0.28)',
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>{formatMetricNumber(rangeWindow.displayMin)}</span>
          <span>Expected Band</span>
          <span>{formatMetricNumber(rangeWindow.displayMax)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Low End</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatMetricNumber(marker.normalRange.min)}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Current</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatMetricNumber(marker.numericValue)}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">High End</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatMetricNumber(marker.normalRange.max)}</p>
        </div>
      </div>
    </div>
  );
}

function hasNumericRange(
  marker: Biomarker
): marker is Biomarker & { numericValue: number; normalRange: { min: number; max: number } } {
  return marker.numericValue !== null && marker.normalRange !== null;
}

function getMarkerDeviationRatio(marker: Biomarker): number {
  if (!hasNumericRange(marker)) {
    if (marker.clinicalStatus === 'HIGH_PRIORITY') return 1.15;
    if (marker.clinicalStatus === 'CLINICALLY_NOTABLE') return 0.9;
    if (marker.clinicalStatus === 'BORDERLINE') return 0.55;
    if (marker.clinicalStatus === 'FAVORABLE') return 0.3;
    return 0.2;
  }

  const span = Math.max(marker.normalRange.max - marker.normalRange.min, 1);

  if (marker.numericValue < marker.normalRange.min) {
    return (marker.normalRange.min - marker.numericValue) / span;
  }

  if (marker.numericValue > marker.normalRange.max) {
    return (marker.numericValue - marker.normalRange.max) / span;
  }

  if (marker.clinicalStatus === 'BORDERLINE') return 0.45;
  if (marker.clinicalStatus === 'FAVORABLE') return 0.25;

  return 0.18;
}

function getMarkerPriorityScore(marker: Biomarker): number {
  const clinicalWeight = CLINICAL_PRIORITY[marker.clinicalStatus ?? 'UNVERIFIED'] ?? 1.4;
  const riskWeight = RISK_PRIORITY[marker.riskLevel] ?? 0.4;
  const deviationWeight = getMarkerDeviationRatio(marker);
  const confidenceWeight = marker.confidence_score ?? marker.confidence ?? 0.75;

  return clinicalWeight * 28 + riskWeight * 10 + deviationWeight * 55 + confidenceWeight * 7;
}

function sortBiomarkersByPriority(a: Biomarker, b: Biomarker) {
  return getMarkerPriorityScore(b) - getMarkerPriorityScore(a);
}

function formatMetricNumber(value: number): string {
  const absoluteValue = Math.abs(value);
  const fractionDigits = absoluteValue >= 100 || Number.isInteger(value) ? 0 : absoluteValue >= 10 ? 1 : 2;

  return Number(value.toFixed(fractionDigits)).toString();
}

function formatMarkerReading(marker: Biomarker): string {
  if (marker.numericValue !== null) {
    const formattedValue = formatMetricNumber(marker.numericValue);
    return marker.unit ? `${formattedValue} ${marker.unit}` : formattedValue;
  }

  return marker.value;
}

function getMarkerReferenceText(marker: Biomarker): string {
  if (!hasNumericRange(marker)) {
    return marker.unit || 'Qualitative result';
  }

  const unitSuffix = marker.unit ? ` ${marker.unit}` : '';
  return `Ref ${formatMetricNumber(marker.normalRange.min)}-${formatMetricNumber(marker.normalRange.max)}${unitSuffix}`;
}

function getMarkerSignalSummary(marker: Biomarker): string {
  if (hasNumericRange(marker)) {
    if (marker.clinicalStatus === 'BORDERLINE' && marker.numericStatus === 'WITHIN_RANGE') {
      return `${formatMarkerReading(marker)} · borderline by clinical cutoff`;
    }

    if (marker.clinicalStatus === 'FAVORABLE') {
      return `${formatMarkerReading(marker)} · stronger than the basic target`;
    }

    if (marker.numericStatus === 'ABOVE_RANGE') {
      return `${formatMarkerReading(marker)} · above expected range`;
    }

    if (marker.numericStatus === 'BELOW_RANGE') {
      return `${formatMarkerReading(marker)} · below expected range`;
    }

    return `${formatMarkerReading(marker)} · within expected range`;
  }

  if (marker.clinicalStatus === 'HIGH_PRIORITY') {
    return `${marker.value} result flagged for prompt attention`;
  }

  return `${marker.value} result captured from the report`;
}

function getRangeInsight(marker: Biomarker): string {
  if (marker.clinicalStatus === 'HIGH_PRIORITY') return 'Positive or high-priority finding';
  if (marker.numericStatus === 'ABOVE_RANGE') return 'Above expected range';
  if (marker.numericStatus === 'BELOW_RANGE') return 'Below expected range';
  if (marker.clinicalStatus === 'BORDERLINE') return 'Near a caution zone';
  if (marker.clinicalStatus === 'FAVORABLE') return 'In a stronger protective range';
  return 'Within expected range';
}

function getRangeWindow(marker: Biomarker & { numericValue: number; normalRange: { min: number; max: number } }) {
  const span = Math.max(marker.normalRange.max - marker.normalRange.min, 1);
  const lowerOvershoot = marker.numericValue < marker.normalRange.min ? marker.normalRange.min - marker.numericValue : 0;
  const upperOvershoot = marker.numericValue > marker.normalRange.max ? marker.numericValue - marker.normalRange.max : 0;
  const padding = Math.max(span * 0.45, lowerOvershoot * 1.2, upperOvershoot * 1.2, 1);
  const displayMin = Math.max(0, marker.normalRange.min - padding);
  const displayMax = marker.normalRange.max + padding;
  const displaySpan = Math.max(displayMax - displayMin, 1);
  const markerPosition = ((marker.numericValue - displayMin) / displaySpan) * 100;

  return {
    displayMin,
    displayMax,
    normalStart: ((marker.normalRange.min - displayMin) / displaySpan) * 100,
    normalWidth: (span / displaySpan) * 100,
    markerPosition: Math.min(Math.max(markerPosition, 4), 96),
  };
}

function getMarkerTone(marker: Biomarker) {
  if (marker.clinicalStatus === 'HIGH_PRIORITY') {
    return {
      accent: '#ff5b61',
      tint: 'rgba(255, 91, 97, 0.12)',
      border: 'rgba(255, 91, 97, 0.24)',
      label: 'High Priority',
    };
  }

  if (marker.clinicalStatus === 'CLINICALLY_NOTABLE') {
    return {
      accent: '#f97316',
      tint: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.24)',
      label: 'Notable',
    };
  }

  if (marker.clinicalStatus === 'BORDERLINE') {
    return {
      accent: '#f59e0b',
      tint: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.24)',
      label: 'Borderline',
    };
  }

  if (marker.riskLevel === 'low') {
    return {
      accent: '#38bdf8',
      tint: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.24)',
      label: 'Low',
    };
  }

  return {
    accent: '#10b981',
    tint: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.24)',
    label: marker.clinicalStatus === 'FAVORABLE' ? 'Favorable' : 'Stable',
  };
}
