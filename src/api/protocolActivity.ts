/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** A deliberately small, redacted projection of the shared protocol audit ledger (M-047). */

import type { Client } from './client';
import { count, record, records, segment, text, type Raw } from './fields';

export type Protocol = 'pap' | 'pact' | 'ucp' | 'acp';
export type ProtocolActivityKind = 'consent' | 'operation' | 'purchase' | 'signed_request' | 'receipt';

export type ProtocolActivityRow = {
  uid: string;
  at: string;
  appUid: string;
  deploymentUid: string;
  protocol: Protocol;
  kind: ProtocolActivityKind;
  counterpart: string;
  title: string;
  outcome: string;
  operationRef: string;
  revision: number | null;
  amount: number | null;
  currency: string;
};

export type ProtocolCounterpartHealth = {
  protocol: Protocol;
  counterpart: string;
  lastAt: string;
  outcome: string;
};

const WORDS: Record<string, { kind: ProtocolActivityKind; title: string }> = {
  'pap.sign_in.started': { kind: 'consent', title: 'Sign-in requested' },
  'pap.sign_in.completed': { kind: 'consent', title: 'Consent granted' },
  'pap.scope.granted': { kind: 'consent', title: 'Permissions granted' },
  'pap.sign_out': { kind: 'consent', title: 'Signed out' },
  'pap.revoked': { kind: 'consent', title: 'Consent disconnected' },
  'pact.sign_in.started': { kind: 'consent', title: 'Business sign-in requested' },
  'pact.sign_in.completed': { kind: 'consent', title: 'Business consent granted' },
  'pact.revoked': { kind: 'consent', title: 'Business consent disconnected' },
  'pap.operation.proposed': { kind: 'operation', title: 'Change proposed' },
  'pap.operation.approved': { kind: 'operation', title: 'Change decision recorded' },
  'pap.operation.confirmed': { kind: 'operation', title: 'Change confirmed' },
  'pap.operation.result': { kind: 'receipt', title: 'Change receipt' },
  'pact.message': { kind: 'operation', title: 'Business asked' },
  'pact.message.for_person': { kind: 'operation', title: 'Business asked for you' },
  'ucp.checkout.proposed': { kind: 'purchase', title: 'Test purchase proposed' },
  'ucp.checkout.approved': { kind: 'purchase', title: 'Test purchase approved' },
  'ucp.checkout.declined': { kind: 'purchase', title: 'Test purchase declined' },
  'ucp.checkout.completed': { kind: 'receipt', title: 'Test purchase receipt' },
  'acp.checkout.proposed': { kind: 'purchase', title: 'Test purchase proposed' },
  'acp.checkout.approved': { kind: 'purchase', title: 'Test purchase approved' },
  'acp.checkout.declined': { kind: 'purchase', title: 'Test purchase declined' },
  'acp.checkout.completed': { kind: 'receipt', title: 'Test purchase receipt' },
  'pap.request.signed': { kind: 'signed_request', title: 'Request signed' },
  'pact.request.signed': { kind: 'signed_request', title: 'Request signed' },
  'ucp.request.signed': { kind: 'signed_request', title: 'Request signed' },
  'acp.request.signed': { kind: 'signed_request', title: 'Request signed' }
};

const PROTOCOLS = ['pap', 'pact', 'ucp', 'acp'] as const;
const OUTCOMES: Record<string, string> = { ok: 'Succeeded', error: 'Failed', is_error: 'Failed' };

/** A hostname only. A malformed issuer is not echoed because it may contain a path or secret. */
const counterpartOf = (info: Raw): string => {
  const domain = text(info.domain).toLowerCase();
  if (/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) && domain.includes('.')) return domain;
  try {
    const host = new URL(text(info.company)).hostname.toLowerCase();
    return host && host.includes('.') ? host : 'Counterpart not known';
  } catch {
    return 'Counterpart not known';
  }
};

const outcomeOf = (raw: Raw): string => {
  const decision = text(raw.decision) === 'refused' ? 'Refused' : text(raw.decision) === 'allowed' ? 'Allowed' : '';
  const outcome = OUTCOMES[text(raw.outcome)] ?? '';
  return [decision, outcome].filter(Boolean).join(' · ') || 'Outcome not known';
};

/**
 * Strictly reduce one wire row. Only fields in `ProtocolActivityRow` survive;
 * notably no argument, body, header, path, code, token, proof, scopes or trace id.
 */
export function protocolActivityRowOf(raw: Raw): ProtocolActivityRow | null {
  const method = text(raw.method);
  const words = WORDS[method];
  const protocol = PROTOCOLS.find(value => method.startsWith(`${value}.`));
  const info = record(raw.client_info ?? raw.clientInfo);
  const role = text(info.role);
  const uid = text(raw.uid);
  const at = text(raw.at);
  const appUid = text(raw.app_uid ?? raw.appUid);
  if (!words || !protocol || !uid || !at || !appUid || (role !== 'personal_agent' && role !== 'company')) return null;

  const revisionValue = count(info.revision);
  const revision = Number.isInteger(revisionValue) && revisionValue > 0 ? revisionValue : null;
  const amountValue = info.amount;
  const amount = typeof amountValue === 'number' && Number.isInteger(amountValue) && amountValue >= 0 ? amountValue : null;
  const currency = text(info.currency);
  return {
    uid,
    at,
    appUid,
    deploymentUid: text(raw.deployment_uid ?? raw.deploymentUid),
    protocol,
    kind: words.kind,
    counterpart: counterpartOf(info),
    title: words.title,
    outcome: outcomeOf(raw),
    operationRef: text(info.operation_id),
    revision,
    amount: amount !== null && /^[A-Z]{3}$/.test(currency) ? amount : null,
    currency: amount !== null && /^[A-Z]{3}$/.test(currency) ? currency : ''
  };
}

type AuditPage = { items?: unknown };

/** The signed-in person's protocol rows, newest first, without raw audit payloads leaving this module. */
export async function readProtocolActivity(client: Client, limit = 50): Promise<ProtocolActivityRow[]> {
  const pages = await Promise.all(
    PROTOCOLS.map(protocol => client<AuditPage>(`/api/mcp/v1/audit?method=${protocol}.*&limit=${segment(String(limit))}`))
  );
  return pages
    .flatMap(page => records(page.items).map(protocolActivityRowOf))
    .filter((row): row is ProtocolActivityRow => row !== null)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export const protocolActivityDetail = (row: ProtocolActivityRow): string => {
  const exact = [
    row.operationRef ? `Reference ${row.operationRef}` : '',
    row.revision !== null ? `revision ${row.revision}` : '',
    row.amount !== null ? `${row.currency} ${(row.amount / 100).toFixed(2)}` : ''
  ].filter(Boolean);
  return [row.counterpart, ...exact].join(' · ');
};

const latestCounterparts = (
  rows: readonly ProtocolActivityRow[],
  accepts: (row: ProtocolActivityRow) => boolean
): ProtocolCounterpartHealth[] => {
  const latest = new Map<string, ProtocolCounterpartHealth>();
  for (const row of rows) {
    if (!accepts(row)) continue;
    const key = `${row.protocol}:${row.counterpart}`;
    if (!latest.has(key) || row.at > latest.get(key)!.lastAt) {
      latest.set(key, { protocol: row.protocol, counterpart: row.counterpart, lastAt: row.at, outcome: row.outcome });
    }
  }
  return [...latest.values()];
};

/** Test merchants the application actually contacted, most recent event per merchant and protocol. */
export const testMerchantsOf = (rows: readonly ProtocolActivityRow[], appUid: string): ProtocolCounterpartHealth[] =>
  latestCounterparts(rows, row => row.appUid === appUid && (row.protocol === 'ucp' || row.protocol === 'acp'));

/** Last safe signed-request result per counterpart and protocol; no key, path, body, code or trace. */
export const signedRequestHealthOf = (rows: readonly ProtocolActivityRow[], appUid: string): ProtocolCounterpartHealth[] =>
  latestCounterparts(rows, row => row.appUid === appUid && row.kind === 'signed_request');
