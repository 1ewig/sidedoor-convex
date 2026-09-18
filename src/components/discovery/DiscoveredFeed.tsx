import { LocalEvent } from '@/types';
import { EventCard } from './EventCard';

interface DiscoveredFeedProps {
  events: LocalEvent[];
  isOpen: boolean;
  onSelectEvent: (event: LocalEvent) => void;
}

export function DiscoveredFeed({
  events,
  isOpen,
  onSelectEvent,
}: DiscoveredFeedProps) {
  if (!isOpen) return null;

  return (
    <section className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 pb-20 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      {/* Header bar */}
      <div className="pt-6 flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3.5 mb-5">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[var(--text-lg)] text-[var(--theme-text-primary)] font-semibold">
            Discovered Gatherings
          </span>
          <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] px-2 py-0.5 rounded-full">
            {events.length} results
          </span>
        </div>
        <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] uppercase tracking-wider">
          Firecrawl &amp; Gemini 3.5
        </span>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="p-8 text-center bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] rounded-2xl shadow-xs">
            <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] font-sans">
              No gatherings match your current filters. Try expanding your radius or adjusting tuning settings.
            </p>
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
            />
          ))
        )}
      </div>
    </section>
  );
}
