import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { executeScoutCrawl } from '../src/lib/discovery/scout-engine';
import { runHybridEventDiscovery } from '../src/lib/discovery/pipeline';
import { getAgentMailClient, resolveAgentMailInbox, isAgentMailConfigured } from '../src/lib/agent-mail/client';
import { LocalEvent } from '../src/types';

async function main() {
  console.log('======================================================');
  console.log('   🧪 SideDoor — End-to-End Scout & AgentMail Test');
  console.log('======================================================\n');

  console.log('[1/4] 🔍 Checking AgentMail configuration...');
  const isConfigured = isAgentMailConfigured();
  console.log(`AgentMail Configured: ${isConfigured ? '✅ YES' : '❌ NO'}`);

  const client = getAgentMailClient();
  if (!client) {
    console.error('❌ Failed to instantiate AgentMailClient.');
    process.exit(1);
  }

  const inboxInfo = await resolveAgentMailInbox(client);
  console.log(`Resolved Inbox ID:    ${inboxInfo.inboxId}`);
  console.log(`Resolved Inbox Email: ${inboxInfo.inboxEmail}\n`);

  console.log('[2/4] 🚀 Scouting events in Brooklyn / New York City...');
  const prompt = 'live underground indie jazz gigs and gallery receptions this weekend';
  const location = 'Brooklyn, New York';
  const userCoords = { lat: 40.7128, lng: -73.95 };

  const t0 = performance.now();
  const crawlResult = await executeScoutCrawl({
    prompt,
    location,
    firecrawlKey: process.env.FIRECRAWL_API_KEY || '',
    country: 'US',
  });
  const crawlDuration = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(`⚡ Crawl complete in ${crawlDuration}s (${crawlResult.allScrapedPages.length} pages scraped).`);

  const discoveryStart = performance.now();
  const discoveryResult = await runHybridEventDiscovery(
    crawlResult.allScrapedPages,
    prompt,
    location,
    userCoords
  );
  const discoveryDuration = ((performance.now() - discoveryStart) / 1000).toFixed(2);
  console.log(`🎨 Discovery & Curation complete in ${discoveryDuration}s (${discoveryResult.events.length} events curated).\n`);

  // Display discovered events and their organizer details
  console.log('📋 Discovered Events Summary:');
  discoveryResult.events.slice(0, 5).forEach((event: LocalEvent, idx: number) => {
    console.log(`  ${idx + 1}. "${event.title}"`);
    console.log(`     Venue: ${event.venueName} | Date: ${event.formattedDate} ${event.formattedTime}`);
    console.log(`     Organizer: ${event.organizerName || 'Unknown'} <${event.organizerEmail || 'none'}>`);
    console.log(`     Match Score: ${event.matchScore}%\n`);
  });

  // Pick target event
  const candidateWithEmail = discoveryResult.events.find(
    (e: LocalEvent) => e.organizerEmail && e.organizerEmail.includes('@')
  );

  const targetEvent: LocalEvent = candidateWithEmail || (discoveryResult.events[0] ? {
    ...discoveryResult.events[0],
    organizerEmail: 'test-organizer@agentmail.to', // Safe AgentMail testing recipient
  } : {
    id: 'test-event-1',
    title: 'Brooklyn Ambient Sound Bath & Synth Jam',
    category: 'music',
    tagline: 'Analog synth explorations in an industrial warehouse loft',
    description: 'Immersive sound exploration featuring modular synths and quadraphonic audio.',
    venueName: 'Public Records Brooklyn',
    address: '233 Butler St, Brooklyn, NY 11217',
    dateTime: new Date().toISOString(),
    formattedDate: 'Saturday, Oct 25',
    formattedTime: '8:00 PM',
    price: '$15 Door',
    isFree: false,
    matchScore: 94,
    vibeTags: ['synth', 'ambient', 'warehouse'],
    organizerName: 'Brooklyn Sound Collective',
    organizerEmail: 'test-organizer@agentmail.to',
    sourceUrl: 'https://example.com/event',
    firecrawlExtractedAt: new Date().toISOString(),
    coordinates: { lat: 40.7128, lng: -73.95 },
  });

  console.log(`[3/4] ✉️ Preparing inquiry for target: "${targetEvent.title}"`);
  console.log(`Organizer: ${targetEvent.organizerName}`);
  console.log(`Recipient: ${targetEvent.organizerEmail}`);

  const questionBody = `Hi ${targetEvent.organizerName.split(' ')[0]},\n\nI am the SideDoor Scout AI scouting events for our community. Could you confirm if door tickets will be available for walk-ups this weekend and what the door policy is?\n\nThank you,\nSideDoor Autonomous Agent`;
  const subject = `Inquiry: ${targetEvent.title}`;

  console.log(`\n[4/4] 📤 Dispatching live message via AgentMail SDK (Inbox: ${inboxInfo.inboxId})...`);
  const sendRes = await client.inboxes.messages.send(inboxInfo.inboxId, {
    to: [targetEvent.organizerEmail],
    subject,
    text: questionBody,
  });

  console.log('\n======================================================');
  console.log('   🎉 AgentMail Dispatch Success!');
  console.log('======================================================');
  console.log('Message ID:        ', sendRes.messageId);
  console.log('Thread ID:         ', sendRes.threadId);
  console.log('Sent From:         ', inboxInfo.inboxEmail);
  console.log('Sent To:           ', targetEvent.organizerEmail);
  console.log('Subject:           ', subject);
  console.log('Status:             DISPATCHED (LIVE)');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
