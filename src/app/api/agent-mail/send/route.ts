import { NextResponse } from 'next/server';
import {
  getAgentMailClient,
  isAgentMailConfigured,
  resolveAgentMailInbox,
} from '@/lib/agent-mail/client';
import { LocalEvent } from '@/types';

interface SendInquiryRequestBody {
  event: LocalEvent;
  questionBody: string;
  isReply?: boolean;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendInquiryRequestBody;
    const { event, questionBody, isReply } = body;

    if (!event || !questionBody) {
      return NextResponse.json(
        { error: 'Missing event or questionBody in request' },
        { status: 400 }
      );
    }

    if (!isAgentMailConfigured()) {
      return NextResponse.json(
        { error: 'AgentMail is not configured. Please set AGENTMAIL_API_KEY in environment variables.' },
        { status: 503 }
      );
    }

    const client = getAgentMailClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Failed to initialize AgentMail client.' },
        { status: 500 }
      );
    }

    // Check if event has a valid organizer email
    const recipientEmail = event.organizerEmail?.trim();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Venue organizer has no direct email address listed for this event.' },
        { status: 400 }
      );
    }

    const { inboxId, inboxEmail } = await resolveAgentMailInbox(client);

    const subject = isReply ? `Re: Inquiry: ${event.title}` : `Inquiry: ${event.title}`;

    const sendRes = await client.inboxes.messages.send(inboxId, {
      to: [recipientEmail],
      subject,
      text: questionBody,
    });

    return NextResponse.json({
      success: true,
      messageId: sendRes.messageId,
      agentmailThreadId: sendRes.threadId,
      agentEmail: inboxEmail,
      recipientEmail,
    });
  } catch (error) {
    console.error('❌ [AgentMail Send Error]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send inquiry via AgentMail',
      },
      { status: 500 }
    );
  }
}
