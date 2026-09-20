'use client';

interface RadarHeroProps {
  locationLabel?: string;
  radiusKm?: number;
}

export function RadarHero({
  locationLabel,
  radiusKm = 20,
}: RadarHeroProps) {
  const displayLocation =
    locationLabel && locationLabel !== 'Detecting location...'
      ? locationLabel
      : 'your area';

  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto text-center pt-8 pb-8 px-4 sm:px-6">
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
