/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A person deletes their own account (MOBILE M-052, decided by the user on
 * 16 October 2026): they ask IAM, typing their handle to confirm; a grace
 * period runs, during which the account works and the request can be
 * withdrawn; then the account is deleted. The web's profile settings carry
 * the same control. Pure, but for the three calls.
 */

import type { Client } from './client';
import { record } from './fields';

export const DELETION_PATH = '/api/iam/v1/me/deletion';

export type DeletionRequest = { requestedAt: string; dueAt: string; graceDays: number };

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value) && !Number.isNaN(Date.parse(value));

/** IAM's answer: the pending request, or null when none is; anything else is an error, never a guess. */
export function deletionOf(body: unknown): DeletionRequest | null {
  const raw = record(body);
  if (!('request' in raw)) {
    throw new Error('IAM did not say whether a deletion is pending.');
  }
  if (raw.request === null) {
    return null;
  }
  const request = record(raw.request);
  const graceDays = request.grace_days;
  if (!validDate(request.requested_at) || !validDate(request.due_at) || typeof graceDays !== 'number' || graceDays <= 0) {
    throw new Error('The pending account deletion is malformed.');
  }
  return { requestedAt: request.requested_at, dueAt: request.due_at, graceDays };
}

/** Whether what was typed confirms the deletion: the handle exactly, spaces around it aside. */
export const confirms = (handle: string, typed: string): boolean => Boolean(handle) && typed.trim() === handle;

export async function readDeletion(client: Client): Promise<DeletionRequest | null> {
  return deletionOf(await client(DELETION_PATH));
}

export async function requestDeletion(client: Client, handle: string): Promise<DeletionRequest> {
  const request = deletionOf(await client(DELETION_PATH, { method: 'POST', body: { confirm: handle } }));
  if (!request) {
    throw new Error('IAM did not record the deletion.');
  }
  return request;
}

export async function cancelDeletion(client: Client): Promise<void> {
  await client(DELETION_PATH, { method: 'DELETE' });
}

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export const DELETION_WORDS = {
  title: 'Delete your account',
  explain:
    'Your account and what it holds — spaces, notebooks and documents, applications and their deployments, API keys and sign-ins — are deleted after a grace period. Until then everything works as before, and you can cancel here or on the web. An email confirms the date.',
  typeHandle: (handle: string) => `Type your handle, ${handle}, to confirm.`,
  ask: 'Delete my account',
  askTitle: 'Delete your account?',
  askBody: 'It is deleted when the grace period ends. You can cancel until then.',
  pending: (request: DeletionRequest) => `Your account will be deleted on ${day(request.dueAt)}, ${request.graceDays} days after you asked.`,
  askedOn: (request: DeletionRequest) => `Asked on ${day(request.requestedAt)}.`,
  cancel: 'Keep my account',
  cancelled: 'Your account is kept.'
} as const;
