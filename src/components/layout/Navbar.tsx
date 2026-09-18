import { Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type ViewMode = 'split' | 'map' | 'feed';

interface NavbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  unreadMailCount: number;
  onOpenMail: () => void;
  onOpenAgentLogs: () => void;
  isScouting: boolean;
}

export function Navbar({
  viewMode,
  onViewModeChange,
  unreadMailCount,
  onOpenMail,
  onOpenAgentLogs,
  isScouting,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-[#fafaf9]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        {/* Editorial Masthead */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-serif text-2xl tracking-tight text-stone-900 font-semibold italic">
              SideDoor
            </span>
            <span className="text-[11px] font-sans uppercase tracking-widest text-stone-400 font-medium hidden sm:inline">
              Dispatch No. 04
            </span>
          </div>

          <div className="hidden md:flex items-center pl-4 border-l border-stone-200 text-xs text-stone-500">
            <span>Local Indie Music, Print & Gathering Scout</span>
          </div>
        </div>

        {/* View Switcher */}
        <div className="hidden md:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-sans">
          <button
            onClick={() => onViewModeChange('split')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => onViewModeChange('feed')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'feed'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Index Feed
          </button>
        </div>

        {/* Quiet Actions */}
        <div className="flex items-center gap-2">
          {/* Scout Activity Terminal / Field Notes */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAgentLogs}
            leftIcon={<FileText className="w-3.5 h-3.5 text-stone-600" />}
          >
            <span className="hidden sm:inline">Field Notes</span>
            {isScouting && (
              <span className="w-1.5 h-1.5 rounded-full bg-stone-900 animate-ping" />
            )}
          </Button>

          {/* AgentMail Correspondence Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenMail}
            leftIcon={<Mail className="w-3.5 h-3.5" />}
          >
            <span>Correspondence</span>
            {unreadMailCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-stone-950 font-mono text-[10px] font-bold">
                {unreadMailCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
