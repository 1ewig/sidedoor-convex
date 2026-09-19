'use client';

import Image from 'next/image';
import { MapPin, Sparkles, Clock, Ticket, ArrowUpRight, Check, Zap } from 'lucide-react';
import { LocalEvent } from '@/types';

interface EventCardProps {
  event: LocalEvent;
  onSelect: (event: LocalEvent) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  music: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  art: 'bg-[var(--theme-text-primary)]/5 text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  market: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  nightlife: 'bg-[var(--theme-text-primary)]/10 text-[var(--theme-text-primary)] border-[var(--theme-text-primary)]/20',
  food: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  community: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
};

export function EventCard({ event, onSelect }: EventCardProps) {
  const isSent = event.outreachStatus === 'sent' || event.outreachStatus === 'replied';
  const categoryClass = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.music;

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="w-full group bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] p-4 sm:p-5 rounded-2xl shadow-[var(--shadow-float)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
    >
      {/* Top Metadata Row: Badges + Price + Inquired/Details signal */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-[var(--text-2xs)] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryClass}`}
          >
            {event.category}
          </span>

          <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-text-primary)] bg-[var(--theme-text-primary)]/5 px-2 py-0.5 rounded-full font-medium border border-[var(--theme-border-subtle)]">
            <Sparkles className="w-3 h-3 text-[var(--theme-text-muted)]" />
            {event.matchScore}% Match
          </span>

          <div className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-medium font-sans text-[var(--theme-text-secondary)] bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] px-2 py-0.5 rounded-full">
            <Ticket className="w-3 h-3 text-[var(--theme-text-muted)]" />
            <span>{event.price}</span>
          </div>

          {event.firecrawlExtractedAt?.includes('structured') ? (
            <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-text-secondary)] bg-[var(--theme-bg-base)] px-2 py-0.5 rounded-full border border-[var(--theme-border-subtle)]">
              <Zap className="w-2.5 h-2.5 text-[var(--theme-text-muted)]" />
              JSON-LD
            </span>
          ) : event.firecrawlExtractedAt?.includes('unstructured') ? (
            <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] bg-[var(--theme-bg-base)] px-2 py-0.5 rounded-full border border-[var(--theme-border-subtle)]">
              Deep-Lane
            </span>
          ) : null}
        </div>

        {/* Right Status / Arrow */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isSent ? (
            <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-text-primary)] bg-[var(--theme-text-primary)]/5 border border-[var(--theme-border-subtle)] px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              <span className="hidden sm:inline">Inquired</span>
            </span>
          ) : (
            <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] flex items-center gap-0.5 transition-colors">
              <span className="hidden sm:inline">Details</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          )}
        </div>
      </div>

      {/* Main Content Row: Title, Tagline & Thumbnail */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[var(--text-base)] font-semibold text-[var(--theme-text-primary)] leading-[var(--leading-snug)] group-hover:opacity-80 transition-opacity line-clamp-1">
            {event.title}
          </h3>
          {event.tagline ? (
            <p className="font-serif italic text-[var(--text-xs)] text-[var(--theme-text-secondary)] mt-0.5 leading-[var(--leading-snug)] line-clamp-1">
              &ldquo;{event.tagline}&rdquo;
            </p>
          ) : (
            event.description && (
              <p className="text-[var(--text-xs)] text-[var(--theme-text-secondary)] mt-0.5 leading-[var(--leading-snug)] line-clamp-1 font-sans">
                {event.description}
              </p>
            )
          )}
        </div>

        {/* Compact Flyer Thumbnail */}
        {event.coverImage && (
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] shrink-0">
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              unoptimized
              sizes="64px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </div>

      {/* Bottom Compact Info: Venue + Distance & Date/Time */}
      <div className="pt-2 border-t border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[var(--text-2xs)] font-sans text-[var(--theme-text-muted)]">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3 h-3 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] transition-colors shrink-0" />
          <span className="font-medium text-[var(--theme-text-secondary)] truncate">
            {event.venueName}
          </span>
          <span>•</span>
          <span className="font-mono truncate">{event.distanceKm} km</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{event.formattedDate}</span>
          <span>•</span>
          <span>{event.formattedTime}</span>
        </div>
      </div>
    </button>
  );
}
