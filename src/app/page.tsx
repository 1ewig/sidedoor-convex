import type { Metadata } from 'next';
import { LandingPageClient } from './page.client';

export const metadata: Metadata = {
  title: 'SideDoor — Quiet Cultural Gatherings & Intimate Evenings',
  description:
    'Discover intimate loft concerts, candlelit readings, ceramic studio vernissages, and quiet community happenings just off the main road.',
  openGraph: {
    title: 'SideDoor — Quiet Cultural Gatherings & Intimate Evenings',
    description:
      'The best things happening in your city aren’t on billboards. Discover quiet gatherings curated in silence.',
    type: 'website',
  },
};

export default function RootPage() {
  return <LandingPageClient />;
}
