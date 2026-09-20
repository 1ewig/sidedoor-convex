'use client';

import { useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Sparkles,
  Ticket,
  Mail,
  Check,
  ExternalLink,
} from 'lucide-react';
import { LocalEvent } from '@/types';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { EventImage } from '@/components/ui/EventImage';

interface EventDetailModalProps {
  event: LocalEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSendAgentMail: (event: LocalEvent) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  music: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  art: 'bg-[var(--theme-text-primary)]/5 text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  market: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  nightlife: 'bg-[var(--theme-text-primary)]/10 text-[var(--theme-text-primary)] border-[var(--theme-text-primary)]/20',
  food: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
  community: 'bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]',
};

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
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const isSent = event.outreachStatus === 'sent' || event.outreachStatus === 'replied';
  const categoryClass = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.music;
  const heroImages =
    event.coverImages && event.coverImages.length > 0
      ? event.coverImages
      : event.coverImage
      ? [event.coverImage]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop overlay button */}
      <button
        type="button"
        aria-label="Close modal backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[var(--theme-bg-overlay)] backdrop-blur-md cursor-default border-none p-0 -z-10"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-[var(--shadow-ambient)] overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[var(--text-2xs)] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${categoryClass}`}
            >
              {event.category}
            </span>

            <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-text-primary)] bg-[var(--theme-text-primary)]/5 px-2.5 py-0.5 rounded-full font-medium border border-[var(--theme-border-subtle)]">
              <Sparkles className="w-3 h-3 text-[var(--theme-text-muted)]" />
              {event.matchScore}% Match
            </span>

            <span className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-mono">
              {event.distanceKm} km away
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close event modal"
            className="w-8 h-8 rounded-full bg-[var(--theme-bg-base)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {/* Flyer / Hero Image (resilient, walks candidates) */}
          {heroImages.length > 0 && (
            <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)]">
              <EventImage
                images={heroImages}
                alt={event.title}
                sizes="(max-width: 768px) 100vw, 672px"
                fallbackLabel={event.venueName}
                className="object-cover"
              />
            </div>
          )}

          {/* Title & Tagline */}
          <div>
            <h2
              id="event-modal-title"
              className="font-serif text-[var(--text-xl)] sm:text-[var(--text-2xl)] font-semibold text-[var(--theme-text-primary)] leading-[var(--leading-tight)]"
            >
              {event.title}
            </h2>
            {event.tagline && (
              <p className="font-serif italic text-[var(--text-sm)] text-[var(--theme-text-secondary)] mt-1 leading-[var(--leading-snug)]">
                &ldquo;{event.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Logistics Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] text-[var(--text-xs)] font-sans">
            {/* Venue & Street Address */}
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-primary)] mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-[var(--theme-text-primary)] block truncate">
                  {event.venueName}
                </span>
                <span className="text-[var(--theme-text-muted)] text-[var(--text-2xs)] block truncate">
                  {event.address}
                </span>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-muted)] mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-[var(--theme-text-primary)] block truncate">
                  {event.formattedDate}
                </span>
                <span className="text-[var(--theme-text-muted)] text-[var(--text-2xs)] block truncate">
                  {event.formattedTime}
                </span>
              </div>
            </div>
          </div>

          {/* Full Description */}
          {event.description && (
            <div className="space-y-1.5">
              <h3 className="text-[var(--text-2xs)] font-mono uppercase tracking-wider text-[var(--theme-text-muted)]">
                About this Gathering
              </h3>
              <p className="text-[var(--text-sm)] text-[var(--theme-text-secondary)] leading-[var(--leading-relaxed)] font-sans">
                {event.description}
              </p>
            </div>
          )}

          {/* Vibe Tags */}
          {event.vibeTags && event.vibeTags.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[var(--text-2xs)] font-mono uppercase tracking-wider text-[var(--theme-text-muted)]">
                Vibe &amp; Aesthetics
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {event.vibeTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-secondary)] bg-[var(--theme-bg-base)] px-2.5 py-1 rounded-lg border border-[var(--theme-border-subtle)]"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Host & Source Information */}
          <div className="pt-3 border-t border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-mono">
            {event.organizerName && (
              <span>Curated by {event.organizerName}</span>
            )}
            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors underline"
              >
                <span>Original source</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
          </div>
        </div>

        {/* Modal Sticky Footer / CTA */}
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-3 shrink-0">
          <div className="inline-flex items-center gap-1.5 text-[var(--text-xs)] font-medium font-sans text-[var(--theme-text-primary)] bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] px-3 py-1.5 rounded-full">
            <Ticket className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
            <span>{event.price}</span>
          </div>

          <div>
            {isSent ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-[var(--text-xs)] font-mono text-[var(--theme-text-primary)] bg-[var(--theme-text-primary)]/5 border border-[var(--theme-border-subtle)] rounded-full">
                <Check className="w-3.5 h-3.5 text-[var(--theme-text-primary)]" />
                Inquired via AgentMail
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSendAgentMail(event)}
                className="inline-flex items-center gap-2 px-5 py-2 text-[var(--text-xs)] font-medium rounded-full bg-[var(--theme-text-primary)] hover:bg-[var(--theme-text-secondary)] text-[var(--theme-bg-surface)] hover:shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Organizer via AgentMail</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
