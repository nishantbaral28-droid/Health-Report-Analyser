import QuestionnaireFlow from '@/components/assessment/QuestionnaireFlow';
import { Activity, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Check Your Score | MetaHealth',
  description: 'Choose a focused questionnaire to check your Cortisol or Diabetes score in a few minutes.',
};

export default function AssessmentLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] flex justify-center py-10 md:py-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[var(--accent-purple)] rounded-full opacity-[0.05] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[var(--accent-cyan)] rounded-full opacity-[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col h-full mt-4 md:mt-10">
        
        {/* Simple Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8 sm:mb-12">
           <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--gradient-primary)' }}>
              <Sparkles className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
             <span className="gradient-text">Check Your</span> Score
           </h1>
           <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
             Choose a focused questionnaire for Cortisol or Diabetes and get a targeted score based on the risk drivers that matter most.
           </p>
           <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
             <Activity className="w-3.5 h-3.5 text-[var(--accent-purple)]" />
             Questionnaire-Based Screening
           </div>
        </div>

        {/* The interactive Questionnaire component */}
        <QuestionnaireFlow />

      </div>
    </main>
  );
}
