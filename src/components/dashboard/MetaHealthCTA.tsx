'use client';

import { Activity, ArrowRight } from 'lucide-react';

export default function MetaHealthCTA() {
  return (
    <div className="surface-card p-6 md:p-8 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--accent-purple)] rounded-full opacity-[0.06] blur-[80px] group-hover:opacity-[0.1] transition-opacity" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[var(--accent-blue)] rounded-full opacity-[0.06] blur-[80px] group-hover:opacity-[0.1] transition-opacity" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'var(--gradient-primary)' }}>
          <Activity className="w-8 h-8 text-white" />
        </div>

        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Track Your Health Over Time</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-lg">
            Connect to the <span className="font-semibold text-[var(--accent-purple)]">MetaHealth Dashboard</span> to log daily metrics, track your metabolic health score, set goals, and monitor your progress over weeks and months.
          </p>
        </div>

        <a
          href="https://metabolic-health-dashboard.vercel.app"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm flex-shrink-0 hover:scale-105 transition-transform"
          style={{ background: 'var(--gradient-primary)' }}
        >
          Open MetaHealth
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
