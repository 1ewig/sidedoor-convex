import { LocalEvent, SearchFilterState } from '@/types';

/**
 * Pure predicate to evaluate if an event passes the active scout filter preferences.
 * Eliminates duplication across feed memoization and telemetry verification.
 */
export function matchesSearchFilters(event: LocalEvent, filters: SearchFilterState): boolean {
  // Radius check: apply to local/regional events within 300 km.
  // If an event is in a remote destination explicitly queried by the user (> 300 km),
  // do not suppress it with a local base radius filter.
  if (
    typeof event.distanceKm === 'number' &&
    event.distanceKm <= 300 &&
    event.distanceKm > filters.radiusKm
  ) {
    return false;
  }

  // Category check
  if (filters.category !== 'all' && event.category !== filters.category) {
    return false;
  }

  // Free admission check
  if (filters.onlyFree && !event.isFree) {
    return false;
  }

  // Minimum vibe match confidence score check
  if (event.matchScore < filters.minScore) {
    return false;
  }

  return true;
}
