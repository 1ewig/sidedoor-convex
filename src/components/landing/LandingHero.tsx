'use client';

import { useState } from 'react';
import { ArrowRight, Compass, Heart } from 'lucide-react';

interface LandingHeroProps {
  onSearch: (query: string) => void;
}

const INSPIRATION_PILLS = [
  'candlelit cello',
  'analog listening room',
  'midnight ceramics show',
  'secret courtyard jazz',
  'neighborhood zine fair',
];

export function LandingHero({ onSearch }: LandingHeroProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSearch(prompt.trim());
    } else {
      onSearch('intimate concerts, gallery openings, and community suppers');
    }
  };

  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto text-center px-4 sm:px-6 pt-12 sm:pt-16 pb-16">
      {/* Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-sans text-[var(--theme-text-secondary)] mb-6 shadow-2xs">
        <Heart className="w-3 h-3 text-[var(--theme-text-secondary)]" />
        <span>A quiet guide to your city</span>
      </div>

      {/* Editorial Headline */}
      <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-5">
        The best evenings <br />
        <span className="font-serif italic font-normal text-[var(--theme-text-secondary)]">
          aren&apos;t on billboards.
        </span>
      </h1>

      {/* Concise Narrative */}
      <p className="text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--theme-text-muted)] max-w-xl mx-auto leading-[var(--leading-relaxed)] font-light mb-8">
        Hidden concerts, loft studios, and neighborhood gatherings found just off the main road.
      </p>

      {/* Scout Launcher Bar */}
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl mx-auto mb-5">
        <div className="bg-[var(--theme-bg-surface)] rounded-full pl-5 pr-2 py-2 sm:pl-6 sm:pr-2.5 sm:py-2.5 shadow-[var(--shadow-ambient)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] focus-within:border-[var(--theme-text-primary)]/40 focus-within:shadow-[var(--shadow-float)] transition-all duration-200 flex items-center gap-2.5 sm:gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What kind of evening are you looking for?"
            className="flex-1 bg-transparent text-[var(--text-sm)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none min-w-0 font-sans"
          />

          <button
            type="submit"
            aria-label="Find Gatherings"
            className="group px-4 py-2 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] flex items-center gap-1.5 text-[var(--text-xs)] font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </form>

      {/* Inspiration Quick Pills */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-2 mb-10">
        {INSPIRATION_PILLS.map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => onSearch(pill)}
            className="text-[var(--text-2xs)] font-sans px-3 py-1 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Concise Values */}
      <div className="pt-5 border-t border-[var(--theme-border-subtle)]/70 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-[var(--text-2xs)] font-sans text-[var(--theme-text-muted)]">
        <span className="flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-[var(--theme-text-secondary)]" />
          No arena tours
        </span>
        <span>·</span>
        <span>Intimate spaces</span>
        <span>·</span>
        <span>Direct host introductions</span>
      </div>
    </section>
  );
}
