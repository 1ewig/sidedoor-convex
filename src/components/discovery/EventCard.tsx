'use client';

import { MapPin, Sparkles, Clock, Ticket, ArrowUpRight, Check } from 'lucide-react';
import { LocalEvent } from '@/types';
import { EventImage } from '@/components/ui/EventImage';

interface EventCardProps {
  event: LocalEvent;
  onSelect: (event: LocalEvent) => void;
}

const PILL_BASE_STYLE =
  'inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] px-2 py-0.5 rounded-full';

export function EventCard({ event, onSelect }: EventCardProps) {
  const isSent = event.outreachStatus === 'sent' || event.outreachStatus === 'replied';
  const thumbnailImages =
    event.coverImages && event.coverImages.length > 0
      ? event.coverImages
      : event.coverImage
      ? [event.coverImage]
      : [];

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="w-full group bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] p-4 sm:p-5 rounded-2xl shadow-[var(--shadow-float)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
    >
      {/* Top Metadata Row: Badges + Price + Inquired/Details signal */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${PILL_BASE_STYLE} capitalize`}>
            {event.category}
          </span>

          <span className={PILL_BASE_STYLE}>
            <Sparkles className="w-3 h-3 text-[var(--theme-text-muted)] shrink-0" />
            <span>{event.matchScore}% Match</span>
          </span>

          <span className={PILL_BASE_STYLE}>
            <Ticket className="w-3 h-3 text-[var(--theme-text-muted)] shrink-0" />
            <span>{event.price}</span>
          </span>
        </div>

        {/* Right Status / Arrow */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isSent ? (
            <span className={PILL_BASE_STYLE}>
              <Check className="w-3 h-3 text-[var(--theme-text-muted)] shrink-0" />
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

        {/* Compact Flyer Thumbnail (resilient, walks candidates) */}
        {thumbnailImages.length > 0 && (
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] shrink-0">
            <EventImage
              images={thumbnailImages}
              alt={event.title}
              sizes="64px"
              fallbackLabel={event.venueName}
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
