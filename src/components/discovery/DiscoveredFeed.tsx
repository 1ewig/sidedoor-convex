import { Loader2 } from 'lucide-react';
import { LocalEvent } from '@/types';
import { EventCard } from './EventCard';

interface DiscoveredFeedProps {
  events: LocalEvent[];
  isOpen: boolean;
  isScouting?: boolean;
  onSelectEvent: (event: LocalEvent) => void;
}

export function DiscoveredFeed({
  events,
  isOpen,
  isScouting = false,
  onSelectEvent,
}: DiscoveredFeedProps) {
  if (!isOpen) return null;

  return (
    <section className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 pb-20 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      {/* Header bar */}
      <div className="pt-6 flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3.5 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="font-serif text-[var(--text-lg)] text-[var(--theme-text-primary)] font-semibold">
            Discovered Gatherings
          </span>
          {isScouting ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[var(--text-2xs)] font-mono bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] shadow-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-text-primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--theme-text-primary)]" />
              </span>
              Scouting in the field...
            </span>
          ) : (
            <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)]">
              ({events.length} results)
            </span>
          )}
        </div>
      </div>

      {/* Feed Container */}
      <div className="space-y-3">
        {/* Active Autonomous Scout Feedback Card */}
        {isScouting && (
          <div className="p-4 sm:p-5 bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-text-primary)]" />
              </div>
              <div>
                <h4 className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                  Autonomous Scout Active
                </h4>
                <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans">
                  Scanning indie venue calendars, underground flyers, and local community boards...
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-primary)]" />
                <span>1. Exploring sources</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-primary)] animate-pulse" />
                <span>2. Verifying details</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-border-strong)]" />
                <span>3. Matching vibe</span>
              </div>
            </div>
          </div>
        )}

        {/* Skeleton Loaders while scouting */}
        {isScouting && (
          <>
            {[1, 2].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="w-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col gap-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-14 rounded-full bg-[var(--theme-bg-elevated)]" />
                    <div className="h-4 w-20 rounded-full bg-[var(--theme-bg-elevated)]" />
                    <div className="h-4 w-16 rounded-full bg-[var(--theme-bg-elevated)]" />
                  </div>
                  <div className="h-4 w-12 rounded bg-[var(--theme-bg-elevated)]" />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded bg-[var(--theme-bg-elevated)]" />
                    <div className="h-3.5 w-1/2 rounded bg-[var(--theme-bg-elevated)]" />
                  </div>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[var(--theme-bg-elevated)] shrink-0" />
                </div>

                <div className="pt-2 border-t border-[var(--theme-border-subtle)] flex items-center justify-between">
                  <div className="h-3 w-32 rounded bg-[var(--theme-bg-elevated)]" />
                  <div className="h-3 w-28 rounded bg-[var(--theme-bg-elevated)]" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Normal Feed Content when not scouting */}
        {!isScouting && events.length === 0 && (
          <div className="p-8 text-center bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] rounded-2xl shadow-xs">
            <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] font-sans">
              No gatherings match your current filters. Try expanding your radius or adjusting tuning settings.
            </p>
          </div>
        )}

        {/* Existing Discovered Events (rendered below skeleton if scouting or as main list) */}
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onSelect={onSelectEvent}
          />
        ))}
      </div>
    </section>
  );
}
