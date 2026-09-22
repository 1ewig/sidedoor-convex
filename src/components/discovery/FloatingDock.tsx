import { ArrowRight, Loader2, Sparkles, CornerDownLeft } from 'lucide-react';

export interface FloatingDockProps {
  prompt: string;
  isScouting?: boolean;
  onPromptChange: (val: string) => void;
  onTriggerDiscovery: () => void;
  onSelectSuggestion?: (suggestion: string) => void;
}

const INSPIRATION_CHIPS = [
  'analog synth meetup',
  'candlelit cello',
  'indie art vernissage',
  'secret courtyard jazz',
  'artisan zine fair',
];

export function FloatingDock({
  prompt,
  isScouting = false,
  onPromptChange,
  onTriggerDiscovery,
  onSelectSuggestion,
}: FloatingDockProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScouting) {
      e.preventDefault();
      onTriggerDiscovery();
    }
  };

  const handleChipClick = (suggestion: string) => {
    if (isScouting) return;
    onPromptChange(suggestion);
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto space-y-3.5">
      {/* Ultra-Minimal Unified Fast Scout Dock */}
      <div
        className={`bg-[var(--theme-bg-surface)] rounded-full pl-5 pr-2 py-2 sm:pl-6 sm:pr-2.5 sm:py-2.5 shadow-[var(--shadow-ambient)] border transition-all duration-200 flex items-center gap-2.5 sm:gap-3 ${
          isScouting
            ? 'border-[var(--theme-text-primary)]/40 ring-2 ring-[var(--theme-text-primary)]/10 shadow-[var(--shadow-float)]'
            : 'border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] focus-within:border-[var(--theme-text-primary)]/40 focus-within:shadow-[var(--shadow-float)]'
        }`}
      >
        <Sparkles className="w-4 h-4 text-[var(--theme-text-muted)] shrink-0 opacity-70" />

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
          placeholder={
            isScouting
              ? 'Running ⚡ Fast single-pass calendar scan...'
              : 'What kind of gatherings are you scouting for?'
          }
        />

        {/* Enter key hint when prompt is present and idle */}
        {prompt.trim().length > 0 && !isScouting && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] px-1.5 py-0.5 rounded bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] shrink-0">
            <span>return</span>
            <CornerDownLeft className="w-3 h-3" />
          </span>
        )}

        {/* Action Trigger Button */}
        <button
          type="button"
          disabled={isScouting}
          onClick={onTriggerDiscovery}
          aria-label={isScouting ? 'Scouting in progress' : 'Discover Gatherings'}
          className={`w-8 h-8 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] flex items-center justify-center transition-all shadow-xs shrink-0 ${
            isScouting
              ? 'opacity-80 cursor-wait'
              : 'hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer'
          }`}
        >
          {isScouting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Subtle Inspiration Prompt Chips */}
      {!isScouting && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
          <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] mr-0.5 hidden sm:inline">
            try:
          </span>
          {INSPIRATION_CHIPS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleChipClick(suggestion)}
              className="text-[var(--text-2xs)] font-sans px-2.5 py-1 rounded-full bg-[var(--theme-bg-surface)]/70 hover:bg-[var(--theme-bg-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
