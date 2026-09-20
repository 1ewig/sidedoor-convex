import type { Metadata } from 'next';
import { RadarPageClient } from './page.client';

export const metadata: Metadata = {
  title: 'Public Radar — Live Gatherings Unearthed in Silence | SideDoor',
  description:
    'Real-time worldwide gatherings and secret rooms curated across cities by autonomous scouts. Sourced from underground flyers, indie venue boards, and private Linktrees.',
};

export default function RadarPage() {
  return <RadarPageClient />;
}
