'use client';

interface BloodSugarChartProps {
  glucose?: number | null;
  hba1c?: number | null;
}

export default function BloodSugarChart({ glucose, hba1c }: BloodSugarChartProps) {
  if (!glucose && !hba1c) return null;

  return (
    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Blood Sugar</h3>
      <p className="text-xs text-[var(--text-muted)] mb-6">Glucose & HbA1c levels</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {glucose !== null && glucose !== undefined && (
          <GaugeCard
            label="Fasting Glucose"
            value={glucose}
            unit="mg/dL"
            min={0}
            max={200}
            normalMax={99}
            borderlineMax={125}
          />
        )}
        {hba1c !== null && hba1c !== undefined && (
          <GaugeCard
            label="HbA1c"
            value={hba1c}
            unit="%"
            min={0}
            max={12}
            normalMax={5.6}
            borderlineMax={6.4}
          />
        )}
      </div>
    </div>
  );
}

function GaugeCard({ label, value, unit, min, max, normalMax, borderlineMax }: {
  label: string; value: number; unit: string;
  min: number; max: number; normalMax: number; borderlineMax: number;
}) {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const normalPercent = ((normalMax - min) / (max - min)) * 100;
  const borderlinePercent = ((borderlineMax - min) / (max - min)) * 100;

  let color = 'var(--accent-green)';
  let status = 'Normal';
  if (value > borderlineMax) { color = 'var(--accent-red)'; status = 'High Risk'; }
  else if (value > normalMax) { color = '#f59e0b'; status = 'Borderline'; }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Semi-circle gauge */}
      <div className="relative w-36 h-20 overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background arc */}
          <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="var(--border-color)" strokeWidth="8" strokeLinecap="round" />
          {/* Normal zone */}
          <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="var(--accent-green)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${normalPercent * 1.41} 200`} opacity="0.2" />
          {/* Value arc */}
          <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${percent * 1.41} 200`} />
        </svg>
        {/* Center value text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color }}>{status}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Normal: &lt;{normalMax} {unit}</p>
      </div>
    </div>
  );
}
