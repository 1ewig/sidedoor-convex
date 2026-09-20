import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

interface AgentMailWebhookPayload {
  event_type?: string;
  event_id?: string;
  message?: {
    message_id?: string;
    thread_id?: string;
    inbox_id?: string;
    from_?: string[] | string;
    to?: string[] | string;
    subject?: string;
    text?: string;
    html?: string;
  };
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as AgentMailWebhookPayload;

    const eventType = payload.event_type;
    const msg = payload.message;

    // Only process inbound messages
    if (!msg || (eventType && eventType !== 'message.received')) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const threadId = msg.thread_id;
    if (!threadId) {
      return NextResponse.json({ received: true, reason: 'missing_thread_id' });
    }

    const rawFrom = msg.from_;
    let senderEmail = 'organizer@venue.com';
    let senderName = 'Venue Organizer';

    if (Array.isArray(rawFrom) && rawFrom.length > 0) {
      senderEmail = rawFrom[0];
    } else if (typeof rawFrom === 'string') {
      senderEmail = rawFrom;
    }

    // Parse sender display name if present (e.g., "John Doe <john@venue.com>")
    const nameMatch = senderEmail.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
    if (nameMatch) {
      senderName = nameMatch[1].trim();
      senderEmail = nameMatch[2].trim();
    }

    const bodyText = (msg.text || msg.html || 'Received reply from organizer.').trim();
    const subject = msg.subject || 'Re: Inquiry';

    console.log(`📩 [AgentMail Webhook] Inbound reply received for thread: ${threadId} from ${senderEmail}`);

    // If Convex is configured, persist the message to Convex database
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl && !convexUrl.includes('your-deployment-name')) {
      const convex = new ConvexHttpClient(convexUrl);
      await convex.mutation(api.threads.addMessageFromAgentMail, {
        agentmailThreadId: threadId,
        senderEmail,
        senderName,
        subject,
        body: bodyText,
      });
      console.log(`✅ [AgentMail Webhook] Inbound message synced to Convex.`);
    }

    return NextResponse.json({
      received: true,
      threadId,
      senderEmail,
    });
  } catch (error) {
    console.error('❌ [AgentMail Webhook Error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing error' },
      { status: 500 }
    );
  }
}
