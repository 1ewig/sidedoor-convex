export function ShadowOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none [contain:strict]">
      {/* Subtle Warm Ambient Light Orbs via pure radial-gradients (Zero GPU blur shader cost) */}
      <div
        className="absolute -top-32 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full animate-orb-1 transform-gpu pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at center, var(--theme-bg-surface) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-1/2 -right-40 w-80 sm:w-[450px] h-80 sm:h-[450px] rounded-full animate-orb-2 transform-gpu pointer-events-none opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle at center, var(--theme-brand-accent) 0%, transparent 70%)',
        }}
      />

      {/* Gentle Floating Foliage Shadow: Pre-cached SVG filter prevents per-frame CSS convolution recalculation */}
      <div className="absolute inset-0 animate-ambient-breathe transform-gpu">
        <svg
          className="absolute -top-24 -right-20 w-[650px] sm:w-[900px] h-auto animate-shadow-breeze transform-gpu"
          viewBox="0 0 600 600"
          fill="none"
        >
          <defs>
            <filter id="foliage-soft-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <g filter="url(#foliage-soft-blur)" fill="var(--theme-text-primary)" opacity="0.30">
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
