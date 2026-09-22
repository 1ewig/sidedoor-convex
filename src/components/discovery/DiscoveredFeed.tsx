import { useMemo, useState, useEffect } from 'react';
import { Loader2, Zap, X } from 'lucide-react';
import { LocalEvent, HybridDiscoveryStats } from '@/types';
import { EventCard } from './EventCard';

interface DiscoveredFeedProps {
  events: LocalEvent[];
  isOpen: boolean;
  isScouting?: boolean;
  hybridStats?: HybridDiscoveryStats | null;
  onSelectEvent: (event: LocalEvent) => void;
  onDismissBatch?: (batchId: string) => void;
}

interface EventBatch {
  id: string;
  prompt?: string;
  location?: string;
  scoutedAt?: number;
  events: LocalEvent[];
}

export function DiscoveredFeed({
  events,
  isOpen,
  isScouting = false,
  hybridStats,
  onSelectEvent,
  onDismissBatch,
}: DiscoveredFeedProps) {
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (!isScouting) return;
    const t1 = setTimeout(() => setActiveStage(2), 3000);
    const t2 = setTimeout(() => setActiveStage(3), 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setActiveStage(1);
    };
  }, [isScouting]);
  const batches = useMemo(() => {
    const result: EventBatch[] = [];
    let currentBatch: EventBatch | null = null;

    for (const event of events) {
      const batchKey = event.batchId || event.searchPrompt || 'default';
      if (!currentBatch || currentBatch.id !== batchKey) {
        currentBatch = {
          id: batchKey,
          prompt: event.searchPrompt,
          location: event.searchLocation,
          scoutedAt: event.scoutedAt,
          events: [],
        };
        result.push(currentBatch);
      }
      currentBatch.events.push(event);
    }

    return result;
  }, [events]);

  if (!isOpen) return null;

  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-24 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      {/* Minimal Centered Header */}
      <div className="pt-8 pb-3 mb-6 flex items-center justify-center gap-2 flex-wrap text-center">
        <div className="flex items-center gap-1.5">
          <span className="font-serif text-[var(--text-base)] text-[var(--theme-text-primary)] font-medium">
            Discovered Gatherings
          </span>
          {!isScouting && (
            <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-muted)]">
              ({events.length} {events.length === 1 ? 'gathering' : 'gatherings'})
            </span>
          )}
        </div>

        {isScouting ? (
          <>
            <span className="text-[var(--theme-border-strong)] font-mono text-[var(--text-2xs)]">·</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[var(--text-2xs)] text-[var(--theme-text-secondary)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-text-primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--theme-text-primary)]" />
              </span>
              Scouting in the field...
            </span>
          </>
        ) : (
          hybridStats && (
            <>
              <span className="text-[var(--theme-border-strong)] font-mono text-[var(--text-2xs)]">·</span>
              <span className="inline-flex items-center gap-1 font-mono text-[var(--text-2xs)] text-[var(--theme-text-secondary)]">
                <Zap className="w-2.5 h-2.5 text-[var(--theme-brand-primary)]" />
                <span>
                  Fast Scout
                  {hybridStats.totalDurationSec ? ` • ${hybridStats.totalDurationSec}s` : ''}
                </span>
              </span>
            </>
          )
        )}
      </div>

      {/* Feed Container */}
      <div className="space-y-4">
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
                <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans transition-all duration-300">
                  {activeStage === 1 && 'Scanning indie venue calendars, underground flyers, and local community boards...'}
                  {activeStage === 2 && 'Verifying dates, venue addresses, secret locations, and gathering details...'}
                  {activeStage === 3 && 'Matching atmospheric vibes, intimate aesthetics, and curation...'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)]">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeStage >= 1
                      ? 'bg-[var(--theme-text-primary)]'
                      : 'bg-[var(--theme-border-strong)]'
                  } ${activeStage === 1 ? 'animate-pulse' : ''}`}
                />
                <span className={activeStage === 1 ? 'text-[var(--theme-text-primary)] font-medium' : ''}>
                  1. Exploring sources
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeStage >= 2
                      ? 'bg-[var(--theme-text-primary)]'
                      : 'bg-[var(--theme-border-strong)]'
                  } ${activeStage === 2 ? 'animate-pulse' : ''}`}
                />
                <span className={activeStage === 2 ? 'text-[var(--theme-text-primary)] font-medium' : ''}>
                  2. Verifying details
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeStage >= 3
                      ? 'bg-[var(--theme-text-primary)]'
                      : 'bg-[var(--theme-border-strong)]'
                  } ${activeStage === 3 ? 'animate-pulse' : ''}`}
                />
                <span className={activeStage === 3 ? 'text-[var(--theme-text-primary)] font-medium' : ''}>
                  3. Matching vibe
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Skeleton Loaders while scouting */}
        {isScouting && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="w-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] p-4 sm:p-5 rounded-xl shadow-xs flex flex-col gap-3 animate-pulse"
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
          </div>
        )}

        {/* Normal Feed Content when not scouting */}
        {!isScouting && events.length === 0 && (
          <div className="p-8 text-center bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] rounded-2xl shadow-xs">
            <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] font-sans">
              No gatherings match your current filters. Try expanding your radius or adjusting tuning settings.
            </p>
          </div>
        )}

        {/* Discovered Events grouped by query batch with dividers */}
        {events.length > 0 && (
          <div className="space-y-8">
            {batches.map((batch, batchIndex) => (
              <div key={batch.id} className="space-y-4">
                {/* Query Section Divider */}
                {(batches.length > 1 || batch.prompt) && (
                  <div
                    className={`flex items-center justify-between gap-3 ${
                      batchIndex > 0
                        ? 'pt-8 border-t border-[var(--theme-border-subtle)]'
                        : 'pt-1'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {batch.prompt ? (
                        <span className="font-serif italic text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--theme-text-primary)] font-medium truncate">
                          &ldquo;{batch.prompt}&rdquo;
                        </span>
                      ) : (
                        <span className="font-serif text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--theme-text-primary)] font-medium">
                          Gatherings
                        </span>
                      )}
                      {batch.location && (
                        <>
                          <span className="text-[var(--theme-border-strong)] font-mono text-[var(--text-2xs)]">·</span>
                          <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-secondary)]">
                            {batch.location}
                          </span>
                        </>
                      )}
                      <span className="text-[var(--theme-border-strong)] font-mono text-[var(--text-2xs)]">·</span>
                      <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-muted)]">
                        {batch.events.length} {batch.events.length === 1 ? 'gathering' : 'gatherings'}
                      </span>
                    </div>

                    {onDismissBatch && batch.id !== 'default' && (
                      <button
                        type="button"
                        onClick={() => onDismissBatch(batch.id)}
                        aria-label={`Dismiss batch: ${batch.prompt || 'gatherings'}`}
                        className="shrink-0 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] p-1 rounded-md transition-colors text-[var(--text-2xs)] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Dismiss</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 2-column event grid for this batch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {batch.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={onSelectEvent}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
