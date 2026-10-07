/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Problem, detailOf, kindOfStatus } from './problems';

export type ClientOptions = {
  baseUrl: string;
  getAccessToken: () => string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** A token to use instead of the session's: the interim sign-in checks one before keeping it. */
  token?: string;
  signal?: AbortSignal;
};

export type Client = <T = Record<string, unknown>>(path: string, options?: RequestOptions) => Promise<T>;

/**
 * A JSON client of the Datalayer services, with the session's token and the
 * errors of M-013. It keeps no state of its own; retries belong to the caller.
 */
export function createClient({ baseUrl, getAccessToken, fetch: fetcher = fetch, timeoutMs = 20000 }: ClientOptions): Client {
  return async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
    const method = options.method ?? 'GET';
    const url = `${baseUrl}${path}`;
    const token = options.token ?? getAccessToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), timeoutMs);
    options.signal?.addEventListener('abort', () => timeout.abort());

    let response: Response;
    try {
      response = await fetcher(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: timeout.signal
      });
    } catch (error) {
      if (timeout.signal.aborted && !options.signal?.aborted) {
        throw new Problem('timeout', `${method} ${path} timed out after ${timeoutMs} ms`);
      }
      throw new Problem('offline', `${method} ${path}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }

    const body = await response.json().catch(() => undefined);
    if (!response.ok || (body && typeof body === 'object' && (body as Record<string, unknown>).success === false)) {
      const status = response.ok ? 400 : response.status;
      throw new Problem(kindOfStatus(status), detailOf(method, url, status, body), status);
    }
    return (body ?? {}) as T;
  };
}
