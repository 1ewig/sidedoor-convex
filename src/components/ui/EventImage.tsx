'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface EventImageProps {
  /** Ranked image candidates — walked in order on load failure. */
  images: string[];
  alt: string;
  sizes: string;
  /** Label (usually venue or event name) used for the fallback initial. */
  fallbackLabel?: string;
  className?: string;
}

/** Routes a remote image through the same-origin proxy safety net. */
function toProxiedSrc(remoteUrl: string): string {
  return `/api/img?src=${encodeURIComponent(remoteUrl)}`;
}

/**
 * Layer 3 of the image system: resilient event image renderer.
 *
 * Walks the ranked candidate list on `onError`; when every candidate fails it
 * renders a themed editorial placeholder (venue initial + icon) so the UI never
 * shows a browser broken-image glyph.
 */
export function EventImage({
  images,
  alt,
  sizes,
  fallbackLabel,
  className = 'object-cover',
}: EventImageProps) {
  const candidates = useMemo(() => images.filter(Boolean), [images]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const current = candidates[index];
  const exhausted = !current;

  if (exhausted) {
    const initial = (fallbackLabel || alt || '?').trim().charAt(0).toUpperCase() || '?';
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[var(--theme-bg-elevated)]">
        <span className="font-serif text-[var(--text-lg)] font-semibold text-[var(--theme-text-muted)] leading-none">
          {initial}
        </span>
        <ImageOff className="w-3.5 h-3.5 text-[var(--theme-text-muted)] opacity-60" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-[var(--theme-bg-elevated)] animate-pulse" />
      )}
      <Image
        src={toProxiedSrc(current)}
        alt={alt}
        fill
        sizes={sizes}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setIndex((i) => i + 1);
        }}
      />
    </>
  );
}
