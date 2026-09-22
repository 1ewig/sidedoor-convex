import { Sparkles, Compass, MessageSquare } from 'lucide-react';

export function LandingManifesto() {
  return (
    <section
      id="the-idea"
      className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--theme-border-subtle)]"
    >
      {/* Header */}
      <div className="max-w-xl mb-10 text-left">
        <span className="text-[var(--text-2xs)] font-sans uppercase tracking-wider text-[var(--theme-text-muted)] block mb-1.5 font-medium">
          The Idea
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-2">
          Culture shouldn’t feel like buying an airline ticket.
        </h2>
        <p className="text-[var(--text-xs)] sm:text-[var(--text-sm)] text-[var(--theme-text-secondary)] leading-[var(--leading-relaxed)] font-light">
          We seek out gatherings that are smaller, slower, and closer to home.
        </p>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1 */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex flex-col justify-between shadow-2xs hover:border-[var(--theme-border-strong)] transition-all duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[var(--text-xs)] text-[var(--theme-text-muted)]">
                01
              </span>
              <div className="w-7 h-7 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-text-primary)]">
                <Compass className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="font-serif text-[var(--text-base)] text-[var(--theme-text-primary)] mb-2 leading-snug">
              Rooms With Thirty Chairs
            </h3>
            <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] leading-[var(--leading-relaxed)]">
              An unamplified cello in a brick room changes your week. We curate for warmth and intimate acoustic presence.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-sans text-[var(--theme-text-secondary)]">
            Intimacy over scale
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex flex-col justify-between shadow-2xs hover:border-[var(--theme-border-strong)] transition-all duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[var(--text-xs)] text-[var(--theme-text-muted)]">
                02
              </span>
              <div className="w-7 h-7 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-text-primary)]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="font-serif text-[var(--text-base)] text-[var(--theme-text-primary)] mb-2 leading-snug">
              The Unhurried Web
            </h3>
            <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] leading-[var(--leading-relaxed)]">
              The best independent spaces don’t buy ads. We scout quiet blogs and indie calendars so you never miss them.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-sans text-[var(--theme-text-secondary)]">
            Beyond the algorithm
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex flex-col justify-between shadow-2xs hover:border-[var(--theme-border-strong)] transition-all duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[var(--text-xs)] text-[var(--theme-text-muted)]">
                03
              </span>
              <div className="w-7 h-7 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-text-primary)]">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="font-serif text-[var(--text-base)] text-[var(--theme-text-primary)] mb-2 leading-snug">
              A Warm Introduction
            </h3>
            <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] leading-[var(--leading-relaxed)]">
              When a venue needs an RSVP, our scout writes directly to the host to save your spot.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-sans text-[var(--theme-text-secondary)]">
            Direct communication
          </div>
        </div>
      </div>
    </section>
  );
}
