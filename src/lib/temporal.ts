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

/**
 * Formats a timestamp, ISO string, or date into a clean relative time label (e.g., "Just now", "5m ago", "2h ago", "Yesterday", "Oct 24").
 */
export function formatRelativeTime(dateInput?: string | number | null): string {
  if (!dateInput) return 'Just now';

  // If input is legacy hardcoded "Just now" or cannot be parsed, handle gracefully
  if (dateInput === 'Just now' || dateInput === 'Now') return 'Just now';

  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());

  if (diffMs < 60_000) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
}

/**
 * Formats a timestamp or ISO string for conversation bubbles (e.g., "Just now", "4:15 PM", "Yesterday, 4:15 PM", "Oct 24, 4:15 PM").
 */
export function formatMessageTime(dateInput?: string | number | null): string {
  if (!dateInput) return 'Just now';

  if (dateInput === 'Just now') return 'Just now';

  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());

  if (diffMs < 60_000) {
    return 'Just now';
  }

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const nowDate = new Date();
  const isSameDay =
    date.getDate() === nowDate.getDate() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getFullYear() === nowDate.getFullYear();

  if (isSameDay) {
    return timeStr;
  }

  const yesterday = new Date();
  yesterday.setDate(nowDate.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== nowDate.getFullYear() ? { year: 'numeric' } : {}),
  });

  return `${dateStr}, ${timeStr}`;
}