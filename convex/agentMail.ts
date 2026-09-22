"use node";

import { AgentMailClient } from 'agentmail';
import { action } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';

let cachedClient: AgentMailClient | null = null;
let cachedInbox: { id: string; email: string } | null = null;

function getClient(): AgentMailClient {
  const apiKey = process.env.AGENTMAIL_API_KEY?.trim();
  if (!apiKey || apiKey.includes('your_agentmail_api_key_here')) {
    throw new Error('AGENTMAIL_API_KEY is not configured in Convex.');
  }

  if (!cachedClient) {
    cachedClient = new AgentMailClient({ apiKey });
  }

  return cachedClient;
}

async function resolveInbox(client: AgentMailClient): Promise<{ id: string; email: string }> {
  if (cachedInbox) return cachedInbox;

  const configuredId = process.env.AGENTMAIL_INBOX_ID?.trim();
  const configuredEmail = process.env.AGENTMAIL_INBOX_EMAIL?.trim();
  if (configuredId && !configuredId.includes('your_inbox_id_here')) {
    if (configuredEmail && !configuredEmail.includes('your_inbox_email_here')) {
      cachedInbox = { id: configuredId, email: configuredEmail };
      return cachedInbox;
    }

    const inbox = await client.inboxes.get(configuredId);
    cachedInbox = { id: configuredId, email: inbox.email || `${configuredId}@agentmail.to` };
    return cachedInbox;
  }

  const listed = await client.inboxes.list({ limit: 1 });
  const existing = listed.inboxes?.[0];
  if (existing) {
    cachedInbox = {
      id: existing.inboxId,
      email: existing.email || `${existing.inboxId}@agentmail.to`,
    };
    return cachedInbox;
  }

  const created = await client.inboxes.create({
    username: `scout-${Date.now().toString(36)}`,
  });
  cachedInbox = {
    id: created.inboxId,
    email: created.email || `${created.inboxId}@agentmail.to`,
  };
  return cachedInbox;
}

function resolveRecipient(organizerEmail: string, venueName: string, sourceUrl: string): string {
  if (organizerEmail.includes('@')) return organizerEmail.trim();

  try {
    const domain = new URL(sourceUrl).hostname.replace(/^www\./, '');
    if (domain) return `info@${domain}`;
  } catch {
    // Use the deterministic venue fallback below.
  }

  const cleanVenue = venueName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `contact@${cleanVenue || 'venue'}.com`;
}

export const sendInquiry = action({
  args: {
    sessionId: v.string(),
    eventId: v.string(),
    eventTitle: v.string(),
    organizerName: v.string(),
    organizerEmail: v.string(),
    venueName: v.string(),
    sourceUrl: v.string(),
    questionBody: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    threadId: string;
    messageId: string;
    agentmailThreadId?: string;
    agentEmail: string;
    recipientEmail: string;
  }> => {
    const client = getClient();
    const recipientEmail = resolveRecipient(args.organizerEmail, args.venueName, args.sourceUrl);
    const inbox = await resolveInbox(client);
    const subject = `Inquiry: ${args.eventTitle}`;
    const sent = await client.inboxes.messages.send(inbox.id, {
      to: [recipientEmail],
      subject,
      text: args.questionBody,
    });

    const persisted: { threadId: string; messageId: string } = await ctx.runMutation(
      api.threads.createInquiry,
      {
        sessionId: args.sessionId,
        eventId: args.eventId,
        eventTitle: args.eventTitle,
        organizerName: args.organizerName,
        organizerEmail: recipientEmail,
        agentEmail: inbox.email,
        subject,
        questionBody: args.questionBody,
        agentmailThreadId: sent.threadId,
      }
    );

    await ctx.runMutation(api.events.updateOutreachStatus, {
      eventId: args.eventId,
      status: 'sent',
    });

    return {
      threadId: persisted.threadId,
      messageId: sent.messageId,
      agentmailThreadId: sent.threadId,
      agentEmail: inbox.email,
      recipientEmail,
    };
  },
});

export const sendReply = action({
  args: {
    threadId: v.id('threads'),
    text: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    messageId: string;
    agentEmail: string;
  }> => {
    const thread = await ctx.runQuery(api.threads.getForDispatch, { threadId: args.threadId });
    if (!thread) throw new Error('Conversation thread no longer exists.');

    const client = getClient();
    const inbox = await resolveInbox(client);
    const sent = await client.inboxes.messages.send(inbox.id, {
      to: [thread.organizerEmail],
      subject: `Re: ${thread.subject}`,
      text: args.text,
    });

    await ctx.runMutation(api.threads.addMessage, {
      threadId: args.threadId,
      sender: 'agent',
      senderName: 'You (via SideDoor)',
      senderEmail: inbox.email,
      subject: `Re: ${thread.subject}`,
      body: args.text,
      status: 'pending',
    });

    return { messageId: sent.messageId, agentEmail: inbox.email };
  },
});
