/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Client } from '../api/client';

/** The signed-in person, as far as the shell needs one. */
export type Person = {
  uid: string;
  handle: string;
  displayName: string;
  avatarIcon?: string;
};

// Thin adapter until Core's client entry point exports its user model (M-002).
export function personOf(raw: unknown): Person | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const user = raw as Record<string, unknown>;
  const handle = typeof user.handle_s === 'string' ? user.handle_s : '';
  const uid = typeof user.uid === 'string' ? user.uid : '';
  if (!handle || !uid) {
    return undefined;
  }
  const names = [user.first_name_t, user.last_name_t].filter((part): part is string => typeof part === 'string' && part.trim() !== '');
  return {
    uid,
    handle,
    displayName: names.length ? names.join(' ') : handle,
    avatarIcon: typeof user.avatar_icon_s === 'string' ? user.avatar_icon_s : undefined
  };
}

/** The person a token belongs to: `GET /api/iam/v1/me`. */
export async function whoIs(client: Client, token?: string): Promise<Person> {
  const body = await client<{ me?: unknown }>('/api/iam/v1/me', { token });
  const person = personOf(body.me);
  if (!person) {
    throw new Error('IAM answered without a person.');
  }
  return person;
}

/** The interim sign-in of MOBILE.md §5.5: handle and password, as the web's simple sign-in. */
export async function logIn(client: Client, handle: string, password: string): Promise<string> {
  const body = await client<{ token?: unknown }>('/api/iam/v1/login', {
    method: 'POST',
    body: { handle, password }
  });
  if (typeof body.token !== 'string' || !body.token) {
    throw new Error('IAM answered without a token.');
  }
  return body.token;
}
