import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api, components } from './_generated/api';
import { registerStaticRoutes } from '@convex-dev/static-hosting';

const http = httpRouter();

http.route({
  path: '/agent-mail/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = (await request.json()) as {
        event_type?: string;
        message?: {
          thread_id?: string;
          from_?: string[] | string;
          subject?: string;
          text?: string;
          html?: string;
        };
      };
      const message = payload.message;

      if (!message || (payload.event_type && payload.event_type !== 'message.received')) {
        return Response.json({ received: true, ignored: true });
      }
      if (!message.thread_id) {
        return Response.json({ received: true, reason: 'missing_thread_id' });
      }

      const rawFrom = Array.isArray(message.from_) ? message.from_[0] : message.from_;
      let senderEmail = rawFrom || 'organizer@venue.com';
      let senderName = 'Venue Organizer';
      const nameMatch = senderEmail.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
      if (nameMatch) {
        senderName = nameMatch[1].trim();
        senderEmail = nameMatch[2].trim();
      }

      const result = await ctx.runMutation(api.threads.addMessageFromAgentMail, {
        agentmailThreadId: message.thread_id,
        senderEmail,
        senderName,
        subject: message.subject || 'Re: Inquiry',
        body: (message.text || message.html || 'Received reply from organizer.').trim(),
      });

      return Response.json({ received: true, ...result });
    } catch (error) {
      console.error('[AgentMail webhook] failed', error);
      return Response.json({ error: 'Webhook processing error' }, { status: 500 });
    }
  }),
});

registerStaticRoutes(http, components.staticHosting);

export default http;
