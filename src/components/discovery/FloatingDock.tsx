import { ArrowRight, Loader2, Zap, Compass } from 'lucide-react';
import { ScoutEngineMode } from '@/types';

interface FloatingDockProps {
  prompt: string;
  scoutMode?: ScoutEngineMode;
  isScouting?: boolean;
  onPromptChange: (val: string) => void;
  onToggleMode?: (mode: ScoutEngineMode) => void;
  onTriggerDiscovery: () => void;
}

export function FloatingDock({
  prompt,
  scoutMode = 'fast',
  isScouting = false,
  onPromptChange,
  onToggleMode,
  onTriggerDiscovery,
}: FloatingDockProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScouting) {
      e.preventDefault();
      onTriggerDiscovery();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Ultra-Minimal Unified Dock */}
      <div
        className={`bg-[var(--theme-bg-surface)] rounded-full pl-5 pr-2 py-2 sm:pl-6 sm:pr-2.5 sm:py-2.5 shadow-[var(--shadow-ambient)] border transition-all flex items-center gap-2.5 sm:gap-3 ${
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
          placeholder={
            isScouting
              ? scoutMode === 'fast'
                ? 'Running ⚡ Fast single-pass calendar scan...'
                : 'Scouting underground sources & calendars...'
              : 'What kind of gatherings are you scouting for?'
          }
        />

        {/* Engine Mode Toggle Pill */}
        {onToggleMode && (
          <div
            aria-label="Discovery engine mode"
            className="flex items-center p-0.5 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] shrink-0"
          >
            <button
              type="button"
              aria-pressed={scoutMode === 'fast'}
              disabled={isScouting}
              onClick={() => onToggleMode('fast')}
              title="Fast Scout: Single-pass scan in ~10s"
              className={`px-2.5 py-1 rounded-full text-[var(--text-2xs)] font-mono flex items-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--theme-text-primary)]/30 ${
                scoutMode === 'fast'
                  ? 'bg-[var(--theme-bg-surface)] text-[var(--theme-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              <Zap className="w-3 h-3 text-[var(--theme-brand-primary)]" />
              <span className="hidden sm:inline">Fast</span>
            </button>
            <button
              type="button"
              aria-pressed={scoutMode === 'deep'}
              disabled={isScouting}
              onClick={() => onToggleMode('deep')}
              title="Deep Scout: Exhaustive multi-angle crawl & hub mapping"
              className={`px-2.5 py-1 rounded-full text-[var(--text-2xs)] font-mono flex items-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--theme-text-primary)]/30 ${
                scoutMode === 'deep'
                  ? 'bg-[var(--theme-bg-surface)] text-[var(--theme-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              <Compass className="w-3 h-3 text-[var(--theme-text-secondary)]" />
              <span className="hidden sm:inline">Deep</span>
            </button>
          </div>
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
