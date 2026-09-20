'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useConvexConfig } from '@/components/providers/ConvexClientProvider';
import { useSessionStore } from '@/state/useSessionStore';
import { EmailThread, EmailMessage, LocalEvent } from '@/types';

export function useAgentMail() {
  const [localThreads, setLocalThreads] = useState<EmailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isMailModalOpen, setIsMailModalOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const sessionId = useSessionStore((state) => state.sessionId);
  const { isConfigured } = useConvexConfig();
  const convexThreads = useQuery(
    api.threads.list,
    isConfigured && sessionId ? { sessionId } : 'skip'
  );
  const createInquiryMutation = useMutation(api.threads.createInquiry);
  const addMessageMutation = useMutation(api.threads.addMessage);

  // Derive threads combining Convex reactive data with local optimistic state
  const threads = useMemo(() => {
    if (convexThreads && Array.isArray(convexThreads) && convexThreads.length > 0) {
      const convexMapped = convexThreads as unknown as EmailThread[];
      const existingIds = new Set(convexMapped.map((t) => t.id));
      const pendingLocal = localThreads.filter((t) => !existingIds.has(t.id));
      return [...pendingLocal, ...convexMapped];
    }
    return localThreads;
  }, [convexThreads, localThreads]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;
  const unreadCount = threads.filter((t) => t.status === 'responded').length;

  // Send an automated inquiry for an event
  const sendEventInquiry = useCallback(
    (event: LocalEvent, customQuestion?: string) => {
      setIsSending(true);

      const threadId = `th-${event.id}`;
      const questionBody =
        customQuestion ||
        `Hi ${event.organizerName.split(' ')[0]},\n\nI am the SideDoor Scout AI scouting events for our community. Could you confirm if door tickets will be available for walk-ups this weekend and what the door policy is?\n\nThank you,\nSideDoor Autonomous Agent (scout-alpha@sidedoor.agentmail.to)`;

      const newOutboundMessage: EmailMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        senderName: 'SideDoor Scout AI',
        senderEmail: 'scout-alpha@sidedoor.agentmail.to',
        subject: `Inquiry: ${event.title}`,
        body: questionBody,
        sentAt: 'Just now',
      };

      const existingThread = threads.find((t) => t.eventId === event.id);

      if (existingThread) {
        setLocalThreads((prev) =>
          prev.map((t) =>
            t.id === existingThread.id
              ? {
                  ...t,
                  lastMessageAt: 'Just now',
                  messages: [...t.messages, newOutboundMessage],
                }
              : t
          )
        );
        setSelectedThreadId(existingThread.id);
      } else {
        const newThread: EmailThread = {
          id: threadId,
          eventId: event.id,
          eventTitle: event.title,
          organizerName: event.organizerName,
          organizerEmail: event.organizerEmail,
          agentEmail: 'scout-alpha@sidedoor.agentmail.to',
          subject: `Inquiry: ${event.title}`,
          lastMessageAt: 'Just now',
          status: 'pending',
          messages: [newOutboundMessage],
        };

        setLocalThreads((prev) => [newThread, ...prev]);
        setSelectedThreadId(newThread.id);
      }

      // Sync to Convex if configured
      if (isConfigured) {
        createInquiryMutation({
          sessionId,
          eventId: event.id,
          eventTitle: event.title,
          organizerName: event.organizerName,
          organizerEmail: event.organizerEmail,
          agentEmail: 'scout-alpha@sidedoor.agentmail.to',
          subject: `Inquiry: ${event.title}`,
          questionBody,
        }).catch((err: unknown) => {
          console.warn('⚠️ [Convex] Failed to persist inquiry:', err);
        });
      }

      setIsSending(false);
      setIsMailModalOpen(true);

      // Simulate organizer responding after 3.5 seconds
      setTimeout(() => {
        const autoReply: EmailMessage = {
          id: `reply-${Date.now()}`,
          sender: 'organizer',
          senderName: event.organizerName,
          senderEmail: event.organizerEmail,
          subject: `Re: Inquiry: ${event.title}`,
          body: `Thanks for checking in! Yes, we have about 30 tickets set aside at the door for $15 cash/card. Venue doors open at ${event.formattedTime.split(' - ')[0] || '7:30 PM'}. Looking forward to seeing you there!`,
          sentAt: 'Just now',
        };

        setLocalThreads((prev) =>
          prev.map((t) =>
            t.eventId === event.id
              ? {
                  ...t,
                  status: 'responded',
                  lastMessageAt: 'Just now',
                  messages: [...t.messages, autoReply],
                }
              : t
          )
        );
      }, 3500);
    },
    [createInquiryMutation, isConfigured, sessionId, threads]
  );

  const replyToThread = useCallback(
    (threadId: string, text: string) => {
      const newMsg: EmailMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        senderName: 'You (via SideDoor)',
        senderEmail: 'scout-alpha@sidedoor.agentmail.to',
        subject: 'Re: Inquiry',
        body: text,
        sentAt: 'Just now',
      };

      setLocalThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                lastMessageAt: 'Just now',
                messages: [...t.messages, newMsg],
              }
            : t
        )
      );

      if (isConfigured && !threadId.startsWith('th-')) {
        // If it's a real Convex Id
        addMessageMutation({
          threadId: threadId as Id<'threads'>,
          sender: 'agent',
          senderName: 'You (via SideDoor)',
          senderEmail: 'scout-alpha@sidedoor.agentmail.to',
          subject: 'Re: Inquiry',
          body: text,
          status: 'pending',
        }).catch((err: unknown) => {
          console.warn('⚠️ [Convex] Failed to save reply message:', err);
        });
      }
    },
    [addMessageMutation, isConfigured]
  );

  return {
    threads,
    selectedThread,
    selectedThreadId,
    setSelectedThreadId,
    isMailModalOpen,
    setIsMailModalOpen,
    isSending,
    unreadCount,
    sendEventInquiry,
    replyToThread,
  };
}
