/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { personOf, type Person } from '@datalayer/core/lib/portable';
import type { Client } from '../api/client';

export { personOf, type Person };

/** The person a token belongs to: `GET /api/iam/v1/me`. */
export async function whoIs(client: Client, token?: string): Promise<Person> {
  const body = await client<{ me?: unknown }>('/api/iam/v1/me', { token });
  const person = personOf(body.me);
  if (!person) {
    throw new Error('IAM answered without a person.');
  }
  return person;
}

/** The interim sign-in: handle and password, as the web's simple sign-in. */
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
