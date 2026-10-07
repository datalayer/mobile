/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What went wrong, as a person is told it (M-013). */
export type ProblemKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'unavailable'
  | 'timeout'
  | 'offline'
  | 'unexpected';

export const PROBLEM_WORDS: Record<ProblemKind, string> = {
  unauthenticated: 'Your session has ended. Sign in again.',
  forbidden: 'You do not have access to this.',
  'not-found': 'This item is no longer available.',
  conflict: 'This changed somewhere else. It has been refreshed.',
  'rate-limited': 'Too many requests. Try again in a moment.',
  unavailable: 'Datalayer is not answering right now. Try again.',
  timeout: 'This is taking too long. Try again.',
  offline: 'You are offline. Connect to continue.',
  unexpected: 'Something went wrong.'
};

/** A failed request: the person's words, and the detail behind *Details*. */
export class Problem extends Error {
  readonly kind: ProblemKind;
  readonly status?: number;
  /** For *Details* only; never a token, a prompt or tool arguments. */
  readonly detail: string;

  constructor(kind: ProblemKind, detail: string, status?: number) {
    super(PROBLEM_WORDS[kind]);
    this.name = 'Problem';
    this.kind = kind;
    this.detail = detail;
    this.status = status;
  }
}

export function kindOfStatus(status: number): ProblemKind {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate-limited';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'unexpected';
}

/** The detail a server gave, without query values that could carry a token. */
export function detailOf(method: string, url: string, status: number, body: unknown): string {
  const path = url.split('?')[0];
  const said =
    body && typeof body === 'object'
      ? ((body as Record<string, unknown>).detail ?? (body as Record<string, unknown>).message)
      : undefined;
  return `${method} ${path} → ${status}${typeof said === 'string' ? `: ${said}` : ''}`;
}

export const isProblem = (error: unknown): error is Problem => error instanceof Problem;
