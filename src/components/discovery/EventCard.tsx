'use client';

import { ArrowUpRight } from 'lucide-react';
import { LocalEvent } from '@/types';
import { EventImage } from '@/components/ui/EventImage';

interface EventCardProps {
  event: LocalEvent;
  onSelect: (event: LocalEvent) => void;
}

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
      className="w-full group text-left p-4 sm:p-4.5 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] hover:bg-[var(--theme-bg-base)]/60 hover:border-[var(--theme-border-strong)] transition-all duration-150 flex flex-col gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--theme-text-primary)]"
    >
      {/* Top Metadata: Editorial Line + Status */}
      <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-[var(--theme-text-muted)]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="capitalize text-[var(--theme-text-secondary)] font-medium">
            {event.category}
          </span>
          <span>·</span>
          <span>{event.matchScore}% match</span>
          {event.price && (
            <>
              <span>·</span>
              <span className="text-[var(--theme-text-primary)] font-medium">
                {event.price}
              </span>
            </>
          )}
        </div>

        {/* Status / Hover affordance */}
        <div className="shrink-0 flex items-center">
          {isSent ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Inquired
            </span>
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--theme-text-muted)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--theme-text-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
          )}
        </div>
      </div>

      {/* Main Content: Title, Tagline & Thumbnail */}
      <div className="flex items-start justify-between gap-3.5">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-medium text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--theme-text-primary)] line-clamp-1 leading-snug">
            {event.title}
          </h3>
          {(event.tagline || event.description) && (
            <p className="text-xs text-[var(--theme-text-muted)] line-clamp-1 leading-normal">
              {event.tagline || event.description}
            </p>
          )}
        </div>

        {/* Clean Thumbnail */}
        {thumbnailImages.length > 0 && (
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-[var(--theme-bg-base)] shrink-0">
            <EventImage
              images={thumbnailImages}
              alt={event.title}
              sizes="56px"
              fallbackLabel={event.venueName}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </div>

      {/* Bottom Info: Venue & Date/Time */}
      <div className="pt-2 border-t border-[var(--theme-border-subtle)] flex items-center justify-between gap-2 text-xs text-[var(--theme-text-muted)]">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="truncate text-[var(--theme-text-secondary)]">
            {event.venueName}
          </span>
          {typeof event.distanceKm === 'number' && (
            <>
              <span>·</span>
              <span className="font-mono text-[11px] shrink-0">
                {event.distanceKm} km
              </span>
            </>
          )}
        </div>

        <div className="shrink-0 text-[11px] font-mono text-[var(--theme-text-muted)]">
          {event.formattedDate}
          {event.formattedTime && ` · ${event.formattedTime}`}
        </div>
      </div>
    </button>
  );
}