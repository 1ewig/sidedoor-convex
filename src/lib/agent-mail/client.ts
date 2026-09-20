import { AgentMailClient } from 'agentmail';

let cachedClient: AgentMailClient | null = null;
let cachedInboxId: string | null = null;

export function isAgentMailConfigured(): boolean {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  return Boolean(apiKey && apiKey.trim().length > 0 && !apiKey.includes('your_agentmail_api_key_here'));
}

export function getAgentMailClient(): AgentMailClient | null {
  if (!isAgentMailConfigured()) return null;

  if (!cachedClient) {
    cachedClient = new AgentMailClient({
      apiKey: process.env.AGENTMAIL_API_KEY!.trim(),
    });
  }

  return cachedClient;
}

export async function resolveAgentMailInbox(client: AgentMailClient): Promise<{
  inboxId: string;
  inboxEmail: string;
}> {
  if (cachedInboxId) {
    return {
      inboxId: cachedInboxId,
      inboxEmail: process.env.AGENTMAIL_INBOX_EMAIL || 'scout-alpha@agentmail.to',
    };
  }

  const envInboxId = process.env.AGENTMAIL_INBOX_ID?.trim();
  if (envInboxId && !envInboxId.includes('your_inbox_id_here')) {
    cachedInboxId = envInboxId;
    return {
      inboxId: envInboxId,
      inboxEmail: process.env.AGENTMAIL_INBOX_EMAIL || 'scout-alpha@agentmail.to',
    };
  }

  // Auto-discover or create on demand
  try {
    const listRes = await client.inboxes.list({ limit: 1 });
    if (listRes.inboxes && listRes.inboxes.length > 0) {
      const inbox = listRes.inboxes[0];
      cachedInboxId = inbox.inboxId;
      return {
        inboxId: inbox.inboxId,
        inboxEmail: inbox.email || process.env.AGENTMAIL_INBOX_EMAIL || 'scout-alpha@agentmail.to',
      };
    }

    // Create a new scout inbox
    const newInbox = await client.inboxes.create({
      username: `scout-${Date.now().toString(36)}`,
    });
    cachedInboxId = newInbox.inboxId;
    return {
      inboxId: newInbox.inboxId,
      inboxEmail: newInbox.email || process.env.AGENTMAIL_INBOX_EMAIL || 'scout-alpha@agentmail.to',
    };
  } catch (error) {
    console.warn('⚠️ [AgentMail] Failed to list or create inbox:', error);
    const fallbackId = envInboxId || 'inbox_default';
    return {
      inboxId: fallbackId,
      inboxEmail: process.env.AGENTMAIL_INBOX_EMAIL || 'scout-alpha@agentmail.to',
    };
  }
}
