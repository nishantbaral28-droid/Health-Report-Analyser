'use client';

import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingDown, TrendingUp, Minus, Info, FileSearch, ShieldCheck } from 'lucide-react';
import type { NumericStatus, ClinicalStatus } from '@/lib/biomarkers';

interface BiomarkerCardProps {
  name: string;
  value: string | number;
  unit: string;
  numericStatus?: NumericStatus;
  clinicalStatus?: ClinicalStatus;
  riskLevel?: string; // Legacy fallback
  description?: string;
  note?: string;
  normalRange?: { min: number; max: number } | null;
  confidence?: number;
  source?: string;
  evidence_snippet?: string;
  needs_verification?: boolean;
}

export default function BiomarkerCard({ 
  name, 
  value, 
  unit, 
  numericStatus,
  clinicalStatus,
  riskLevel, 
  description, 
  note, 
  normalRange, 
  confidence, 
  source,
  evidence_snippet,
  needs_verification 
}: BiomarkerCardProps) {
  const config: Record<string, any> = {
    NORMAL: {
      border: 'border-[var(--accent-green)]/30',
      bg: 'bg-[var(--accent-green)]',
      text: 'text-[var(--accent-green)]',
      label: 'Normal',
      icon: <CheckCircle2 className="w-4 h-4" />,
      trendIcon: <Minus className="w-3 h-3" />,
    },
    FAVORABLE: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500',
      text: 'text-emerald-500',
      label: 'Favorable',
      icon: <ShieldCheck className="w-4 h-4" />,
      trendIcon: numericStatus === 'ABOVE_RANGE' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />,
    },
    BORDERLINE: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500',
      text: 'text-amber-500',
      label: 'Borderline',
      icon: <AlertCircle className="w-4 h-4" />,
      trendIcon: numericStatus === 'ABOVE_RANGE' ? <TrendingUp className="w-3 h-3" /> : numericStatus === 'BELOW_RANGE' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />,
    },
    CLINICALLY_NOTABLE: {
      border: 'border-orange-500/40',
      bg: 'bg-orange-500',
      text: 'text-orange-500',
      label: 'Notable',
      icon: <AlertTriangle className="w-4 h-4" />,
      trendIcon: numericStatus === 'ABOVE_RANGE' ? <TrendingUp className="w-3 h-3" /> : numericStatus === 'BELOW_RANGE' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />,
    },
    HIGH_PRIORITY: {
      border: 'border-[var(--accent-red)]/30',
      bg: 'bg-[var(--accent-red)]',
      text: 'text-[var(--accent-red)]',
      label: 'High Priority',
      icon: <AlertTriangle className="w-4 h-4" />,
      trendIcon: numericStatus === 'ABOVE_RANGE' ? <TrendingUp className="w-3 h-3" /> : numericStatus === 'BELOW_RANGE' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />,
    },
    UNVERIFIED: {
      border: 'border-orange-500/50',
      bg: 'bg-orange-500',
      text: 'text-orange-500',
      label: 'Verify PDF',
      icon: <FileSearch className="w-4 h-4" />,
      trendIcon: <Minus className="w-3 h-3" />,
    },
    // Backwards Compatibility Mapping
    normal: {
      border: 'border-[var(--accent-green)]/30',
      bg: 'bg-[var(--accent-green)]',
      text: 'text-[var(--accent-green)]',
      label: 'Normal',
      icon: <CheckCircle2 className="w-4 h-4" />,
      trendIcon: <Minus className="w-3 h-3" />,
    },
    borderline: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500',
      text: 'text-amber-500',
      label: 'Borderline',
      icon: <AlertCircle className="w-4 h-4" />,
      trendIcon: <TrendingUp className="w-3 h-3" />,
    },
    high_risk: {
      border: 'border-[var(--accent-red)]/30',
      bg: 'bg-[var(--accent-red)]',
      text: 'text-[var(--accent-red)]',
      label: 'High',
      icon: <AlertTriangle className="w-4 h-4" />,
      trendIcon: <TrendingUp className="w-3 h-3" />,
    },
    low: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500',
      text: 'text-blue-500',
      label: 'Low',
      icon: <TrendingDown className="w-4 h-4" />,
      trendIcon: <TrendingDown className="w-3 h-3" />,
    },
    unverified: {
      border: 'border-orange-500/50',
      bg: 'bg-orange-500',
      text: 'text-orange-500',
      label: 'Verify PDF',
      icon: <FileSearch className="w-4 h-4" />,
      trendIcon: <Minus className="w-3 h-3" />,
    },
  };

  const lookupKey = clinicalStatus || riskLevel || 'UNVERIFIED';
  const c = config[lookupKey] || config.UNVERIFIED;
  const numericValParsed = typeof value === 'number' ? value : parseFloat(String(value));
  const hasRange = normalRange && !isNaN(numericValParsed);

  // Calculate percentage on a progress bar relative to a reasonable display scale
  let barPercent = 50;
  if (hasRange) {
    const rangeSpan = normalRange.max - normalRange.min;
    const maxDisplay = normalRange.max + rangeSpan * 0.5;
    barPercent = Math.min(100, Math.max(5, (numericValParsed / maxDisplay) * 100));
  }

  return (
    <div className={`surface-card p-5 ${c.border} hover:glow-blue transition-all ${needs_verification ? 'border-dashed border-2' : ''}`}>
      <div className="flex flex-col mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-[var(--text-muted)] font-bold tracking-wide uppercase">{name}</p>
                {confidence !== undefined && confidence >= 0.85 && !needs_verification && (
                   <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-500/20">
                     <CheckCircle2 className="w-2.5 h-2.5" />
                     Verified
                   </div>
                )}
                {confidence !== undefined && confidence < 0.85 && !needs_verification && (
                  <div className="group relative z-10 flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-amber-500/20 cursor-help">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Low Conf
                    <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-gray-900 text-amber-300 text-[10px] py-1 px-2 rounded-md shadow-lg z-50 whitespace-normal border border-gray-700">
                      Extraction confidence ({Math.round(confidence * 100)}%). Please verify with original report.
                    </div>
                  </div>
                )}
                {needs_verification && (
                  <div className="group relative z-10 flex items-center gap-1 bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-orange-500/40 cursor-help animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Needs Verification
                    <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[240px] bg-gray-900 text-orange-300 text-[10px] py-1 px-2 rounded-md shadow-lg z-50 whitespace-normal border border-gray-700">
                      Conflict or layout ambiguity detected. System refused to blindly interpret. Check original report.
                    </div>
                  </div>
                )}
                {source && (
                  <div className="group relative z-10 flex items-center justify-center">
                    <Info className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-blue-400 cursor-help transition-colors" />
                    <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[280px] bg-gray-900 border border-gray-700 text-gray-300 text-[10px] py-2 px-3 rounded-xl shadow-2xl z-50 whitespace-normal font-mono text-left">
                      
                      <div className="flex flex-col gap-1.5 mb-2 border-b border-gray-700 pb-2">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Interpretation Logic</div>
                        <div className="flex justify-between gap-4"><span className="text-gray-400">Value:</span> <span className="text-white">{value} {unit}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-gray-400">Reference:</span> <span className="text-white">{normalRange ? `${normalRange.min}-${normalRange.max} ${unit}` : 'N/A'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-gray-400">Flag:</span> <span className={`${c.text} font-bold uppercase`}>{clinicalStatus || riskLevel}</span></div>
                        <div className="mt-0.5 leading-snug"><span className="text-gray-400">Reason:</span> <span className="text-gray-200">{note || 'Normal value.'}</span></div>
                      </div>
                      
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Extraction Evidence</div>
                      <div><span className="text-gray-400">Source:</span> <span className="text-white">{source}</span></div>
                      {evidence_snippet && (
                        <div className="mt-1.5 italic text-gray-400 bg-black/40 p-1.5 rounded border border-gray-800">
                          "...{evidence_snippet}..."
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className={`text-2xl font-black mt-1.5 ${needs_verification ? 'text-orange-400' : 'text-[var(--text-primary)]'}`}>
              {value} <span className="text-sm font-normal text-[var(--text-muted)] tracking-wider">{unit}</span>
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg}/10 ${c.text}`}>
            {c.icon}
            {c.label}
          </span>
        </div>
      </div>

      {/* Reference range bar */}
      {hasRange && !needs_verification && (
        <div className="mb-3">
          <div className="h-2 rounded-full bg-[var(--bg-card-hover)] overflow-hidden relative">
            {/* Normal zone indicator */}
            <div
              className="absolute h-full bg-[var(--accent-green)]/20 rounded-full"
              style={{
                left: `${(normalRange.min / (normalRange.max + (normalRange.max - normalRange.min) * 0.5)) * 100}%`,
                width: `${((normalRange.max - normalRange.min) / (normalRange.max + (normalRange.max - normalRange.min) * 0.5)) * 100}%`,
              }}
            />
            {/* Value marker */}
            <div
              className={`absolute top-0 h-full w-1.5 rounded-full ${c.bg}`}
              style={{ left: `${barPercent}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--text-muted)]">{normalRange.min}</span>
            <span className="text-[10px] text-[var(--text-muted)]">Ref: {normalRange.min}–{normalRange.max} {unit}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{normalRange.max}</span>
          </div>
        </div>
      )}

      {description && <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>}
      {note && riskLevel !== 'normal' && (
        <p className={`text-xs mt-2 ${c.text} leading-relaxed font-medium`}>
          {needs_verification ? <AlertTriangle className="w-3 h-3 inline mr-1" /> : '⚠'} {note}
        </p>
      )}
    </div>
  );
}
