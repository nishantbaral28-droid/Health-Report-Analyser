'use client';

import { LucideIcon } from 'lucide-react';

interface DashboardScoreCardProps {
  title: string;
  score?: number;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  type?: 'percentage' | 'age';
  comparisonText?: string;
  scoreColorOverride?: string;
}

export default function DashboardScoreCard({
  title,
  score,
  label,
  description,
  icon: Icon,
  color,
  comparisonText,
  scoreColorOverride
}: DashboardScoreCardProps) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const hasScore = typeof score === 'number';
  const progress = hasScore ? (score / 100) * circumference : 0;

  const scoreColor =
    !hasScore
      ? 'var(--text-muted)'
      :
    scoreColorOverride ||
    (score && score > 80
      ? 'var(--accent-green)'
      : score && score > 50
        ? 'var(--accent-blue)'
        : 'var(--accent-red)');

  return (
    <div className="surface-card group relative flex min-h-[320px] flex-col overflow-hidden p-6 text-center transition-all duration-500 hover:glow-purple">
      <div
        className="absolute -top-10 -right-10 h-24 w-24 rounded-full opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
        style={{ background: color }}
      />

      <div className="mb-5 flex min-h-[2.5rem] items-center justify-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-800 bg-gray-900"
          style={{ color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col items-center">
        <div className="relative mb-5 flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--bg-card-hover)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-5">
            <span className="text-3xl font-black leading-none text-white sm:text-[2rem]">
              {hasScore ? score : '—'}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col items-center space-y-2">
          <p
            className={`max-w-[10rem] text-center text-[11px] font-bold uppercase leading-snug tracking-[0.18em] ${scoreColor && scoreColor !== 'undefined' ? '' : 'text-[var(--text-muted)]'}`}
            style={{ color: scoreColor }}
          >
            {label}
          </p>
          {comparisonText && (
            <p className="max-w-[16rem] text-center text-[11px] font-medium leading-relaxed text-[var(--text-muted)]">
              {comparisonText}
            </p>
          )}
          <p className="max-w-[18rem] text-xs leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
