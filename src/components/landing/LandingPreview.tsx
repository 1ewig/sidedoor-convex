import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Sparkles, MapPin, Calendar, MessageCircle } from 'lucide-react';

interface SampleCardData {
  title: string;
  tagline: string;
  venueName: string;
  distance: string;
  date: string;
  time: string;
  category: string;
  price: string;
  matchScore: number;
  vibeTags: string[];
}

const SAMPLE_GATHERINGS: SampleCardData[] = [
  {
    title: 'Ambient Tape Loops & Analog Modulations',
    tagline: 'Quadraphonic listening session with local synthesizer artisans.',
    venueName: 'The Crypt Studio',
    distance: '1.4 km',
    date: 'Friday',
    time: '9:00 PM',
    category: 'music',
    price: 'Free',
    matchScore: 98,
    vibeTags: ['#TapeLoops', '#Listening'],
  },
  {
    title: 'Midnight Kiln Opening & Natural Wine',
    tagline: 'Fresh raku pottery paired with low-intervention wines.',
    venueName: 'Komorebi Ceramics',
    distance: '2.8 km',
    date: 'Saturday',
    time: '10:00 PM',
    category: 'art',
    price: '$12',
    matchScore: 95,
    vibeTags: ['#Ceramics', '#NaturalWine'],
  },
  {
    title: 'Candlelit Bach Cello Suites in a Loft',
    tagline: 'Unamplified solo acoustic suites in an 1890s timber loft.',
    venueName: 'The Foundry Atrium',
    distance: '3.6 km',
    date: 'Sunday',
    time: '7:30 PM',
    category: 'music',
    price: '$20',
    matchScore: 93,
    vibeTags: ['#Acoustic', '#Cello'],
  },
];

export function LandingPreview() {
  return (
    <section
      id="gatherings"
      className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--theme-border-subtle)]"
    >
      {/* Header */}
      <div className="max-w-xl mb-10 text-left">
        <span className="text-[var(--text-2xs)] font-sans uppercase tracking-wider text-[var(--theme-text-muted)] block mb-1.5 font-medium">
          Scenes From The City
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-2">
          Quiet gatherings happening this weekend.
        </h2>
        <p className="text-[var(--text-xs)] sm:text-[var(--text-sm)] text-[var(--theme-text-secondary)] leading-[var(--leading-relaxed)] font-light">
          Real places, real hosts, and unadvertised rooms.
        </p>
      </div>

      {/* 3 Sample Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {SAMPLE_GATHERINGS.map((g) => (
          <div
            key={g.title}
            className="p-5 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-[var(--text-2xs)] font-sans text-[var(--theme-text-muted)] mb-2.5">
                <span className="capitalize font-medium text-[var(--theme-text-secondary)] px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-base)]">
                  {g.category}
                </span>
                <span className="flex items-center gap-1 text-[var(--theme-text-primary)] font-medium">
                  <Sparkles className="w-3 h-3 text-[var(--theme-brand-primary)]" />
                  {g.matchScore}%
                </span>
              </div>

              <h3 className="font-serif text-[var(--text-base)] text-[var(--theme-text-primary)] font-medium leading-snug mb-1.5 group-hover:text-[var(--theme-brand-accent)] transition-colors">
                {g.title}
              </h3>
              <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] leading-relaxed mb-3">
                {g.tagline}
              </p>

              <div className="flex flex-wrap gap-1 mb-3">
                {g.vibeTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[var(--text-2xs)] font-sans text-[var(--theme-text-muted)] px-2 py-0.5 rounded bg-[var(--theme-bg-base)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--theme-border-subtle)] space-y-1 text-[var(--text-2xs)]">
              <div className="flex items-center justify-between text-[var(--theme-text-secondary)]">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[var(--theme-text-muted)] shrink-0" />
                  <span className="truncate">{g.venueName}</span>
                </span>
                <span className="text-[var(--theme-text-muted)] shrink-0 font-mono">
                  {g.distance}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--theme-text-muted)]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{g.date} · {g.time}</span>
                </span>
                <span className="text-[var(--theme-text-primary)] font-medium">
                  {g.price}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Host Connection Card */}
      <div
        id="the-hosts"
        className="p-5 sm:p-7 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-xs"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--theme-border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-text-primary)]">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-[var(--text-xs)] font-serif text-[var(--theme-text-primary)] font-medium">
                Direct Host Contact
              </h4>
              <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans">
                Save a spot with the person opening their doors.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--theme-status-success)]/10 text-[var(--theme-status-success)] text-[var(--text-2xs)] font-sans font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Spot Saved</span>
          </div>
        </div>

        {/* Conversation Preview */}
        <div className="py-4 space-y-3 max-w-xl">
          <div className="flex flex-col items-end">
            <div className="p-3 rounded-xl rounded-tr-xs bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] text-[var(--text-xs)] text-[var(--theme-text-primary)] leading-relaxed">
              Hi Elena! Hoping to stop by Friday. Are cushions still open for walk-ins?
            </div>
          </div>

          <div className="flex flex-col items-start">
            <div className="p-3 rounded-xl rounded-tl-xs bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] text-[var(--text-xs)] leading-relaxed">
              Yes, plenty left! Doors open at 8:30 PM with hot tea ready. See you Friday!
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--theme-border-subtle)] flex items-center justify-between text-[var(--text-xs)]">
          <span className="text-[var(--theme-text-muted)] text-[var(--text-2xs)] font-sans">
            Personalized directly for each space.
          </span>
          <Link
            href="/main"
            className="inline-flex items-center gap-1 font-medium text-[var(--theme-text-primary)] hover:underline text-[var(--text-xs)]"
          >
            <span>Ask a host in Studio</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
