/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Problem, detailOf, kindOfStatus } from '@datalayer/core/lib/portable';

export type ClientOptions = {
  /** One host for every route, or the host of each route (`serviceUrlOf`: the two planes). */
  baseUrl: string | ((path: string) => string);
  getAccessToken: () => string | undefined;
  /** A fresh access token after a 401, or `undefined` when there is none to be had. */
  refreshAccessToken?: () => Promise<string | undefined>;
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
 * errors of M-013. A `401` is refreshed once and the request sent again — the
 * server acted on nothing it could not authenticate; other retries belong to
 * the caller.
 */
export function createClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken,
  fetch: fetcher = fetch,
  timeoutMs = 20000
}: ClientOptions): Client {
  const send = async <T,>(path: string, options: RequestOptions, token: string | undefined, retried: boolean): Promise<T> => {
    const method = options.method ?? 'GET';
    const url = `${typeof baseUrl === 'function' ? baseUrl(path) : baseUrl}${path}`;
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
    if (response.status === 401 && !retried && !options.token && refreshAccessToken) {
      const fresh = await refreshAccessToken().catch(() => undefined);
      if (fresh && fresh !== token) {
        return send<T>(path, options, fresh, true);
      }
    }
    if (!response.ok || (body && typeof body === 'object' && (body as Record<string, unknown>).success === false)) {
      const status = response.ok ? 400 : response.status;
      throw new Problem(kindOfStatus(status), detailOf(method, url, status, body), status);
    }
    return (body ?? {}) as T;
  };
  return <T,>(path: string, options: RequestOptions = {}) => send<T>(path, options, options.token ?? getAccessToken(), false);
}
