export function ShadowOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
      <svg
        className="absolute -top-24 -right-20 w-[650px] sm:w-[900px] h-auto blur-2xl transform rotate-12 scale-110"
        viewBox="0 0 600 600"
        fill="none"
      >
        <g fill="var(--theme-text-primary)">
          <ellipse cx="420" cy="180" rx="280" ry="45" transform="rotate(-35 420 180)" />
          <ellipse cx="450" cy="240" rx="300" ry="38" transform="rotate(-25 450 240)" />
          <ellipse cx="460" cy="310" rx="320" ry="42" transform="rotate(-15 460 310)" />
          <ellipse cx="440" cy="380" rx="270" ry="36" transform="rotate(-5 440 380)" />
          <ellipse cx="380" cy="450" rx="250" ry="32" transform="rotate(10 380 450)" />
          <ellipse cx="300" cy="500" rx="230" ry="28" transform="rotate(22 300 500)" />
        </g>
      </svg>
    </div>
  );
}
