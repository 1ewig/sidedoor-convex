import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageClient } from './page.client';

export const metadata: Metadata = {
  title: 'SideDoor — Autonomous Hyper-Local Event Scout & AgentMail',
  description:
    'Continuously discover underground indie rock shows, outdoor markets, and art vernissages via Firecrawl & AI, visualized on a live radar map with automated AgentMail organizer outreach.',
};

export default function MainPage() {
  return (
    <Suspense fallback={null}>
      <PageClient />
    </Suspense>
  );
}
