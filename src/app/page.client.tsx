'use client';

import { useRouter } from 'next/navigation';
import { ShadowOverlay } from '@/components/layout/ShadowOverlay';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingManifesto } from '@/components/landing/LandingManifesto';
import { LandingPreview } from '@/components/landing/LandingPreview';
import { LandingCta } from '@/components/landing/LandingCta';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LandingPageClient() {
  const router = useRouter();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/main?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/main');
    }
  };

  return (
    <div className="bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] font-sans antialiased min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-[var(--theme-text-primary)] selection:text-[var(--theme-bg-surface)]">
      {/* Ambient Leaf / Morning Light Overlay */}
      <ShadowOverlay />

      {/* Landing Navigation Header */}
      <LandingHeader />

      {/* Main Landing Sections */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center">
        <LandingHero onSearch={handleSearch} />
        <LandingManifesto />
        <LandingPreview />
        <LandingCta />
      </main>

      {/* Minimal Footer */}
      <LandingFooter />
    </div>
  );
}
