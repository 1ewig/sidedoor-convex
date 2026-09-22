import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export function LandingCta() {
  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <div className="p-8 sm:p-14 rounded-3xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-[var(--shadow-ambient)]">
        <span className="text-[var(--text-2xs)] font-sans uppercase tracking-wider text-[var(--theme-text-muted)] block mb-3 font-medium">
          Step Outside The Algorithm
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-4">
          Leave the main street behind.
        </h2>
        <p className="text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--theme-text-secondary)] max-w-xl mx-auto leading-[var(--leading-relaxed)] font-light mb-8">
          The best nights are the ones you almost walked past.
          Discover quiet concerts, candlelit readings, and neighborhood studios opening their doors tonight.
        </p>

        <div className="flex items-center justify-center gap-3.5 flex-wrap">
          <Link
            href="/main"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] text-[var(--text-sm)] font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
          >
            <span>Find a Gathering</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/radar"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] text-[var(--text-sm)] font-medium border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
          >
            <Compass className="w-4 h-4 text-[var(--theme-text-muted)]" />
            <span>Browse Live Radar</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
