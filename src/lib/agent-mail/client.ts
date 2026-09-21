import { AgentMailClient } from 'agentmail';

let cachedClient: AgentMailClient | null = null;
let cachedInboxId: string | null = null;
let cachedInboxEmail: string | null = null;

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
  if (cachedInboxId && cachedInboxEmail) {
    return {
      inboxId: cachedInboxId,
      inboxEmail: cachedInboxEmail,
    };
  }

  const envInboxId = process.env.AGENTMAIL_INBOX_ID?.trim();
  const envInboxEmail = process.env.AGENTMAIL_INBOX_EMAIL?.trim();

  if (envInboxId && !envInboxId.includes('your_inbox_id_here')) {
    cachedInboxId = envInboxId;
    if (envInboxEmail && !envInboxEmail.includes('your_inbox_email_here')) {
      cachedInboxEmail = envInboxEmail;
      return { inboxId: envInboxId, inboxEmail: envInboxEmail };
    }

    try {
      const inbox = await client.inboxes.get(envInboxId);
      cachedInboxEmail = inbox.email || `${envInboxId}@agentmail.to`;
      return { inboxId: envInboxId, inboxEmail: cachedInboxEmail };
    } catch {
      cachedInboxEmail = `${envInboxId}@agentmail.to`;
      return { inboxId: envInboxId, inboxEmail: cachedInboxEmail };
    }
  }

  // Auto-discover existing inbox or create on demand
  try {
    const listRes = await client.inboxes.list({ limit: 1 });
    if (listRes.inboxes && listRes.inboxes.length > 0) {
      const inbox = listRes.inboxes[0];
      cachedInboxId = inbox.inboxId;
      cachedInboxEmail = inbox.email || envInboxEmail || `${inbox.inboxId}@agentmail.to`;
      return {
        inboxId: cachedInboxId,
        inboxEmail: cachedInboxEmail,
      };
    }

    // Create a new scout inbox on demand
    const newInbox = await client.inboxes.create({
      username: `scout-${Date.now().toString(36)}`,
    });
    cachedInboxId = newInbox.inboxId;
    cachedInboxEmail = newInbox.email || `${newInbox.inboxId}@agentmail.to`;
    return {
      inboxId: cachedInboxId,
      inboxEmail: cachedInboxEmail,
    };
  } catch (error) {
    console.error('❌ [AgentMail] Failed to list or create inbox:', error);
    throw error;
  }
}
