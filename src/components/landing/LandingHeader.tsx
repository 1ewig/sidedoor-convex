'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function LandingHeader() {
  return (
    <header className="relative z-30 w-full px-6 sm:px-10 py-6 flex items-center justify-between">
      {/* Warm Wordmark */}
      <Link
        href="/"
        className="flex items-center gap-2 group cursor-pointer focus-visible:outline-none"
      >
        <span className="font-serif text-[var(--text-lg)] sm:text-[var(--text-xl)] tracking-tight text-[var(--theme-text-primary)] font-medium">
          SideDoor
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-primary)]/40 group-hover:bg-[var(--theme-text-primary)] transition-colors" />
      </Link>

      {/* Human Navigation Links */}
      <nav
        aria-label="Landing Navigation"
        className="hidden md:flex items-center gap-7 text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)]"
      >
        <a
          href="#the-idea"
          className="hover:text-[var(--theme-text-primary)] transition-colors"
        >
          The Idea
        </a>
        <a
          href="#gatherings"
          className="hover:text-[var(--theme-text-primary)] transition-colors"
        >
          Gatherings
        </a>
        <a
          href="#the-hosts"
          className="hover:text-[var(--theme-text-primary)] transition-colors"
        >
          Connecting with Hosts
        </a>
        <Link
          href="/radar"
          className="hover:text-[var(--theme-text-primary)] transition-colors flex items-center gap-1.5"
        >
          <span>Live Radar</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-brand-primary)]" />
        </Link>
      </nav>

      {/* Action CTA */}
      <div className="flex items-center gap-3">
        <Link
          href="/radar"
          className="md:hidden text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] px-2.5 py-1"
        >
          Radar
        </Link>
        <Link
          href="/main"
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
        >
          <span>Explore Gatherings</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </header>
  );
}
