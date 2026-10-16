/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Localised absolute time, plus relative wording for screen readers and rows.
 *
 * The relative wording is the app's own English, like every other word of the app:
 * Hermes has no Intl.RelativeTimeFormat (only Collator, DateTimeFormat and NumberFormat),
 * and `new Intl.RelativeTimeFormat` threw "undefined cannot be used as a constructor"
 * in the release build, blanking the Inbox (Maestro, run 38901889765, 16 October 2026).
 * check-forbidden-imports.js keeps the Intl constructors Hermes lacks out of the sources.
 */

const UNITS: [string, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1]
];

const parse = (iso: string): number | null => {
  if (!iso) {
    return null;
  }
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

/** "in 1 hour", "3 days ago", "yesterday", "tomorrow", "now". */
export function relativeTime(iso: string, now = Date.now()): string {
  const t = parse(iso);
  if (t === null) {
    return '';
  }
  const seconds = Math.round((t - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      const count = Math.round(seconds / size);
      if (count === 0) {
        return 'now';
      }
      if (unit === 'day' && Math.abs(count) === 1) {
        return count > 0 ? 'tomorrow' : 'yesterday';
      }
      const words = `${Math.abs(count)} ${unit}${Math.abs(count) === 1 ? '' : 's'}`;
      return count > 0 ? `in ${words}` : `${words} ago`;
    }
  }
  return '';
}

export function absoluteTime(iso: string, locale?: string): string {
  const t = parse(iso);
  return t === null ? '' : new Date(t).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}
