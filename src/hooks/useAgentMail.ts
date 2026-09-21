'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useConvexConfig } from '@/components/providers/ConvexClientProvider';
import { useSessionStore } from '@/state/useSessionStore';
import { useAgentMailStore } from '@/state/useAgentMailStore';
import { EmailThread, EmailMessage, LocalEvent } from '@/types';

export function useAgentMail() {
  const localThreads = useAgentMailStore((state) => state.localThreads);
  const setLocalThreads = useAgentMailStore((state) => state.setLocalThreads);
  const selectedThreadId = useAgentMailStore((state) => state.selectedThreadId);
  const setSelectedThreadId = useAgentMailStore((state) => state.setSelectedThreadId);
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
      const existingEventIds = new Set(convexMapped.map((t) => t.eventId));
      const pendingLocal = localThreads.filter((t) => !existingEventIds.has(t.eventId));
      return [...pendingLocal, ...convexMapped];
    }
    return localThreads;
  }, [convexThreads, localThreads]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;
  const unreadCount = threads.filter((t) => t.status === 'responded').length;

  // Send an automated inquiry for an event
  const sendEventInquiry = useCallback(
    (event: LocalEvent, customQuestion?: string) => {
      const threadId = `th-${event.id}`;
      const questionBody =
        customQuestion ||
        `Hi ${event.organizerName.split(' ')[0]},\n\nI am the SideDoor Scout AI scouting events for our community. Could you confirm if door tickets will be available for walk-ups this weekend and what the door policy is?\n\nThank you,\nSideDoor Autonomous Agent`;

      const newOutboundMessage: EmailMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        senderName: 'SideDoor Scout AI',
        senderEmail: 'scout@agentmail.to',
        subject: `Inquiry: ${event.title}`,
        body: questionBody,
        sentAt: 'Just now',
      };

      const existingThread = threads.find((t) => t.eventId === event.id);

      if (existingThread) {
        setLocalThreads((prev) =>
          prev.map((t) =>
            t.id === existingThread.id || t.eventId === event.id
              ? {
                  ...t,
                  lastMessageAt: 'Just now',
                  messages: t.messages.some((m) => m.body === questionBody)
                    ? t.messages
                    : [...t.messages, newOutboundMessage],
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
          agentEmail: 'scout@agentmail.to',
          subject: `Inquiry: ${event.title}`,
          lastMessageAt: 'Just now',
          status: 'pending',
          messages: [newOutboundMessage],
        };

        setLocalThreads((prev) => {
          if (prev.some((t) => t.eventId === event.id)) return prev;
          return [newThread, ...prev];
        });
        setSelectedThreadId(newThread.id);
      }

      setIsSending(true);
      setIsMailModalOpen(true);

      // Call outbound AgentMail dispatch endpoint
      fetch('/api/agent-mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, questionBody }),
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          const isLive = Boolean(data && data.isLive);
          const agentmailThreadId = data?.agentmailThreadId;
          const resolvedAgentEmail = data?.agentEmail || 'scout@agentmail.to';

          // Update local thread with actual resolved agent email
          if (data?.agentEmail) {
            setLocalThreads((prev) =>
              prev.map((t) =>
                t.eventId === event.id
                  ? {
                      ...t,
                      agentEmail: resolvedAgentEmail,
                      messages: t.messages.map((m) =>
                        m.sender === 'agent' ? { ...m, senderEmail: resolvedAgentEmail } : m
                      ),
                    }
                  : t
              )
            );
          }

          // Sync to Convex if configured
          if (isConfigured) {
            createInquiryMutation({
              sessionId,
              eventId: event.id,
              eventTitle: event.title,
              organizerName: event.organizerName,
              organizerEmail: event.organizerEmail,
              agentEmail: resolvedAgentEmail,
              subject: `Inquiry: ${event.title}`,
              questionBody,
              agentmailThreadId,
            }).catch((err: unknown) => {
              console.warn('⚠️ [Convex] Failed to persist inquiry:', err);
            });
          }

          // If NOT live (no API key or simulated mode), simulate organizer reply after 3.5s
          if (!isLive) {
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
          }
        })
        .catch((err) => {
          console.warn('⚠️ [AgentMail] Error contacting /api/agent-mail/send:', err);
        })
        .finally(() => {
          setIsSending(false);
        });
    },
    [
      createInquiryMutation,
      isConfigured,
      sessionId,
      setLocalThreads,
      setSelectedThreadId,
      threads,
    ]
  );

  const replyToThread = useCallback(
    (threadId: string, text: string) => {
      const targetThread = threads.find((t) => t.id === threadId);
      const activeAgentEmail = targetThread?.agentEmail || 'scout@agentmail.to';

      const newMsg: EmailMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        senderName: 'You (via SideDoor)',
        senderEmail: activeAgentEmail,
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

      if (targetThread) {
        // Send via /api/agent-mail/send
        fetch('/api/agent-mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: {
              id: targetThread.eventId,
              title: targetThread.eventTitle,
              organizerName: targetThread.organizerName,
              organizerEmail: targetThread.organizerEmail,
            },
            questionBody: text,
            isReply: true,
          }),
        }).catch((err) => {
          console.warn('⚠️ [AgentMail] Failed to send reply via API:', err);
        });
      }

      if (isConfigured && !threadId.startsWith('th-')) {
        // If it's a real Convex Id
        addMessageMutation({
          threadId: threadId as Id<'threads'>,
          sender: 'agent',
          senderName: 'You (via SideDoor)',
          senderEmail: activeAgentEmail,
          subject: 'Re: Inquiry',
          body: text,
          status: 'pending',
        }).catch((err: unknown) => {
          console.warn('⚠️ [Convex] Failed to save reply message:', err);
        });
      }
    },
    [addMessageMutation, isConfigured, setLocalThreads, threads]
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
