import { SlidersHorizontal, Link2, ArrowRight } from 'lucide-react';

interface FloatingDockProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  radiusLabel: string;
  onCycleRadius: () => void;
  autoInquire: boolean;
  onToggleAutoInquire: () => void;
  totalScouts: number;
  onToggleResults: () => void;
  onTriggerDiscovery: () => void;
}

export function FloatingDock({
  prompt,
  onPromptChange,
  radiusLabel,
  onCycleRadius,
  autoInquire,
  onToggleAutoInquire,
  totalScouts,
  onToggleResults,
  onTriggerDiscovery,
}: FloatingDockProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onTriggerDiscovery();
    }
  };

  return (
    <div className="relative w-full">
      {/* Peeking Mini Cards from Behind Dock */}
      <div className="absolute -top-7 left-8 flex items-end -space-x-4 pointer-events-none transition-transform duration-300 hover:-translate-y-1">
        {/* Stub 1 */}
        <div className="w-16 h-10 bg-[var(--theme-bg-surface)]/95 rounded-t-lg border border-[var(--theme-border-subtle)] shadow-xs transform -rotate-6 flex flex-col justify-end p-1.5 opacity-70">
          <div className="w-6 h-1 bg-[var(--theme-border-strong)] rounded mb-1" />
          <div className="w-8 h-1 bg-[var(--theme-border-subtle)] rounded" />
        </div>
        {/* Stub 2 */}
        <div className="w-16 h-11 bg-[var(--theme-bg-surface)]/95 rounded-t-lg border border-[var(--theme-border-subtle)] shadow-xs transform rotate-2 flex flex-col justify-end p-1.5 opacity-90">
          <div className="w-7 h-1 bg-[var(--theme-border-strong)] rounded mb-1" />
          <div className="w-10 h-1 bg-[var(--theme-border-subtle)] rounded" />
        </div>
        {/* Stub 3 (Active) */}
        <div className="w-20 h-12 bg-[var(--theme-bg-surface)] rounded-t-lg border border-[var(--theme-border-subtle)] shadow-xs transform -rotate-2 flex flex-col justify-between p-2 z-0">
          <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-brand-accent)] uppercase font-semibold tracking-wider">
            98% Match
          </span>
          <div className="w-10 h-1 bg-[var(--theme-border-strong)] rounded" />
        </div>
      </div>

      {/* Main Dock Container */}
      <div className="relative z-10 w-full bg-[var(--theme-bg-surface)] rounded-[32px] p-4 sm:p-5 shadow-[var(--shadow-ambient)] border border-[var(--theme-border-subtle)] transition-all focus-within:shadow-xl">
        {/* Top row: Status Tag & Natural Language Input */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleResults}
            className="shrink-0 px-2.5 py-1 mt-0.5 rounded-full bg-[var(--theme-bg-base)] text-[var(--text-2xs)] font-medium text-[var(--theme-text-secondary)] hover:bg-[var(--theme-border-subtle)] transition cursor-pointer"
          >
            {totalScouts} scouts
          </button>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[var(--text-sm)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none resize-none pt-0.5 leading-[var(--leading-relaxed)] font-sans"
            placeholder="Indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend..."
          />
        </div>

        {/* Bottom row: Controls & Action Trigger */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--theme-border-subtle)]">
          <div className="flex items-center gap-3">
            {/* Radius Button */}
            <button
              type="button"
              onClick={onCycleRadius}
              title="Search Perimeter"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] text-[var(--text-xs)] transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-mono text-[var(--text-2xs)]">{radiusLabel}</span>
            </button>

            {/* AgentMail Auto-Dispatch Indicator */}
            <button
              type="button"
              onClick={onToggleAutoInquire}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[var(--text-xs)] transition cursor-pointer ${
                autoInquire
                  ? 'text-[var(--theme-brand-accent)]'
                  : 'text-[var(--theme-text-muted)] opacity-50 hover:opacity-80'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span className="text-[var(--text-2xs)]">Auto-Inquire</span>
            </button>
          </div>

          {/* Circular Arrow Action Button */}
          <button
            type="button"
            onClick={onTriggerDiscovery}
            aria-label="Discover Gatherings"
            className="w-10 h-10 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
