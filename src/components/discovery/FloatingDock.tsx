import { ArrowRight } from 'lucide-react';

interface FloatingDockProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onTriggerDiscovery: () => void;
}

export function FloatingDock({
  prompt,
  onPromptChange,
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
      {/* Ultra-Minimal Unified Dock */}
      <div className="bg-[var(--theme-bg-surface)] rounded-full pl-5 pr-2 py-2 sm:pl-6 sm:pr-2.5 sm:py-2.5 shadow-[var(--shadow-ambient)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] transition-all focus-within:border-[var(--theme-text-primary)]/40 focus-within:shadow-[var(--shadow-float)] flex items-center gap-3">
        {/* Input */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[var(--text-sm)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none min-w-0 font-sans"
          placeholder="What kind of gatherings are you scouting for?"
        />

        {/* Action Trigger Button */}
        <button
          type="button"
          onClick={onTriggerDiscovery}
          aria-label="Discover Gatherings"
          className="w-8 h-8 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
