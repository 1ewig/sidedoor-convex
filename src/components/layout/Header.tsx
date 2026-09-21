import Link from 'next/link';
import { Mail, SlidersHorizontal } from 'lucide-react';
import { LocationAnchor } from '@/components/location/LocationAnchor';
import { Coordinates } from '@/types';

interface HeaderProps {
  currentTab?: 'studio' | 'radar';
  onOpenDrawer?: () => void;
  unreadCount?: number;
  onOpenFilterDrawer?: () => void;
  locationLabel: string;
  coordinates?: Coordinates;
  isLocating?: boolean;
  onLocateMe: () => void;
  onOpenMapModal?: () => void;
  locationError?: string | null;
}

export function Header({
  currentTab = 'studio',
  onOpenDrawer,
  unreadCount = 0,
  onOpenFilterDrawer,
  locationLabel,
  coordinates,
  isLocating = false,
  onLocateMe,
  onOpenMapModal,
  locationError,
}: HeaderProps) {
  return (
    <header className="relative z-30 w-full px-6 sm:px-8 py-5 sm:py-7 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <Link href="/main" className="flex items-center group cursor-pointer focus-visible:outline-none">
          <span className="font-serif text-2xl tracking-tight text-[var(--theme-text-primary)]">
            SideDoor
          </span>
        </Link>

        {/* Studio / Public Radar Navigation Switcher */}
        <nav
          aria-label="Views"
          className="flex items-center p-0.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-xs)]"
        >
          <Link
            href="/main"
            className={`px-3 py-1 rounded-full transition-all duration-150 ${
              currentTab === 'studio'
                ? 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] font-medium shadow-xs'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            Studio
          </Link>
          <Link
            href="/radar"
            className={`px-3 py-1 rounded-full transition-all duration-150 ${
              currentTab === 'radar'
                ? 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] font-medium shadow-xs'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            Radar
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Location Anchor & Locate Me Control */}
        <LocationAnchor
          locationLabel={locationLabel}
          coordinates={coordinates}
          isLocating={isLocating}
          onLocateMe={onLocateMe}
          onOpenMapModal={onOpenMapModal}
          error={locationError}
        />

        {/* Scout Tuning Filter Button */}
        <button
          type="button"
          onClick={onOpenFilterDrawer}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:border-[var(--theme-border-strong)] hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-150 border border-[var(--theme-border-subtle)] shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] transition-colors" />
          <span className="hidden sm:inline">Tuning</span>
        </button>

        {/* AgentMail Outbox Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:border-[var(--theme-border-strong)] hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-150 border border-[var(--theme-border-subtle)] shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
        >
          <Mail className="w-3.5 h-3.5 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] transition-colors" />
          <span className="hidden sm:inline">Outbox</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] font-mono text-[var(--text-2xs)] flex items-center justify-center transition-colors">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
