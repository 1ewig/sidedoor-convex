import { LocalEvent } from '@/types';
import { Button } from '@/components/ui/Button';
import { ArrowUpRight, Mail } from 'lucide-react';

interface EventCardProps {
  event: LocalEvent;
  isSelected: boolean;
  onSelect: (event: LocalEvent) => void;
  onAskOrganizer: (event: LocalEvent) => void;
}

export function EventCard({
  event,
  isSelected,
  onSelect,
  onAskOrganizer,
}: EventCardProps) {
  return (
    <article
      className={`group flex flex-col justify-between p-5 rounded-xl border bg-white transition-all duration-150 ${
        isSelected
          ? 'border-stone-900 ring-1 ring-stone-900 shadow-sm'
          : 'border-stone-200 hover:border-stone-400'
      }`}
    >
      <div className="space-y-4">
        {/* Card Header Media & Tag */}
        <div className="relative h-44 w-full rounded-lg overflow-hidden bg-stone-100 border border-stone-100">
          {event.coverImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full bg-stone-200" />
          )}

          {/* Quiet Score Pill */}
          <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-mono text-stone-800 border border-stone-200 font-medium">
            {event.matchScore}% vibe match
          </div>

          <div className="absolute bottom-2.5 left-2.5 bg-stone-900/90 text-white px-2 py-0.5 rounded text-[11px] font-sans font-medium">
            {event.price}
          </div>
        </div>

        {/* Title & Editorial Description */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
            <span>{event.formattedDate}</span>
            <span>•</span>
            <span>{event.distanceKm} km away</span>
          </div>

          <h3>
            <button
              type="button"
              onClick={() => onSelect(event)}
              className="text-left font-serif text-lg font-medium text-stone-900 hover:text-stone-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
            >
              {event.title}
            </button>
          </h3>

          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-sans">
            {event.tagline}
          </p>
        </div>

        {/* Location & Tags */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="truncate font-medium text-stone-700">
            {event.venueName}
          </span>

          <span className="text-[11px] font-mono text-stone-400 uppercase">
            {event.category}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 mt-2 border-t border-stone-100">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onSelect(event)}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          Details
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          leftIcon={<Mail className="w-3.5 h-3.5" />}
          onClick={() => onAskOrganizer(event)}
        >
          Contact Organizer
        </Button>
      </div>
    </article>
  );
}
