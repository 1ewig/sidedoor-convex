import { useState } from 'react';
import { LocalEvent } from '@/types';
import { Button } from '@/components/ui/Button';
import { Crosshair, ZoomIn, ZoomOut, ArrowUpRight, Mail } from 'lucide-react';

interface InteractiveMapProps {
  events: LocalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: LocalEvent) => void;
  radiusKm: number;
  onAskOrganizer: (event: LocalEvent) => void;
}

export function InteractiveMap({
  events,
  selectedEventId,
  onSelectEvent,
  radiusKm,
  onAskOrganizer,
}: InteractiveMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  // Center coordinate reference
  const centerLat = 40.718;
  const centerLng = -73.985;

  const getCoordinatesPos = (lat: number, lng: number) => {
    const dLat = (lat - centerLat) * 3500;
    const dLng = (lng - centerLng) * 3500;

    const x = 500 + dLng;
    const y = 400 - dLat;
    return { x: Math.max(80, Math.min(920, x)), y: Math.max(80, Math.min(720, y)) };
  };

  return (
    <div className="relative w-full h-full min-h-[450px] lg:min-h-[600px] bg-[#f5f4ef] rounded-xl border border-stone-200 overflow-hidden shadow-xs flex flex-col select-none">
      {/* Top Map HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xs border border-stone-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
            <span className="text-xs font-mono text-stone-700 font-medium">
              Cartographic Index: {events.length} Venues
            </span>
          </div>
        </div>

        {/* Map Controls */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-stone-200 p-1 rounded-lg pointer-events-auto shadow-xs">
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 transition-colors"
            title="Reset Scale"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cartographic SVG Map Surface */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-[#f5f4ef]">
        <svg
          viewBox="0 0 1000 800"
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            <pattern id="cartoGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e7e5dc" strokeWidth="0.75" />
            </pattern>
          </defs>

          {/* Grid */}
          <rect width="1000" height="800" fill="url(#cartoGrid)" />

          {/* Quiet Waterway */}
          <path
            d="M 150 0 C 220 180, 260 320, 240 500 C 220 620, 180 720, 200 800"
            fill="none"
            stroke="#e2ded4"
            strokeWidth="32"
            strokeLinecap="round"
          />
          <path
            d="M 150 0 C 220 180, 260 320, 240 500 C 220 620, 180 720, 200 800"
            fill="none"
            stroke="#d4cfc3"
            strokeWidth="1.5"
          />

          {/* Major Streets / Grid */}
          <path d="M 0 350 Q 500 390 1000 340" stroke="#dedbd0" strokeWidth="2" fill="none" />
          <path d="M 0 490 Q 500 450 1000 520" stroke="#dedbd0" strokeWidth="2" fill="none" />
          <path d="M 480 0 L 520 800" stroke="#dedbd0" strokeWidth="1.5" fill="none" />
          <path d="M 720 0 L 700 800" stroke="#dedbd0" strokeWidth="1.5" fill="none" />

          {/* Radius boundary */}
          <circle
            cx="500"
            cy="400"
            r={radiusKm * 14}
            fill="rgba(24, 24, 27, 0.015)"
            stroke="#a8a29e"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <circle cx="500" cy="400" r={3} fill="#18181b" />

          {/* Minimalist Cartographic Pins */}
          {events.map((event, index) => {
            const { x, y } = getCoordinatesPos(event.coordinates.lat, event.coordinates.lng);
            const isSelected = event.id === selectedEventId;

            return (
              <g
                key={event.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectEvent(event)}
                className="cursor-pointer transition-transform hover:scale-115"
              >
                {/* Outer ring */}
                <circle
                  r={isSelected ? 14 : 10}
                  fill={isSelected ? '#18181b' : '#ffffff'}
                  stroke="#18181b"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Pin Number / Indicator */}
                <text
                  textAnchor="middle"
                  y={isSelected ? 4 : 3.5}
                  fill={isSelected ? '#ffffff' : '#18181b'}
                  fontSize={isSelected ? 10 : 9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {index + 1}
                </text>

                {/* Score label */}
                <rect
                  x={14}
                  y={-11}
                  width="36"
                  height="16"
                  rx="3"
                  fill="#ffffff"
                  stroke="#d6d3d1"
                  strokeWidth="1"
                />
                <text
                  x={32}
                  y={1}
                  textAnchor="middle"
                  fill="#44403c"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {event.matchScore}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Event Floating Card Preview */}
        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-30 bg-white border border-stone-300 rounded-xl p-4 shadow-lg animate-in fade-in duration-150">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
                <span>{selectedEvent.distanceKm} km away</span>
                <span className="font-semibold text-stone-900">{selectedEvent.matchScore}% Match</span>
              </div>
              <h4 className="font-serif text-base font-medium text-stone-900 line-clamp-1">
                {selectedEvent.title}
              </h4>
              <p className="text-xs text-stone-600 font-sans">
                {selectedEvent.venueName} • {selectedEvent.formattedDate}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-stone-100">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => onSelectEvent(selectedEvent)}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Dossier
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 text-xs"
                leftIcon={<Mail className="w-3.5 h-3.5" />}
                onClick={() => onAskOrganizer(selectedEvent)}
              >
                Inquire
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500 font-mono">
        <span>Cartographic Reference: 40.718° N, -73.985° W</span>
        <span>Boundary: {radiusKm} km</span>
      </div>
    </div>
  );
}
