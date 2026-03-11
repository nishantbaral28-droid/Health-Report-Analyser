'use client';

interface LipidChartProps {
  cholesterol?: number | null;
  hdl?: number | null;
  ldl?: number | null;
  triglycerides?: number | null;
}

interface LipidBar {
  name: string;
  value: number;
  ref: number;
  color: string;
  refLabel: string;
}

export default function LipidChart({ cholesterol, hdl, ldl, triglycerides }: LipidChartProps) {
  const bars: LipidBar[] = [
    cholesterol ? { name: 'Total Chol.', value: cholesterol, ref: 200, refLabel: '<200', color: cholesterol > 239 ? '#ef4444' : cholesterol > 200 ? '#f59e0b' : '#10b981' } : null,
    hdl ? { name: 'HDL', value: hdl, ref: 40, refLabel: '>40', color: hdl < 40 ? '#ef4444' : '#10b981' } : null,
    ldl ? { name: 'LDL', value: ldl, ref: 100, refLabel: '<100', color: ldl > 159 ? '#ef4444' : ldl > 100 ? '#f59e0b' : '#10b981' } : null,
    triglycerides ? { name: 'Triglyc.', value: triglycerides, ref: 150, refLabel: '<150', color: triglycerides > 199 ? '#ef4444' : triglycerides > 150 ? '#f59e0b' : '#10b981' } : null,
  ].filter(Boolean) as LipidBar[];

  if (bars.length === 0) return null;

  const maxVal = Math.max(...bars.map(b => Math.max(b.value, b.ref))) * 1.2;

  return (
    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Lipid Profile</h3>
      <p className="text-xs text-[var(--text-muted)] mb-6">Cholesterol & fat levels in your blood</p>

      <div className="space-y-5">
        {bars.map((bar, i) => {
          const barWidth = Math.max(8, (bar.value / maxVal) * 100);
          const refWidth = (bar.ref / maxVal) * 100;

          return (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">{bar.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: bar.color }}>{bar.value}</span>
                  <span className="text-xs text-[var(--text-muted)]">mg/dL</span>
                </div>
              </div>
              <div className="relative h-6 rounded-lg bg-[var(--bg-card-hover)] overflow-hidden">
                {/* Value bar */}
                <div
                  className="absolute top-0 left-0 h-full rounded-lg transition-all duration-700 ease-out"
                  style={{ width: `${barWidth}%`, backgroundColor: bar.color, opacity: 0.8 }}
                />
                {/* Reference line */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/40"
                  style={{ left: `${refWidth}%` }}
                />
                {/* Reference label */}
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[10px] text-white/60 font-medium"
                  style={{ left: `${Math.min(refWidth + 1, 80)}%` }}
                >
                  Ref: {bar.refLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          <span className="text-xs text-[var(--text-muted)]">Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          <span className="text-xs text-[var(--text-muted)]">Borderline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          <span className="text-xs text-[var(--text-muted)]">High Risk</span>
        </div>
      </div>
    </div>
  );
}
