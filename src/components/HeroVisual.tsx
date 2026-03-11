'use client';

export default function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto h-64 md:h-80">
      <svg viewBox="0 0 500 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* ECG / Heartbeat Line */}
        <path
          d="M 0 150 L 60 150 L 80 150 L 100 130 L 120 170 L 130 80 L 140 220 L 150 120 L 160 150 L 200 150 L 220 150 L 240 130 L 260 170 L 270 80 L 280 220 L 290 120 L 300 150 L 340 150 L 360 150 L 380 130 L 400 170 L 410 80 L 420 220 L 430 120 L 440 150 L 500 150"
          fill="none"
          stroke="url(#ecg-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw"
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="circle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Data Points on the ECG */}
        <circle cx="130" cy="80" r="5" fill="#a855f7" opacity="0.8" className="pulse-slow" />
        <circle cx="270" cy="80" r="5" fill="#3b82f6" opacity="0.8" className="pulse-slow" />
        <circle cx="410" cy="80" r="5" fill="#06b6d4" opacity="0.8" className="pulse-slow" />

        {/* Small data labels */}
        <text x="130" y="65" fill="#a855f7" fontSize="10" textAnchor="middle" fontFamily="monospace" opacity="0.7">HDL: 55</text>
        <text x="270" y="65" fill="#3b82f6" fontSize="10" textAnchor="middle" fontFamily="monospace" opacity="0.7">A1c: 5.2%</text>
        <text x="410" y="65" fill="#06b6d4" fontSize="10" textAnchor="middle" fontFamily="monospace" opacity="0.7">CRP: 0.8</text>

        {/* Decorative molecule/DNA circles */}
        <circle cx="80" cy="60" r="20" fill="url(#circle-gradient)" />
        <circle cx="420" cy="240" r="25" fill="url(#circle-gradient)" />
        <circle cx="250" cy="250" r="15" fill="url(#circle-gradient)" />

        {/* Small cross marks (medical) */}
        <g opacity="0.2">
          <line x1="50" y1="40" x2="50" y2="55" stroke="#a855f7" strokeWidth="2" />
          <line x1="42.5" y1="47.5" x2="57.5" y2="47.5" stroke="#a855f7" strokeWidth="2" />
        </g>
        <g opacity="0.2">
          <line x1="450" y1="50" x2="450" y2="65" stroke="#06b6d4" strokeWidth="2" />
          <line x1="442.5" y1="57.5" x2="457.5" y2="57.5" stroke="#06b6d4" strokeWidth="2" />
        </g>
      </svg>

      {/* CSS animation for ECG drawing */}
      <style jsx>{`
        .animate-draw {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: draw 3s ease-in-out forwards, glow 2s ease-in-out infinite alternate;
          animation-delay: 0.5s;
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes glow {
          from { filter: drop-shadow(0 0 3px rgba(168, 85, 247, 0.3)); }
          to { filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)); }
        }
      `}</style>
    </div>
  );
}
