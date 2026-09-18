import { Mail, SlidersHorizontal } from 'lucide-react';
import { LocationAnchor } from './LocationAnchor';
import { Coordinates } from '@/types';

interface HeaderProps {
  onOpenDrawer: () => void;
  unreadCount: number;
  onOpenFilterDrawer: () => void;
  locationLabel: string;
  isLocating: boolean;
  onLocateMe: () => void;
  onSelectLocation: (label: string, coords?: Coordinates) => void;
  onSearchLocations?: (query: string) => Promise<any>;
  onOpenMapModal?: () => void;
  locationError?: string | null;
}

export function Header({
  onOpenDrawer,
  unreadCount,
  onOpenFilterDrawer,
  locationLabel,
  isLocating,
  onLocateMe,
  onSelectLocation,
  onSearchLocations,
  onOpenMapModal,
  locationError,
}: HeaderProps) {
  return (
    <header className="relative z-10 w-full px-6 sm:px-8 py-5 sm:py-7 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="font-serif text-2xl tracking-tight text-[var(--theme-text-primary)]">
          SideDoor
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--theme-brand-primary)] animate-pulse"
          title="Firecrawl active"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Location Anchor & Locate Me Control */}
        <LocationAnchor
          locationLabel={locationLabel}
          isLocating={isLocating}
          onLocateMe={onLocateMe}
          onSelectLocation={onSelectLocation}
          onSearchLocations={onSearchLocations}
          onOpenMapModal={onOpenMapModal}
          error={locationError}
        />

        {/* Scout Tuning Filter Button */}
        <button
          type="button"
          onClick={onOpenFilterDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition border border-[var(--theme-border-subtle)] shadow-xs cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span className="hidden sm:inline">Tuning</span>
        </button>

        {/* AgentMail Correspondence Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition border border-[var(--theme-border-subtle)] shadow-xs cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span className="hidden sm:inline">Correspondence</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] font-mono text-[var(--text-2xs)] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
