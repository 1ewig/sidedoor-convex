import { Mail, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  onOpenDrawer: () => void;
  unreadCount: number;
  onOpenFilterDrawer: () => void;
}

export function Header({ onOpenDrawer, unreadCount, onOpenFilterDrawer }: HeaderProps) {
  return (
    <header className="relative z-10 w-full px-8 py-7 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-serif text-2xl tracking-tight text-[var(--theme-text-primary)]">
          SideDoor
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--theme-brand-primary)] animate-pulse"
          title="Firecrawl active"
        />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Scout Tuning Filter Button */}
        <button
          type="button"
          onClick={onOpenFilterDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition border border-[var(--theme-border-subtle)] shadow-xs cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span>Tuning</span>
        </button>

        {/* AgentMail Correspondence Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition border border-[var(--theme-border-subtle)] shadow-xs cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span>Correspondence</span>
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
