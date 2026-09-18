import { ScoutLog } from '@/types';
import { FileText, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ScoutLog[];
  isScouting: boolean;
  onTriggerScout: () => void;
}

export function AgentDrawer({
  isOpen,
  onClose,
  logs,
  isScouting,
  onTriggerScout,
}: AgentDrawerProps) {
  if (!isOpen) return null;

  const getLogBadge = (level: ScoutLog['level']) => {
    switch (level) {
      case 'scrape':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'ai':
        return 'bg-stone-100 text-stone-900 border-stone-300 font-semibold';
      case 'mail':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'success':
        return 'bg-stone-900 text-white border-stone-900';
      default:
        return 'bg-stone-50 text-stone-500 border-stone-200';
    }
  };

  return (
    <aside className="fixed bottom-0 right-0 z-50 w-full sm:w-[500px] max-h-[85vh] bg-white border-t sm:border-l border-stone-300 shadow-2xl flex flex-col animate-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/70">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-stone-700" />
          <div>
            <h3 className="text-sm font-serif font-medium text-stone-900 flex items-center gap-2">
              <span>Scout Field Notes & Logs</span>
              {isScouting && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                  Scouting...
                </span>
              )}
            </h3>
            <p className="text-[11px] text-stone-500 font-sans">
              Firecrawl crawling trace, markdown extraction & AI evaluations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTriggerScout}
            isLoading={isScouting}
            rightIcon={<Play className="w-3 h-3" />}
          >
            Run Cycle
          </Button>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log List */}
      <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs flex-1 max-h-[500px] bg-stone-50/30">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3.5 rounded-lg bg-white border border-stone-200 space-y-1.5 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${getLogBadge(log.level)}`}>
                {log.level}
              </span>
              <span className="text-stone-400">{log.timestamp}</span>
            </div>

            <p className="text-stone-800 font-sans text-xs leading-relaxed">
              {log.message}
            </p>

            {log.details && (
              <div className="p-2.5 rounded bg-stone-50 border border-stone-150 text-stone-600 text-[11px] font-mono leading-relaxed">
                {log.details}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500 font-mono">
        <span>Convex Reactive Sync: Active</span>
        <span>Every 15 mins</span>
      </div>
    </aside>
  );
}
