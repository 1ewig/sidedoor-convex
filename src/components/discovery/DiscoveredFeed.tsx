import { LocalEvent } from '@/types';

interface DiscoveredFeedProps {
  events: LocalEvent[];
  isOpen: boolean;
  onSendAgentMail: (event: LocalEvent) => void;
}

export function DiscoveredFeed({
  events,
  isOpen,
  onSendAgentMail,
}: DiscoveredFeedProps) {
  if (!isOpen) return null;

  return (
    <section className="relative z-10 w-full max-w-xl mx-auto px-6 pb-16 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      <div className="pt-6 flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3 mb-4">
        <span className="font-serif text-lg text-[var(--theme-text-primary)]">
          Discovered Gatherings
        </span>
        <span className="text-[10px] font-mono text-[var(--theme-text-muted)] uppercase tracking-wider">
          Firecrawl Scored
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const isSent = event.outreachStatus === 'sent' || event.outreachStatus === 'replied';

          return (
            <div
              key={event.id}
              className="bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] p-4 rounded-2xl shadow-[var(--shadow-float)] flex flex-col gap-2 hover:border-[var(--theme-border-strong)] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-[var(--theme-brand-accent)] bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      {event.matchScore}% Vibe Match
                    </span>
                    <span className="text-[10px] text-[var(--theme-text-muted)] font-mono">
                      {event.distanceKm} km away
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-[var(--theme-text-primary)] leading-snug">
                    {event.title}
                  </h3>
                  <p className="text-xs text-[var(--theme-text-muted)] mt-0.5 font-sans">
                    {event.venueName} · {event.formattedDate} · {event.price}
                  </p>
                </div>

                {isSent ? (
                  <span className="px-2.5 py-1 text-[11px] font-mono text-[var(--theme-brand-accent)] bg-emerald-50/70 rounded-full shrink-0">
                    ✓ Inquired
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendAgentMail(event)}
                    className="px-2.5 py-1 text-[11px] rounded-full border border-[var(--theme-border-subtle)] hover:bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] font-medium transition shrink-0 cursor-pointer"
                  >
                    RSVP via AgentMail
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
