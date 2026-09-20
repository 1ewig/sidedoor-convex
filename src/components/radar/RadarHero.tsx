'use client';

interface RadarHeroProps {
  totalCount: number;
  locationLabel?: string;
  radiusKm?: number;
}

export function RadarHero({
  totalCount,
  locationLabel,
  radiusKm = 20,
}: RadarHeroProps) {
  const displayLocation =
    locationLabel && locationLabel !== 'Detecting location...'
      ? locationLabel
      : 'your area';

  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto text-center pt-8 pb-8 px-4 sm:px-6">
      {/* Live Area Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] shadow-xs mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-status-success)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-status-success)]" />
        </span>
        <span className="font-mono text-[var(--text-2xs)] uppercase tracking-wider text-[var(--theme-text-muted)]">
          Local Area Radar
        </span>
        <span className="text-[var(--theme-border-subtle)]">•</span>
        <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-primary)] font-semibold">
          {totalCount} {totalCount === 1 ? 'Gathering' : 'Gatherings'} Nearby
        </span>
      </div>

      {/* Editorial Headline */}
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-4">
        Local Radar <br />
        <span className="font-serif italic font-normal text-[var(--theme-text-secondary)]">
          whispers & secret rooms in {displayLocation}
        </span>
      </h1>

      <p className="text-[var(--text-sm)] text-[var(--theme-text-muted)] max-w-xl mx-auto leading-[var(--leading-relaxed)] font-light">
        Live gatherings curated within {radiusKm} km of {displayLocation}. Sourced from indie calendars, DIY spaces, and quiet corners of the web.
      </p>
    </section>
  );
}
