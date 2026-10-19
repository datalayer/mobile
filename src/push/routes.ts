/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a tapped notification may open. A push carries only a kind, an
 * opaque id and a route; the route is checked against the screens a push may
 * name, and the screen fetches and authorizes the item again when it opens.
 */

/** The payload version this build reads; a newer one opens the inbox. */
export const PAYLOAD_VERSION = 1;

const ROUTES = [
  /^\/$/,
  /^\/approvals\/[A-Za-z0-9_-]{1,128}$/,
  /^\/apps\/[A-Za-z0-9_-]{1,128}$/,
  /^\/apps\/[A-Za-z0-9_-]{1,128}\/protocols$/,
  // A conversation that waits for an answer: opened through ai-agents' locator, which checks access again.
  /^\/apps\/[A-Za-z0-9_-]{1,128}\/sessions\/[A-Za-z0-9_-]{1,128}$/
];

/** The route to open for a tapped notification's data, or `null` to stay where it is. */
export function routeOfNotification(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const { v, route } = data as Record<string, unknown>;
  if (v !== PAYLOAD_VERSION) {
    return '/';
  }
  return typeof route === 'string' && ROUTES.some(pattern => pattern.test(route)) ? route : '/';
}

/** Consume one tap, including the safe Inbox fallback for an invalid/new payload. */
export function openNotification(data: unknown, open: (route: string) => void): boolean {
  const route = routeOfNotification(data);
  if (!route) return false;
  open(route);
  return true;
}

/** The categories a person chooses, as the server names them (ai-agents `datalayer_solr.push`). */
export const PUSH_CATEGORIES = [
  { value: 'approvals', label: 'Approvals waiting for you' },
  { value: 'attention', label: 'Something needs your attention' },
  { value: 'failures', label: 'Runs that stopped' },
  { value: 'completions', label: 'Work that finished' }
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number]['value'];

/** Quiet hours, as the server keeps them: `HH:MM` in an IANA time zone. */
export type QuietHours = { start: string; end: string; tz: string };

export type PushPreference = {
  enabled: boolean;
  categories: PushCategory[];
  /** Quiet hours: what can wait is held until they end; `null` for none. */
  quietHours: QuietHours | null;
  /** Approvals are pushed through quiet hours (yes unless turned off). */
  approvalsInQuiet: boolean;
  /** An application told otherwise than the rest: its categories; `[]` sends nothing of it. */
  appCategories: Record<string, PushCategory[]>;
};

export const DEFAULT_PUSH_PREFERENCE: PushPreference = {
  enabled: false,
  categories: ['approvals', 'attention', 'failures'],
  quietHours: null,
  approvalsInQuiet: true,
  appCategories: {}
};

/** The quiet hours offered first: ten at night to seven in the morning. */
export const DEFAULT_QUIET_START = '22:00';
export const DEFAULT_QUIET_END = '07:00';

/** The times of day quiet hours start or end at, on the hour. */
export const QUIET_TIMES: readonly { label: string; value: string }[] = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { label: value, value };
});

const isCategory = (value: unknown): value is PushCategory => PUSH_CATEGORIES.some(category => category.value === value);
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** Quiet hours as kept, or `null` for anything else (a start equal to its end included). */
export function quietHoursOf(raw: unknown): QuietHours | null {
  if (!raw || typeof raw !== 'object') return null;
  const { start, end, tz } = raw as Record<string, unknown>;
  return typeof start === 'string' && typeof end === 'string' && typeof tz === 'string' && TIME.test(start) && TIME.test(end) && start !== end && tz
    ? { start, end, tz }
    : null;
}

function appCategoriesOf(raw: unknown): Record<string, PushCategory[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([uid, categories]) => uid && Array.isArray(categories))
      .map(([uid, categories]) => [uid, (categories as unknown[]).filter(isCategory)])
  );
}

export function pushPreferenceOf(raw: string | null): PushPreference {
  if (!raw) {
    return DEFAULT_PUSH_PREFERENCE;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      enabled: parsed.enabled === true,
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter(isCategory) : DEFAULT_PUSH_PREFERENCE.categories,
      quietHours: quietHoursOf(parsed.quietHours),
      approvalsInQuiet: parsed.approvalsInQuiet !== false,
      appCategories: appCategoriesOf(parsed.appCategories)
    };
  } catch {
    return DEFAULT_PUSH_PREFERENCE;
  }
}

/** What an application sends this phone: as the person chose for it, else as for every application. */
export const categoriesOfApp = (preference: PushPreference, appUid: string): PushCategory[] =>
  preference.appCategories[appUid] ?? preference.categories;

/** The preference with one application told otherwise — or, `null`, as every other again. */
export function withAppCategories(preference: PushPreference, appUid: string, categories: PushCategory[] | null): PushPreference {
  const { [appUid]: _dropped, ...others } = preference.appCategories;
  return { ...preference, appCategories: categories === null ? others : { ...others, [appUid]: categories } };
}

/** What quiet hours do, in a sentence the settings say. */
export function quietWords(preference: PushPreference): string {
  if (!preference.quietHours) {
    return 'Off: everything you turned on is sent when it happens.';
  }
  const { start, end } = preference.quietHours;
  return preference.approvalsInQuiet
    ? `From ${start} to ${end}, only approvals are sent; the rest waits until ${end}. Nothing waits in the app.`
    : `From ${start} to ${end}, nothing is sent; it waits until ${end}. Nothing waits in the app.`;
}
