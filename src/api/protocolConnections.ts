/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Protocol consent held by IAM for this person; credentials never leave IAM. */

import type { Client } from './client';
import { record, records, segment } from './fields';

export type ProtocolConsent = {
  signIn: 'direct' | 'device' | 'mediated';
  requested: string[];
  granted: string[];
  resource: string;
  expiresAt: string;
};

export type ProtocolSession = {
  status: 'working' | 'idle' | 'queued' | 'closed';
  responder: 'agent' | 'human';
  at: string;
};

export type ProtocolConnection = {
  reference: string;
  appUid: string;
  protocol: 'pap' | 'pact';
  issuer: string;
  domain: string;
  connectedAt: string;
  lastUsed: string;
  consent: ProtocolConsent | null;
  session: ProtocolSession | null;
};

const BASE = '/api/iam/v1/pap/my/connections';
const SIGN_INS = new Set(['direct', 'device', 'mediated']);
const STATUSES = new Set(['working', 'idle', 'queued', 'closed']);

const strings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? (value as string[]) : null;

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value) && !Number.isNaN(Date.parse(value));

function consentOf(value: unknown): ProtocolConsent | null {
  if (value === null || value === undefined) return null;
  const raw = record(value);
  const requested = strings(raw.requested_scopes);
  const granted = strings(raw.granted_scopes);
  if (!SIGN_INS.has(String(raw.sign_in)) || requested === null || granted === null || typeof raw.resource !== 'string' || !validDate(raw.expires_at)) {
    throw new Error('The consent held for this connection is malformed.');
  }
  return {
    signIn: raw.sign_in as ProtocolConsent['signIn'], requested, granted,
    resource: raw.resource, expiresAt: raw.expires_at
  };
}

function sessionOf(value: unknown): ProtocolSession | null {
  if (value === null || value === undefined) return null;
  const raw = record(value);
  if (!STATUSES.has(String(raw.status)) || (raw.responder !== 'agent' && raw.responder !== 'human') || !validDate(raw.at)) {
    throw new Error('The protocol Session held for this connection is malformed.');
  }
  return { status: raw.status as ProtocolSession['status'], responder: raw.responder, at: raw.at };
}

export function protocolConnectionOf(value: unknown): ProtocolConnection {
  const raw = record(value);
  const required = ['reference', 'tenant_id', 'issuer', 'connected_at', 'last_used'] as const;
  if (required.some(key => typeof raw[key] !== 'string' || !raw[key]) || (raw.protocol !== 'pap' && raw.protocol !== 'pact')) {
    throw new Error('A protocol connection is malformed.');
  }
  let domain: string;
  try {
    domain = new URL(raw.issuer as string).hostname;
  } catch {
    throw new Error('A protocol connection has an invalid issuer.');
  }
  const consent = consentOf(raw.consent);
  if (raw.protocol === 'pact') {
    const pactDomain = record(raw.consent).domain;
    if (typeof pactDomain === 'string' && pactDomain) domain = pactDomain;
  }
  return {
    reference: raw.reference as string,
    appUid: raw.tenant_id as string,
    protocol: raw.protocol,
    issuer: raw.issuer as string,
    domain,
    connectedAt: raw.connected_at as string,
    lastUsed: raw.last_used as string,
    consent,
    session: sessionOf(raw.session)
  };
}

export async function listProtocolConnections(client: Client): Promise<ProtocolConnection[]> {
  const body = await client(BASE);
  return records(body.connections).map(protocolConnectionOf).sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
}

export async function disconnectProtocolConnection(
  client: Client,
  reference: string
): Promise<{ revokedAtCounterpart: boolean }> {
  const body = await client(`${BASE}/${segment(reference)}`, { method: 'DELETE' });
  if (body.disconnected !== true) throw new Error('The connection was not disconnected.');
  return { revokedAtCounterpart: body.revoked_at_company === true };
}

export const signInWords = (signIn: ProtocolConsent['signIn']): string =>
  ({ direct: 'Signed in in a window', device: 'Signed in with a code', mediated: 'Signed in in a protected form' })[signIn];

export function consentWords(consent: ProtocolConsent | null, now = Date.now()): string {
  if (!consent) return 'No consent is on record.';
  if (Date.parse(consent.expiresAt) <= now) return `Consent ended ${new Date(consent.expiresAt).toLocaleDateString()}.`;
  const allowed = consent.granted.length ? consent.granted.join(', ') : 'nothing';
  return `${signInWords(consent.signIn)} · allowed ${allowed} · until ${new Date(consent.expiresAt).toLocaleDateString()}`;
}

export function sessionWords(session: ProtocolSession | null): string {
  if (!session) return 'No conversation yet.';
  const status = { working: 'Working on it', idle: 'Waiting for the next message', queued: 'Queued', closed: 'Closed' }[session.status];
  return `${status}, answered by ${session.responder === 'agent' ? 'its agent' : 'a person'}.`;
}
