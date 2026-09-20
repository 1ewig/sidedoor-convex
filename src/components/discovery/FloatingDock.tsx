import { ArrowRight, Loader2 } from 'lucide-react';

interface FloatingDockProps {
  prompt: string;
  isScouting?: boolean;
  onPromptChange: (val: string) => void;
  onTriggerDiscovery: () => void;
}

export function FloatingDock({
  prompt,
  isScouting = false,
  onPromptChange,
  onTriggerDiscovery,
}: FloatingDockProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScouting) {
      e.preventDefault();
      onTriggerDiscovery();
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Ultra-Minimal Unified Dock */}
      <div
        className={`bg-[var(--theme-bg-surface)] rounded-full pl-5 pr-2 py-2 sm:pl-6 sm:pr-2.5 sm:py-2.5 shadow-[var(--shadow-ambient)] border transition-all flex items-center gap-3 ${
          isScouting
            ? 'border-[var(--theme-text-primary)]/40 ring-1 ring-[var(--theme-text-primary)]/10 shadow-[var(--shadow-float)]'
            : 'border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] focus-within:border-[var(--theme-text-primary)]/40 focus-within:shadow-[var(--shadow-float)]'
        }`}
      >
        {/* Input */}
        <input
          id="scout-prompt-input"
          name="query"
          type="text"
          value={prompt}
          disabled={isScouting}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[var(--text-sm)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none min-w-0 font-sans disabled:opacity-60"
          placeholder={isScouting ? 'Scouting underground sources & calendars...' : 'What kind of gatherings are you scouting for?'}
        />

        {/* Action Trigger Button */}
        <button
          type="button"
          disabled={isScouting}
          onClick={onTriggerDiscovery}
          aria-label={isScouting ? 'Scouting in progress' : 'Discover Gatherings'}
          className={`w-8 h-8 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] flex items-center justify-center transition-all shadow-xs shrink-0 ${
            isScouting
              ? 'opacity-80 cursor-wait'
              : 'hover:opacity-90 active:scale-95 cursor-pointer'
          }`}
        >
          {isScouting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
