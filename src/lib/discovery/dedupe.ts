import { CandidateEvent } from '@/types/discovery';

/**
 * Tokenizes a string into a set of lowercased significant words (>=3 chars).
 */
export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}

/**
 * Jaccard token similarity between two titles.
 */
export function titleSimilarity(a: string, b: string): number {
  const setA = titleTokens(a);
  const setB = titleTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return intersection / Math.min(setA.size, setB.size);
}

/**
 * Calculates a data completeness richness score for a CandidateEvent.
 */
function candidateRichness(cand: CandidateEvent): number {
  let score = 0;
  if (cand.title && cand.title.length > 5) score += 2;
  if (cand.venueName && cand.venueName !== 'Local Venue') score += 2;
  if (cand.address && cand.address !== cand.venueName) score += 2;
  if (cand.isoDate || (cand.formattedDate && cand.formattedDate !== 'This Weekend')) score += 3;
  if (cand.formattedTime && cand.formattedTime !== '8:00 PM') score += 1;
  if (cand.price && cand.price !== 'Door / RSVP') score += 1;
  if (cand.coverImage) score += 2;
  if (cand.coverImages && cand.coverImages.length > 1) score += 1;
  if (cand.organizerEmail) score += 3;
  if (cand.rawSnippet && cand.rawSnippet.length > 40) score += 1;
  return score;
}

/**
 * Deduplicates and ranks CandidateEvents across domains.
 * Merges same-day matches or high-similarity titles, preserving the richer candidate's metadata.
 */
export function dedupeAndRankCandidates(candidates: CandidateEvent[]): CandidateEvent[] {
  if (candidates.length <= 1) return candidates;

  const merged: CandidateEvent[] = [];

  for (const cand of candidates) {
    let duplicateIndex = -1;

    for (let i = 0; i < merged.length; i++) {
      const existing = merged[i];
      const sim = titleSimilarity(existing.title, cand.title);

      const sameDate =
        Boolean(existing.isoDate && cand.isoDate && existing.isoDate === cand.isoDate) ||
        Boolean(
          existing.formattedDate &&
            cand.formattedDate &&
            existing.formattedDate !== 'This Weekend' &&
            existing.formattedDate === cand.formattedDate
        );

      // Same venue and high similarity
      const sameVenue =
        existing.venueName &&
        cand.venueName &&
        existing.venueName.toLowerCase() === cand.venueName.toLowerCase();

      // Duplicate condition:
      // 1. Same source URL/permalink
      // 2. High title similarity (>= 0.80)
      // 3. Same date with moderate similarity (>= 0.55)
      // 4. Same venue with moderate similarity (>= 0.55)
      const isDupe =
        (existing.sourceUrl && cand.sourceUrl && existing.sourceUrl === cand.sourceUrl) ||
        sim >= 0.8 ||
        (sameDate && sim >= 0.55) ||
        (sameVenue && sim >= 0.55);

      if (isDupe) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex >= 0) {
      const existing = merged[duplicateIndex];
      const existingScore = candidateRichness(existing);
      const candScore = candidateRichness(cand);

      // Keep the richer candidate as base, fill in missing fields from the other
      const winner = candScore > existingScore ? { ...cand } : { ...existing };
      const loser = winner === cand ? existing : cand;

      if (!winner.coverImage && loser.coverImage) winner.coverImage = loser.coverImage;
      if ((!winner.coverImages || winner.coverImages.length === 0) && loser.coverImages) {
        winner.coverImages = loser.coverImages;
      }
      if ((!winner.organizerEmail || winner.organizerEmail === '') && loser.organizerEmail) {
        winner.organizerEmail = loser.organizerEmail;
      }
      if ((!winner.address || winner.address === winner.venueName) && loser.address) {
        winner.address = loser.address;
      }
      if ((!winner.formattedDate || winner.formattedDate === 'This Weekend') && loser.formattedDate) {
        winner.formattedDate = loser.formattedDate;
        winner.isoDate = loser.isoDate;
      }
      if (!winner.rawSnippet && loser.rawSnippet) {
        winner.rawSnippet = loser.rawSnippet;
      }

      merged[duplicateIndex] = winner;
    } else {
      merged.push({ ...cand });
    }
  }

  // Sort candidates by data richness (most complete first)
  return merged.sort((a, b) => candidateRichness(b) - candidateRichness(a));
}
