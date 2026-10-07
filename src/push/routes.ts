/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a tapped notification may open (M-025). A push carries only a kind, an
 * opaque id and a route; the route is checked against the screens a push may
 * name, and the screen fetches and authorizes the item again when it opens.
 */

/** The payload version this build reads; a newer one opens the inbox. */
export const PAYLOAD_VERSION = 1;

const ROUTES = [/^\/$/, /^\/approvals\/[A-Za-z0-9_-]{1,128}$/, /^\/apps\/[A-Za-z0-9_-]{1,128}$/];

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

/** The categories a person chooses, as the server names them (ai-agents `datalayer_solr.push`). */
export const PUSH_CATEGORIES = [
  { value: 'approvals', label: 'Approvals waiting for you' },
  { value: 'attention', label: 'Something needs your attention' },
  { value: 'failures', label: 'Runs that stopped' },
  { value: 'completions', label: 'Work that finished' }
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number]['value'];

export type PushPreference = { enabled: boolean; categories: PushCategory[] };

export const DEFAULT_PUSH_PREFERENCE: PushPreference = { enabled: false, categories: ['approvals', 'attention', 'failures'] };

const isCategory = (value: unknown): value is PushCategory => PUSH_CATEGORIES.some(category => category.value === value);

export function pushPreferenceOf(raw: string | null): PushPreference {
  if (!raw) {
    return DEFAULT_PUSH_PREFERENCE;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      enabled: parsed.enabled === true,
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter(isCategory) : DEFAULT_PUSH_PREFERENCE.categories
    };
  } catch {
    return DEFAULT_PUSH_PREFERENCE;
  }
}
