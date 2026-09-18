import { useState } from 'react';
import { LocalEvent } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MapPin, Clock, ExternalLink, Mail, Send, Compass } from 'lucide-react';

interface EventDetailDrawerProps {
  event: LocalEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSendInquiry: (event: LocalEvent, question?: string) => void;
  isSending: boolean;
}

export function EventDetailDrawer({
  event,
  isOpen,
  onClose,
  onSendInquiry,
  isSending,
}: EventDetailDrawerProps) {
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [activeTemplate, setActiveTemplate] = useState<string>('door_tickets');

  if (!event) return null;

  const templates: Record<string, string> = {
    door_tickets: `Hi ${event.organizerName.split(' ')[0]}, I am writing on behalf of an attendee interested in ${event.title}. Could you confirm if door tickets or walk-up admissions will be available?`,
    set_times: `Hi ${event.organizerName.split(' ')[0]}, could you share the approximate set times and running order for ${event.title}?`,
    accessibility: `Hi ${event.organizerName.split(' ')[0]}, could you share accessibility details for ${event.venueName}?`,
  };

  const handleDispatch = () => {
    const questionText = customQuestion.trim() || templates[activeTemplate];
    onSendInquiry(event, questionText);
    setCustomQuestion('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={<span className="font-serif text-lg font-medium">{event.title}</span>}
      subtitle={
        <span className="text-xs text-stone-500 font-mono">
          {event.venueName} • {event.distanceKm} km away • {event.formattedDate}
        </span>
      }
    >
      <div className="space-y-6">
        {/* Cover image */}
        {event.coverImage && (
          <div className="relative h-64 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-stone-900/90 text-white px-3 py-1 rounded text-xs font-medium">
              {event.price}
            </div>
            <div className="absolute bottom-3 right-3 bg-white/95 text-stone-900 px-3 py-1 rounded text-xs font-mono font-medium border border-stone-200">
              {event.matchScore}% Match
            </div>
          </div>
        )}

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h2 className="font-serif text-2xl text-stone-900 font-medium leading-snug">
            {event.title}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed font-serif italic text-base">
            "{event.tagline}"
          </p>
        </div>

        {/* Field Scouting / Curator Rationale */}
        <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-mono uppercase text-stone-500 text-[11px] font-medium tracking-wider">
            <Compass className="w-3.5 h-3.5 text-stone-700" />
            Curator Notes & AI Relevance
          </div>
          <p className="text-stone-700 leading-relaxed font-sans">
            Scouted as an authentic local gathering fitting your taste profile. High community resonance,
            independent organizing, and situated within your {event.distanceKm} km radius.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {event.vibeTags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-stone-600 border border-stone-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Detailed Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase text-stone-400 tracking-wider">Overview</h3>
          <p className="text-sm text-stone-700 leading-relaxed font-sans">{event.description}</p>
        </div>

        {/* Logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border border-stone-200 bg-white text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-stone-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </div>
            <p className="font-medium text-stone-900">{event.formattedDate}</p>
            <p className="text-stone-500">{event.formattedTime}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-stone-400 font-mono">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location</span>
            </div>
            <p className="font-medium text-stone-900">{event.venueName}</p>
            <p className="text-stone-500 truncate">{event.address}</p>
          </div>
        </div>

        {/* Provenance Link */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 font-mono">
          <span>Source: Firecrawl ({event.firecrawlExtractedAt})</span>
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-900 hover:underline flex items-center gap-1 font-sans font-medium"
          >
            <span>Original Listing</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* AgentMail Outreach Panel */}
        <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-stone-700" />
              <div>
                <h4 className="text-xs font-medium text-stone-900 font-sans">
                  Direct Organizer Correspondence
                </h4>
                <p className="text-[11px] text-stone-500 font-mono">
                  To: {event.organizerName} &lt;{event.organizerEmail}&gt;
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-stone-500">AgentMail Service</span>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTemplate('door_tickets')}
              className={`text-[11px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                activeTemplate === 'door_tickets'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              Door Tickets
            </button>
            <button
              onClick={() => setActiveTemplate('set_times')}
              className={`text-[11px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                activeTemplate === 'set_times'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              Lineup & Schedule
            </button>
            <button
              onClick={() => setActiveTemplate('accessibility')}
              className={`text-[11px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                activeTemplate === 'accessibility'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
            >
              Accessibility
            </button>
          </div>

          <textarea
            rows={3}
            value={customQuestion || templates[activeTemplate]}
            onChange={(e) => setCustomQuestion(e.target.value)}
            className="w-full text-xs p-3 rounded-lg bg-white border border-stone-200 text-stone-900 focus:outline-none focus:border-stone-400 font-sans"
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSending}
              onClick={handleDispatch}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Dispatch Inquiry
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
