/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Localised absolute time, plus relative wording for screen readers and rows. */

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
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

export function relativeTime(iso: string, now = Date.now(), locale?: string): string {
  const t = parse(iso);
  if (t === null) {
    return '';
  }
  const seconds = Math.round((t - now) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return format.format(Math.round(seconds / size), unit);
    }
  }
  return '';
}

export function absoluteTime(iso: string, locale?: string): string {
  const t = parse(iso);
  return t === null ? '' : new Date(t).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}
