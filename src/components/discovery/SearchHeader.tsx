import { Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchFilterState } from '@/types';

interface SearchHeaderProps {
  filters: SearchFilterState;
  onFilterChange: (partial: Partial<SearchFilterState>) => void;
  onTriggerScout: (customPrompt?: string) => void;
  isScouting: boolean;
  totalFound: number;
}

const CURATED_PROMPTS = [
  'Indie rock & DIY basement gigs',
  'Outdoor night fleas & vinyl',
  'Gallery vernissages & kinetic art',
  'Micro-brewery vinyl sessions',
];

export function SearchHeader({
  filters,
  onFilterChange,
  onTriggerScout,
  isScouting,
  totalFound,
}: SearchHeaderProps) {
  const categories = [
    { id: 'all', label: 'All Disciplines' },
    { id: 'music', label: 'Live Sets' },
    { id: 'market', label: 'Markets & Fleas' },
    { id: 'art', label: 'Galleries' },
    { id: 'nightlife', label: 'Gatherings' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onTriggerScout(filters.query);
    }
  };

  return (
    <section className="w-full bg-white border-b border-stone-200 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Editorial Natural Language Search Prompt */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus-within:border-stone-400 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-stone-400 mr-3 shrink-0" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => onFilterChange({ query: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to experience this weekend..."
                className="w-full bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none font-sans"
              />
              {filters.query && (
                <button
                  onClick={() => onFilterChange({ query: '' })}
                  className="text-xs text-stone-400 hover:text-stone-700 mr-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => onTriggerScout(filters.query)}
            isLoading={isScouting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shrink-0 h-11 px-5"
          >
            {isScouting ? 'Scouting...' : 'Discover'}
          </Button>
        </div>

        {/* Curated Prompt Suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-400 font-serif italic text-xs mr-1">
            Inquiries:
          </span>
          {CURATED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                onFilterChange({ query: prompt });
                onTriggerScout(prompt);
              }}
              className="text-xs text-stone-600 hover:text-stone-950 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200/70 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Category Filter Tabs & Restrained Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100 text-xs">
          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ category: cat.id })}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  filters.category === cat.id
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Controls: Radius & Free entry */}
          <div className="flex items-center gap-5">
            {/* Radius slider */}
            <div className="flex items-center gap-2 text-stone-600">
              <span className="text-stone-400">Within:</span>
              <input
                type="range"
                min={2}
                max={50}
                step={2}
                value={filters.radiusKm}
                onChange={(e) => onFilterChange({ radiusKm: Number(e.target.value) })}
                className="w-20 sm:w-28 accent-stone-900 cursor-pointer"
              />
              <span className="font-mono text-stone-900 font-medium min-w-[3rem]">
                {filters.radiusKm} km
              </span>
            </div>

            {/* Free entry toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-stone-600 hover:text-stone-900">
              <input
                type="checkbox"
                checked={filters.onlyFree}
                onChange={(e) => onFilterChange({ onlyFree: e.target.checked })}
                className="rounded border-stone-300 text-stone-900 focus:ring-0 accent-stone-900 cursor-pointer"
              />
              <span>Free only</span>
            </label>

            <span className="text-stone-400 font-mono text-[11px] hidden sm:inline">
              {totalFound} entries
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
