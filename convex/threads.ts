import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query('threads')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    // Fetch messages for each thread
    const threadsWithMessages = await Promise.all(
      threads.map(async (thread) => {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_threadId', (q) => q.eq('threadId', thread._id))
          .collect();

        // Sort messages chronologically by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);

        return {
          id: thread._id,
          sessionId: thread.sessionId,
          eventId: thread.eventId,
          eventTitle: thread.eventTitle,
          organizerName: thread.organizerName,
          organizerEmail: thread.organizerEmail,
          agentEmail: thread.agentEmail,
          subject: thread.subject,
          lastMessageAt: thread.lastMessageAt,
          status: thread.status,
          messages: messages.map((m) => ({
            id: m._id,
            sender: m.sender,
            senderName: m.senderName,
            senderEmail: m.senderEmail,
            subject: m.subject,
            body: m.body,
            sentAt: m.sentAt,
          })),
        };
      })
    );

    return threadsWithMessages;
  },
});

export const createInquiry = mutation({
  args: {
    sessionId: v.string(),
    eventId: v.string(),
    eventTitle: v.string(),
    organizerName: v.string(),
    organizerEmail: v.string(),
    agentEmail: v.string(),
    subject: v.string(),
    questionBody: v.string(),
    agentmailThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if a thread already exists for this event and session
    let thread = await ctx.db
      .query('threads')
      .withIndex('by_session_and_event', (q) =>
        q.eq('sessionId', args.sessionId).eq('eventId', args.eventId)
      )
      .first();

    const now = Date.now();
    const sentAtStr = new Date(now).toISOString();

    if (!thread) {
      const threadId = await ctx.db.insert('threads', {
        sessionId: args.sessionId,
        eventId: args.eventId,
        eventTitle: args.eventTitle,
        organizerName: args.organizerName,
        organizerEmail: args.organizerEmail,
        agentEmail: args.agentEmail,
        subject: args.subject,
        lastMessageAt: sentAtStr,
        status: 'pending',
        agentmailThreadId: args.agentmailThreadId,
      });
      thread = await ctx.db.get(threadId);
    } else {
      await ctx.db.patch(thread._id, {
        lastMessageAt: sentAtStr,
        status: 'pending',
        ...(args.agentmailThreadId ? { agentmailThreadId: args.agentmailThreadId } : {}),
      });
    }

    if (!thread) {
      throw new Error('Failed to create or find thread');
    }

    // Insert outbound message
    const messageId = await ctx.db.insert('messages', {
      threadId: thread._id,
      sender: 'agent',
      senderName: 'SideDoor Scout AI',
      senderEmail: args.agentEmail,
      subject: args.subject,
      body: args.questionBody,
      sentAt: sentAtStr,
      timestamp: now,
    });

    return { threadId: thread._id, messageId };
  },
});

export const addMessage = mutation({
  args: {
    threadId: v.id('threads'),
    sender: v.union(v.literal('agent'), v.literal('organizer')),
    senderName: v.string(),
    senderEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.optional(v.union(v.literal('pending'), v.literal('responded'), v.literal('confirmed'))),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const now = Date.now();
    const sentAtStr = new Date(now).toISOString();

    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      sender: args.sender,
      senderName: args.senderName,
      senderEmail: args.senderEmail,
      subject: args.subject,
      body: args.body,
      sentAt: sentAtStr,
      timestamp: now,
    });

    const newStatus = args.status ?? (args.sender === 'organizer' ? 'responded' : 'pending');

    await ctx.db.patch(args.threadId, {
      lastMessageAt: sentAtStr,
      status: newStatus,
    });

    return { messageId };
  },
});

export const addMessageFromAgentMail = mutation({
  args: {
    agentmailThreadId: v.string(),
    senderEmail: v.string(),
    senderName: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Look up by agentmailThreadId
    let thread = await ctx.db
      .query('threads')
      .withIndex('by_agentmailThreadId', (q) =>
        q.eq('agentmailThreadId', args.agentmailThreadId)
      )
      .first();

    // Fallback: match by organizer email if threadId was not yet linked
    if (!thread) {
      thread = await ctx.db
        .query('threads')
        .filter((q) => q.eq(q.field('organizerEmail'), args.senderEmail))
        .first();
    }

    if (!thread) {
      console.warn(`⚠️ [Convex] No thread matched for AgentMail threadId: ${args.agentmailThreadId}`);
      return { success: false, reason: 'thread_not_found' };
    }

    const now = Date.now();
    const sentAtStr = new Date(now).toISOString();

    const messageId = await ctx.db.insert('messages', {
      threadId: thread._id,
      sender: 'organizer',
      senderName: args.senderName || thread.organizerName,
      senderEmail: args.senderEmail,
      subject: args.subject || `Re: ${thread.subject}`,
      body: args.body,
      sentAt: sentAtStr,
      timestamp: now,
    });

    await ctx.db.patch(thread._id, {
      lastMessageAt: sentAtStr,
      status: 'responded',
      agentmailThreadId: args.agentmailThreadId,
    });

    return { success: true, messageId, threadId: thread._id };
  },
});
