import Image from 'next/image';
import { MapPin, Sparkles, Clock, Mail, ExternalLink, Ticket, Check } from 'lucide-react';
import { LocalEvent } from '@/types';

interface EventCardProps {
    event: LocalEvent;
    onSendAgentMail: (event: LocalEvent) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
    music: 'bg-[var(--theme-status-info)]/10 text-[var(--theme-status-info)] border-[var(--theme-status-info)]/20',
    art: 'bg-[var(--theme-brand-accent)]/10 text-[var(--theme-brand-accent)] border-[var(--theme-brand-accent)]/20',
    market: 'bg-[var(--theme-status-warning)]/10 text-[var(--theme-status-warning)] border-[var(--theme-status-warning)]/20',
    nightlife: 'bg-[var(--theme-text-primary)]/10 text-[var(--theme-text-primary)] border-[var(--theme-text-primary)]/20',
    food: 'bg-[var(--theme-status-danger)]/10 text-[var(--theme-status-danger)] border-[var(--theme-status-danger)]/20',
    community: 'bg-[var(--theme-brand-primary)]/10 text-[var(--theme-brand-primary)] border-[var(--theme-brand-primary)]/20',
};

export function EventCard({ event, onSendAgentMail }: EventCardProps) {
    const isSent = event.outreachStatus === 'sent' || event.outreachStatus === 'replied';
    const categoryClass = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.music;

    return (
        <article className="group bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] p-5 rounded-2xl shadow-[var(--shadow-float)] transition-all duration-200 flex flex-col gap-3.5 text-left">
            {/* Meta Top: Category + Match Score + Distance + Price */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Category */}
                    <span
                        className={`text-[var(--text-2xs)] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryClass}`}
                    >
                        {event.category}
                    </span>

                    {/* Vibe Match Score */}
                    <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-brand-accent)] bg-[var(--theme-brand-accent)]/10 px-2 py-0.5 rounded-full font-medium border border-[var(--theme-brand-accent)]/20">
                        <Sparkles className="w-3 h-3" />
                        {event.matchScore}% Match
                    </span>

                    {/* Distance */}
                    <span className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-mono">
                        {event.distanceKm} km away
                    </span>
                </div>

                {/* Price Tag */}
                <div className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-medium font-sans text-[var(--theme-text-secondary)] bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] px-2 py-0.5 rounded-full">
                    <Ticket className="w-3 h-3 text-[var(--theme-text-muted)]" />
                    <span>{event.price}</span>
                </div>
            </div>

            {/* Event Cover Photo / Flyer */}
            {event.coverImage && (
                <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)]">
                    <Image
                        src={event.coverImage}
                        alt={event.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 672px"
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                </div>
            )}

            {/* Title & Tagline */}
            <div>
                <h3 className="font-serif text-[var(--text-base)] font-semibold text-[var(--theme-text-primary)] leading-[var(--leading-snug)] group-hover:text-[var(--theme-brand-accent)] transition-colors">
                    {event.title}
                </h3>
                {event.tagline && (
                    <p className="font-serif italic text-[var(--text-xs)] text-[var(--theme-text-secondary)] mt-0.5 leading-[var(--leading-snug)]">
                        &ldquo;{event.tagline}&rdquo;
                    </p>
                )}
            </div>

            {/* Overview / Description */}
            {event.description && (
                <p className="text-[var(--text-xs)] text-[var(--theme-text-secondary)] leading-[var(--leading-relaxed)] font-sans">
                    {event.description}
                </p>
            )}

            {/* Venue, Address & Time details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-sans">
                {/* Venue & Address */}
                <div className="flex items-start gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[var(--theme-brand-accent)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <span className="font-medium text-[var(--theme-text-primary)] block truncate">
                            {event.venueName}
                        </span>
                        <span className="text-[var(--theme-text-muted)] block truncate">
                            {event.address}
                        </span>
                    </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-start gap-1.5 min-w-0 sm:justify-end">
                    <Clock className="w-3.5 h-3.5 text-[var(--theme-text-muted)] shrink-0 mt-0.5" />
                    <div className="min-w-0 sm:text-right">
                        <span className="font-medium text-[var(--theme-text-primary)] block truncate">
                            {event.formattedDate}
                        </span>
                        <span className="text-[var(--theme-text-muted)] block truncate">
                            {event.formattedTime}
                        </span>
                    </div>
                </div>
            </div>

            {/* Vibe Tags */}
            {event.vibeTags && event.vibeTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {event.vibeTags.map((tag) => (
                        <span
                            key={tag}
                            className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] bg-[var(--theme-bg-base)] px-2 py-0.5 rounded-md border border-[var(--theme-border-subtle)]"
                        >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                    ))}
                </div>
            )}

            {/* Bottom Bar: Source / Organizer & Outreach Action */}
            <div className="pt-2 border-t border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-3">
                {/* Source / Organizer Info */}
                <div className="flex items-center gap-2 min-w-0 text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-mono">
                    {event.organizerName && (
                        <span className="truncate" title={`Host: ${event.organizerName}`}>
                            Curated by {event.organizerName}
                        </span>
                    )}
                    {event.sourceUrl && (
                        <a
                            href={event.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors underline truncate"
                            title={event.sourceUrl}
                        >
                            <span>source</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                    )}
                </div>

                {/* Action Button */}
                {isSent ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-xs)] font-mono text-[var(--theme-brand-accent)] bg-[var(--theme-brand-accent)]/10 border border-[var(--theme-brand-accent)]/20 rounded-full shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        Inquired via AgentMail
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => onSendAgentMail(event)}
                        className="group/btn inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[var(--text-xs)] font-medium rounded-full bg-[var(--theme-text-primary)] hover:bg-[var(--theme-brand-accent)] text-[var(--theme-bg-surface)] hover:shadow-xs transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-accent)]"
                    >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Contact Organizer</span>
                    </button>
                )}
            </div>
        </article>
    );
}
