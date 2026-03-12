import LifestyleQuestionnaireFlow from '@/components/assessment/LifestyleQuestionnaireFlow';
import { Activity } from 'lucide-react';

export const metadata = {
  title: 'Health Risk Assessment | MetaHealth',
  description: 'A 2-minute lifestyle and health screening to generate your personalized wellness snapshot.',
};

export default function LifestyleAssessmentPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] flex justify-center py-10 md:py-20 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[var(--accent-purple)] rounded-full opacity-[0.05] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[var(--accent-cyan)] rounded-full opacity-[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col h-full mt-4 md:mt-10">
        <div className="flex flex-col items-center justify-center text-center mb-8 sm:mb-12">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
            <span className="gradient-text">Lifestyle Health</span> Screening
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
            Answer a few simple questions to generate your personalized health risk dashboard in seconds.
          </p>
        </div>

        <LifestyleQuestionnaireFlow />
      </div>
    </main>
  );
}
