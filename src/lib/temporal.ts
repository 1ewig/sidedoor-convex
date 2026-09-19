/**
 * Temporal anchoring utilities for the discovery pipeline.
 * Pure date math — no I/O, no AI, fully deterministic per invocation.
 */

export interface TemporalContext {
  currentDateStr: string;
  weekendStr: string;
  monthYearStr: string;
  targetWeekendRange: { start: Date; end: Date };
}

/**
 * Calculates current date and upcoming weekend strings for accurate temporal query anchoring
 */
export function getTemporalContext(): TemporalContext {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const currentDateStr = now.toLocaleDateString('en-US', options);

  // Determine upcoming weekend or current weekend dates
  // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
  const day = now.getDay();
  const fridayOffset = day === 6 ? -1 : day === 0 ? -2 : (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + fridayOffset);

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const mF = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const mS = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const mSu = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const weekendStr = `${mF}, ${mS}, and ${mSu}`;
  const monthYearStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const start = new Date(friday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(sunday);
  end.setHours(23, 59, 59, 999);

  return { currentDateStr, weekendStr, monthYearStr, targetWeekendRange: { start, end } };
}