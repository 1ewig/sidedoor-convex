export function ShadowOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Subtle Warm Ambient Light Orbs */}
      <div className="absolute -top-32 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[var(--theme-bg-surface)] opacity-40 blur-3xl animate-orb-1 transform-gpu" />
      <div className="absolute top-1/2 -right-40 w-80 sm:w-[450px] h-80 sm:h-[450px] rounded-full bg-[var(--theme-brand-accent)] opacity-[0.04] blur-3xl animate-orb-2 transform-gpu" />

      {/* Gentle Floating Foliage Shadow */}
      <div className="absolute inset-0 animate-ambient-breathe">
        <svg
          className="absolute -top-24 -right-20 w-[650px] sm:w-[900px] h-auto blur-2xl animate-shadow-breeze transform-gpu"
          viewBox="0 0 600 600"
          fill="none"
        >
          <g fill="var(--theme-text-primary)" opacity="0.85">
            <ellipse cx="420" cy="180" rx="280" ry="45" transform="rotate(-35 420 180)" />
            <ellipse cx="450" cy="240" rx="300" ry="38" transform="rotate(-25 450 240)" />
            <ellipse cx="460" cy="310" rx="320" ry="42" transform="rotate(-15 460 310)" />
            <ellipse cx="440" cy="380" rx="270" ry="36" transform="rotate(-5 440 380)" />
            <ellipse cx="380" cy="450" rx="250" ry="32" transform="rotate(10 380 450)" />
            <ellipse cx="300" cy="500" rx="230" ry="28" transform="rotate(22 300 500)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
