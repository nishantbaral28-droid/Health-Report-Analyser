import UploadDropzone from '@/components/UploadDropzone';
import HeroVisual from '@/components/HeroVisual';
import { Activity, ShieldCheck, Zap, BarChart3, FileText, Brain, Droplets, Heart, Microscope, Pill, Stethoscope, TestTubes, Lock, Server, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* ── Background Orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--accent-purple)] rounded-full opacity-[0.07] blur-[100px] float-animation" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[var(--accent-blue)] rounded-full opacity-[0.07] blur-[100px] float-animation-delay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-cyan)] rounded-full opacity-[0.04] blur-[120px] pulse-slow" />
      </div>

      {/* ───────────── SECTION 1: HERO ───────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="max-w-5xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)]">
            <Brain className="w-4 h-4 text-[var(--accent-purple)]" />
            AI-Powered Medical Report Analysis
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            <span className="text-[var(--text-primary)]">Decode Your</span>
            <br />
            <span className="gradient-text">Health Reports</span>
            <br />
            <span className="text-[var(--text-primary)]">Instantly</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Upload a lab report PDF or a clear report image. Our AI reads supported biomarkers, checks row confidence, and builds a personalized insights dashboard.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center pt-2">
            <a href="#upload" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all hover:scale-105" style={{ background: 'var(--gradient-primary)' }}>
              Analyze Your Report
              <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/lifestyle-assessment" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--accent-purple)] transition-all">
              Don&apos;t Have Your Report?
            </a>
            <a href="/assessment" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--accent-purple)] transition-all">
              Check Your Score
            </a>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:border-[var(--border-light)] hover:bg-[var(--bg-card)] transition-all">
              How It Works
            </a>
          </div>
        </div>

        {/* Animated ECG Visual */}
        <div className="mt-8 md:mt-12 w-full max-w-3xl">
          <HeroVisual />
        </div>
      </section>

      {/* ───────────── SECTION 2: HOW IT WORKS ───────────── */}
      <section id="how-it-works" className="relative z-10 px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[var(--accent-purple)] uppercase tracking-wider mb-2">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-14 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-blue)] to-[var(--accent-cyan)] opacity-30" />

            <StepCard step={1} color="var(--accent-purple)" icon={<FileText className="w-7 h-7 text-white" />} title="Upload Report" description="Upload a PDF export or a clear phone photo of your lab report. The current parser is optimized for CBC, lipid, glucose, vitamin, CRP, and infectious screening markers." gradientFrom="var(--accent-purple)" gradientTo="var(--accent-blue)" />
            <StepCard step={2} color="var(--accent-blue)" icon={<Brain className="w-7 h-7 text-white" />} title="AI Extraction" description="Our Gemini-powered engine reads the report visually, extracts supported biomarkers, and blocks uncertain rows instead of guessing." gradientFrom="var(--accent-blue)" gradientTo="var(--accent-cyan)" />
            <StepCard step={3} color="var(--accent-cyan)" icon={<BarChart3 className="w-7 h-7 text-white" />} title="Get Insights" description="View your personalized dashboard with color-coded risk indicators, lipid & blood sugar charts, and actionable health recommendations." gradientFrom="var(--accent-cyan)" gradientTo="var(--accent-green)" />
          </div>
        </div>
      </section>

      {/* ───────────── SECTION 3: SUPPORTED TESTS ───────────── */}
      <section className="relative z-10 px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[var(--accent-blue)] uppercase tracking-wider mb-2">Compatibility</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Supported Test Types</h2>
            <p className="text-[var(--text-secondary)] mt-3 max-w-xl mx-auto">
              Optimized for lab PDFs and clear report images that include the supported biomarker panels below.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <TestTypeCard icon={<Droplets className="w-6 h-6" />} name="Blood Test (CBC)" color="var(--accent-red)" />
            <TestTypeCard icon={<Heart className="w-6 h-6" />} name="Lipid Profile" color="var(--accent-purple)" />
            <TestTypeCard icon={<Activity className="w-6 h-6" />} name="Blood Sugar" color="var(--accent-blue)" />
            <TestTypeCard icon={<Stethoscope className="w-6 h-6" />} name="CRP / Inflammation" color="var(--accent-cyan)" />
            <TestTypeCard icon={<Pill className="w-6 h-6" />} name="Vitamin D / B12" color="var(--accent-green)" />
            <TestTypeCard icon={<Microscope className="w-6 h-6" />} name="Infectious Screens" color="var(--accent-purple)" />
          </div>

          {/* Biomarker Tag Cloud */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['Fasting Glucose', 'HbA1c', 'Total Cholesterol', 'HDL', 'LDL', 'Triglycerides', 'Hemoglobin', 'WBC', 'RBC', 'Platelets', 'CRP', 'Vitamin D', 'Vitamin B12', 'Dengue NS1', 'Typhi Dot'].map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium border border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-card)]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── SECTION 4: UPLOAD CTA ───────────── */}
      <section id="upload" className="relative z-10 px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="surface-card p-8 md:p-10 glow-purple">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-purple)15' }}>
                <FileText className="w-5 h-5 text-[var(--accent-purple)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upload Your Lab Report</h2>
                <p className="text-sm text-[var(--text-muted)]">PDF, PNG, JPG, or WEBP — Max 4MB</p>
              </div>
            </div>
            <UploadDropzone />
          </div>
        </div>
      </section>

      {/* ───────────── SECTION 5: FEATURES + TRUST ───────────── */}
      <section className="relative z-10 px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[var(--accent-green)] uppercase tracking-wider mb-2">Why Choose Us</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Built for Modern Healthcare</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={<Activity className="w-5 h-5" />} title="30+ Supported Markers" description="Track CBC markers, lipids, HbA1c, fasting glucose, CRP, vitamin D, vitamin B12, and select infectious screens." color="var(--accent-green)" />
            <FeatureCard icon={<Zap className="w-5 h-5" />} title="Instant Analysis" description="AI extracts and classifies every result in under 10 seconds." color="var(--accent-purple)" />
            <FeatureCard icon={<BarChart3 className="w-5 h-5" />} title="Visual Dashboard" description="Color-coded risk cards, lipid charts, blood sugar gauges, and trend visualizations." color="var(--accent-cyan)" />
            <FeatureCard icon={<ShieldCheck className="w-5 h-5" />} title="Privacy First" description="Reports are processed securely. Data is encrypted and never shared with third parties." color="var(--accent-blue)" />
            <FeatureCard icon={<Brain className="w-5 h-5" />} title="Smart Insights" description="AI-generated explanations of your results with actionable lifestyle recommendations." color="var(--accent-purple)" />
            <FeatureCard icon={<FileText className="w-5 h-5" />} title="PDF & Report Images" description="Works with lab PDF exports and clear report photos that show the result and reference-range rows." color="var(--accent-green)" />
          </div>

          {/* Trust Badges */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <TrustBadge icon={<Lock className="w-6 h-6" />} title="256-bit Encryption" subtitle="Your data is AES-256 encrypted" />
            <TrustBadge icon={<Server className="w-6 h-6" />} title="HIPAA-Ready Infra" subtitle="Supabase + Vercel edge network" />
            <TrustBadge icon={<ShieldCheck className="w-6 h-6" />} title="No Data Retention" subtitle="Reports deleted after processing" />
          </div>
        </div>
      </section>

      {/* ───────────── SECTION 6: FOOTER ───────────── */}
      <footer className="relative z-10 border-t border-[var(--border-color)] px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Health Report Analyzer</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">AI-powered medical lab insights</p>
          </div>

          {/* MetaHealth Cross-sell */}
          <div className="surface-card px-5 py-4 flex items-center gap-4 max-w-md">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Track your health over time</p>
              <p className="text-xs text-[var(--text-muted)]">Connect to MetaHealth Dashboard for long-term metabolic tracking.</p>
            </div>
            <a href="https://metabolic-health-dashboard.vercel.app" target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent-purple)] hover:underline whitespace-nowrap">
              Learn More →
            </a>
          </div>

          <p className="text-xs text-[var(--text-muted)]">© 2026 Health Report Analyzer</p>
        </div>
      </footer>
    </main>
  );
}

/* ── Reusable Sub-Components ── */

function StepCard({ step, color, icon, title, description, gradientFrom, gradientTo }: { step: number; color: string; icon: React.ReactNode; title: string; description: string; gradientFrom: string; gradientTo: string }) {
  return (
    <div className="surface-card p-6 text-center space-y-4 group hover:glow-blue transition-all relative">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
        {icon}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color }}>Step {step}</div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

function TestTypeCard({ icon, name, color }: { icon: React.ReactNode; name: string; color: string }) {
  return (
    <div className="surface-card p-4 flex flex-col items-center gap-3 text-center group hover:border-[var(--border-light)] transition-all">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">{name}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="surface-card p-5 flex items-start gap-4 group hover:border-[var(--border-light)] transition-all">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TrustBadge({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div className="w-12 h-12 rounded-full border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
        {icon}
      </div>
      <p className="font-semibold text-sm text-[var(--text-primary)]">{title}</p>
      <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}
