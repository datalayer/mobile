/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Strict presentation readers for protocol proposals carried by the existing approval API. */

import type { Approval } from '../api/approvals';

export type TermRow = { label: string; value: string };

export type PapOperation = {
  kind: 'pap-operation';
  company: string;
  summary: string;
  action: string;
  terms: TermRow[];
  revision: number;
  reference: string;
  expiresAt: string;
  session: { reference: string; signedIn: boolean } | null;
  previousRevision: number | null;
  changes: { label: string; before: string; after: string }[];
};

export type ProtocolPurchase = {
  kind: 'protocol-purchase';
  merchant: string;
  protocol: 'UCP' | 'ACP';
  summary: string;
  lines: { title: string; quantity: number; price: string }[];
  tax: string | null;
  total: string;
  revision: string;
};

export type ProtocolApproval = PapOperation | ProtocolPurchase;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const nonEmpty = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const integer = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const labelOf = (key: string): string => {
  const words = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return words ? `${words[0]!.toUpperCase()}${words.slice(1)}` : key;
};

const minorDigits = (currency: string): number => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
};

/** Money in major units, as PAP terms carry it. */
const papMoney = (value: unknown): string | null => {
  const money = asRecord(value);
  if (!money || Object.keys(money).some(key => key !== 'amount' && key !== 'currency')) return null;
  const currency = nonEmpty(money.currency)?.toUpperCase();
  const amount =
    typeof money.amount === 'number'
      ? money.amount
      : typeof money.amount === 'string' && /^-?\d+(\.\d+)?$/.test(money.amount.trim())
        ? Number(money.amount)
        : NaN;
  if (!currency || !/^[A-Z]{3}$/.test(currency) || !Number.isFinite(amount)) return null;
  return `${currency} ${amount.toFixed(minorDigits(currency))}`;
};

const valueOf = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const money = papMoney(value);
  if (money) return money;
  if (Array.isArray(value)) return value.length ? value.map(valueOf).join(', ') : 'None';
  const nested = asRecord(value);
  return nested ? Object.entries(nested).map(([key, inner]) => `${labelOf(key)}: ${valueOf(inner)}`).join('; ') || 'None' : String(value);
};

const rowsOf = (value: unknown): TermRow[] => {
  const terms = asRecord(value);
  return terms ? Object.entries(terms).map(([key, item]) => ({ label: labelOf(key), value: valueOf(item) })) : [];
};

const changesOf = (before: unknown, after: unknown): { label: string; before: string; after: string }[] => {
  const oldTerms = asRecord(before) ?? {};
  const newTerms = asRecord(after) ?? {};
  const keys = [...Object.keys(newTerms), ...Object.keys(oldTerms).filter(key => !(key in newTerms))];
  return keys
    .map(key => ({ label: labelOf(key), before: valueOf(oldTerms[key]), after: valueOf(newTerms[key]) }))
    .filter(change => change.before !== change.after);
};

const actionOf = (value: unknown): string | null =>
  value === 'buy' ? 'Buy' : value === 'write' ? 'Create or change' : value === 'delete' ? 'Delete' : null;

export function papOperationOf(approval: Approval): PapOperation | null {
  if (approval.toolName !== 'pap_confirm' || approval.runtimeName !== 'pap') return null;
  const args = approval.toolArgs;
  const company = nonEmpty(args.company);
  const summary = nonEmpty(args.summary);
  const reference = nonEmpty(args.operation_ref);
  const revision = integer(args.revision);
  const terms = asRecord(args.terms);
  const action = actionOf(args.class);
  if (!company || !summary || !reference || revision === null || !terms || !action) return null;

  const rawSession = asRecord(args.session);
  const sessionReference = rawSession ? nonEmpty(rawSession.ref) : null;
  const session =
    sessionReference && /^[0-9a-f]{6,64}$/.test(sessionReference) && typeof rawSession?.signed_in === 'boolean'
      ? { reference: sessionReference, signedIn: rawSession.signed_in }
      : null;
  const was = asRecord(args.was);
  const previousRevision = was ? integer(was.revision) : null;

  return {
    kind: 'pap-operation', company, summary, action, terms: rowsOf(terms), revision, reference,
    expiresAt: approval.expiresAt, session, previousRevision,
    changes: previousRevision === null ? [] : changesOf(was?.terms, terms)
  };
}

/** Money in minor units, as the commerce gateway's approval carries it. */
export function minorMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const digits = minorDigits(code);
  return `${code} ${(amount / 10 ** digits).toFixed(digits)}`;
}

export function protocolPurchaseOf(approval: Approval): ProtocolPurchase | null {
  if (!['ucp_complete', 'acp_complete'].includes(approval.toolName) || approval.runtimeName !== 'commerce') return null;
  const args = approval.toolArgs;
  const merchant = nonEmpty(args.merchant);
  const summary = nonEmpty(args.summary);
  const currency = nonEmpty(args.currency)?.toUpperCase();
  const revision = nonEmpty(args.revision);
  const protocol = args.protocol === 'ucp' ? 'UCP' : args.protocol === 'acp' ? 'ACP' : null;
  const total = integer(args.total);
  const tax = args.tax === undefined ? null : integer(args.tax);
  const rawLines = Array.isArray(args.lines) ? args.lines : null;
  if (!merchant || !summary || !currency || !/^[A-Z]{3}$/.test(currency) || !revision || !protocol || total === null || (tax === null && args.tax !== undefined) || !rawLines) return null;

  const parsedLines = rawLines.map(item => {
    const line = asRecord(item);
    const title = line ? nonEmpty(line.title) : null;
    const quantity = line ? integer(line.quantity) : null;
    const price = line ? integer(line.price) : null;
    return title && quantity !== null && quantity > 0 && price !== null ? { title, quantity, price: minorMoney(price, currency) } : null;
  });
  if (parsedLines.some(line => line === null) || parsedLines.length === 0) return null;

  return {
    kind: 'protocol-purchase', merchant, protocol, summary,
    lines: parsedLines as ProtocolPurchase['lines'], tax: tax === null ? null : minorMoney(tax, currency),
    total: minorMoney(total, currency), revision
  };
}

export const isKnownProtocolApproval = (approval: Approval): boolean =>
  approval.toolName === 'pap_confirm' || ['ucp_complete', 'acp_complete'].includes(approval.toolName);

export const protocolApprovalOf = (approval: Approval): ProtocolApproval | null =>
  papOperationOf(approval) ?? protocolPurchaseOf(approval);
