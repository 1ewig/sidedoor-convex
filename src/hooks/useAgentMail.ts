'use client';

import { useState, useCallback } from 'react';
import { EmailThread, EmailMessage, LocalEvent } from '@/types';
import { INITIAL_THREADS } from '@/lib/mockData';

export function useAgentMail() {
  const [threads, setThreads] = useState<EmailThread[]>(INITIAL_THREADS);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(INITIAL_THREADS[0]?.id || null);
  const [isMailModalOpen, setIsMailModalOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

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
        setThreads((prev) =>
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

        setThreads((prev) => [newThread, ...prev]);
        setSelectedThreadId(newThread.id);
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

        setThreads((prev) =>
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
    [threads]
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
  };
}
