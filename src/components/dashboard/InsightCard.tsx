'use client';

import { Lightbulb } from 'lucide-react';

interface InsightCardProps {
  title: string;
  description: string;
  index: number;
}

export default function InsightCard({ title, description, index }: InsightCardProps) {
  const colors = [
    'var(--accent-purple)',
    'var(--accent-blue)',
    'var(--accent-cyan)',
    'var(--accent-green)',
    'var(--accent-purple)',
  ];
  const color = colors[index % colors.length];

  return (
    <div className="surface-card p-5 flex gap-4 hover:border-[var(--border-light)] transition-all group">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${color}15`, color }}>
        <Lightbulb className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">{title}</h4>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
