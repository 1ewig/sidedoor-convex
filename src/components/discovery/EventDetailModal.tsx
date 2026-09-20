'use client';

import { useEffect } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { LocalEvent } from '@/types';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { EventImage } from '@/components/ui/EventImage';

interface EventDetailModalProps {
  event: LocalEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSendAgentMail: (event: LocalEvent) => void;
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onSendAgentMail,
}: EventDetailModalProps) {
  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const isSent = event.outreachStatus === 'sent' || event.outreachStatus === 'replied';
  const heroImages =
    event.coverImages && event.coverImages.length > 0
      ? event.coverImages
      : event.coverImage
        ? [event.coverImage]
        : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Surface */}
      <div className="relative z-10 w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-xl overflow-hidden text-[var(--theme-text-primary)]">
        {/* Header Bar */}
        <div className="h-14 px-5 sm:px-6 flex items-center justify-between border-b border-[var(--theme-border-subtle)] shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--theme-text-muted)] truncate">
            <span className="capitalize text-[var(--theme-text-primary)] font-medium">
              {event.category}
            </span>
            <span>·</span>
            <span>{event.matchScore}% match</span>
            <span>·</span>
            <span>{event.distanceKm} km away</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 -mr-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {/* Cover Hero */}
          {heroImages.length > 0 && (
            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-[var(--theme-bg-base)]">
              <EventImage
                images={heroImages}
                alt={event.title}
                sizes="(max-width: 768px) 100vw, 576px"
                fallbackLabel={event.venueName}
                className="object-cover"
              />
            </div>
          )}

          {/* Title & Tagline */}
          <div className="space-y-1">
            <h2
              id="event-modal-title"
              className="text-lg sm:text-xl font-medium text-[var(--theme-text-primary)] leading-snug"
            >
              {event.title}
            </h2>
            {event.tagline && (
              <p className="text-xs sm:text-sm text-[var(--theme-text-muted)] leading-relaxed">
                {event.tagline}
              </p>
            )}
          </div>

          {/* Clean Logistics Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3.5 border-y border-[var(--theme-border-subtle)] text-xs">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-mono text-[var(--theme-text-muted)] block">
                Location
              </span>
              <p className="font-medium text-[var(--theme-text-primary)] truncate">
                {event.venueName}
              </p>
              {event.address && (
                <p className="text-[11px] text-[var(--theme-text-muted)] truncate">
                  {event.address}
                </p>
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-mono text-[var(--theme-text-muted)] block">
                Date & Time
              </span>
              <p className="font-medium text-[var(--theme-text-primary)]">
                {event.formattedDate}
              </p>
              {event.formattedTime && (
                <p className="text-[11px] text-[var(--theme-text-muted)]">
                  {event.formattedTime}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[var(--theme-text-muted)] block">
                About
              </span>
              <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {event.vibeTags && event.vibeTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {event.vibeTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-mono text-[var(--theme-text-muted)] bg-[var(--theme-bg-base)] px-2 py-0.5 rounded-md"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}

          {/* Source & Curator Info */}
          {(event.organizerName || event.sourceUrl) && (
            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[var(--theme-text-muted)]">
              {event.organizerName ? (
                <span>Curated by {event.organizerName}</span>
              ) : <div />}

              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[var(--theme-text-primary)] transition-colors"
                >
                  <span>Source</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-muted)] block">
              Admission
            </span>
            <span className="text-xs font-mono font-medium text-[var(--theme-text-primary)]">
              {event.price || 'Free'}
            </span>
          </div>

          <div>
            {isSent ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Inquired
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSendAgentMail(event)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                Inquire via AgentMail
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}