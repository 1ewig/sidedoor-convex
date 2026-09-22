import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-[var(--theme-border-subtle)] px-6 sm:px-10 py-12 text-[var(--theme-text-muted)]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-[var(--text-base)] text-[var(--theme-text-primary)] font-medium">
              SideDoor
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-primary)]/40" />
          </div>
          <p className="text-[var(--text-2xs)] font-sans">
            For the gatherings that make a city feel like home.
          </p>
        </div>

        <div className="flex items-center gap-6 text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)]">
          <Link
            href="/main"
            className="hover:text-[var(--theme-text-primary)] transition-colors"
          >
            Studio
          </Link>
          <Link
            href="/radar"
            className="hover:text-[var(--theme-text-primary)] transition-colors"
          >
            Live Radar
          </Link>
          <a
            href="https://github.com/1ewig/sidedoor-convex"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--theme-text-primary)] transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-[var(--theme-border-subtle)]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[var(--text-2xs)] font-sans text-[var(--theme-text-muted)]">
        <div>
          Crafted for lovers of quiet spaces, independent culture, and real human connection.
        </div>
        <div>
          &copy; {new Date().getFullYear()} SideDoor. Curated in silence.
        </div>
      </div>
    </footer>
  );
}
