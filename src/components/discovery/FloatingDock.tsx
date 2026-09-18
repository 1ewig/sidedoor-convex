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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onTriggerDiscovery();
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Minimal Unified Dock */}
      <div className="bg-[var(--theme-bg-surface)] rounded-full px-3 py-2 sm:px-4 sm:py-2.5 shadow-[var(--shadow-ambient)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] transition-all focus-within:border-[var(--theme-text-primary)]/40 focus-within:shadow-[var(--shadow-float)] flex items-center gap-2.5">
        {/* Scouts Count Chip */}
        <button
          type="button"
          onClick={onToggleResults}
          title="Toggle discovered scouts feed"
          className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--theme-bg-base)] text-[var(--text-2xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-border-subtle)] transition cursor-pointer"
        >
          {totalScouts} scouts
        </button>

        {/* Input */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[var(--text-sm)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none min-w-0 font-sans"
          placeholder="What kind of gatherings are you scouting for?"
        />

        {/* Controls & Submit */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Radius Button */}
          <button
            type="button"
            onClick={onCycleRadius}
            title="Search Perimeter"
            className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-[var(--theme-bg-base)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] text-[var(--text-2xs)] font-mono transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{radiusLabel}</span>
          </button>

          {/* Auto-Inquire Toggle */}
          <button
            type="button"
            onClick={onToggleAutoInquire}
            title={autoInquire ? 'Auto-Inquire via AgentMail: Active' : 'Auto-Inquire via AgentMail: Off'}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[var(--text-2xs)] transition cursor-pointer ${
              autoInquire
                ? 'bg-[var(--theme-brand-accent)]/10 text-[var(--theme-brand-accent)] font-medium'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-base)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={onTriggerDiscovery}
            aria-label="Discover Gatherings"
            className="w-8 h-8 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
