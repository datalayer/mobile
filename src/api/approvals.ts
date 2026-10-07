/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Tool approvals, from `/api/ai-agents/v1/tool-approvals`. Read-only in Phase 1 except mark-read. */

import type { Client } from './client';
import { count, type Raw, record, records, segment, text } from './fields';

export type Approval = {
  id: string;
  agentId: string;
  runtimeName: string;
  toolName: string;
  toolArgs: Raw;
  status: string;
  read: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export function approvalOf(raw: Raw): Approval {
  return {
    id: text(raw.id),
    agentId: text(raw.agent_id),
    runtimeName: text(raw.runtime_name),
    toolName: text(raw.tool_name),
    toolArgs: record(raw.tool_args),
    status: text(raw.status) || 'pending',
    read: Boolean(raw.read),
    note: text(raw.note),
    createdAt: text(raw.created_at),
    updatedAt: text(raw.updated_at)
  };
}

/** Pending approvals, oldest first: the waiting run is blocked. */
export const waitingFirst = (approvals: readonly Approval[]): Approval[] =>
  approvals.filter(a => a.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const BASE = '/api/ai-agents/v1/tool-approvals';

export async function listPending(client: Client): Promise<Approval[]> {
  const body = await client(`${BASE}?status=pending&limit=200`);
  return waitingFirst(records(body.approvals).map(approvalOf));
}

export async function pendingCount(client: Client): Promise<number> {
  return count((await client(`${BASE}/pending/count`)).count);
}

export async function getApproval(client: Client, id: string): Promise<Approval> {
  return approvalOf(await client(`${BASE}/${segment(id)}`));
}

export async function markRead(client: Client, id: string): Promise<Approval> {
  const body = await client(`${BASE}/${segment(id)}/mark-read`, { method: 'POST' });
  return approvalOf(record(body.approval));
}

export type Decision = 'approve' | 'reject';

/** Through the audited route; a 409 says another surface or the deadline answered first, a 503 that the run could not be told. */
export async function decide(client: Client, id: string, decision: Decision, note?: string): Promise<Approval> {
  const trimmed = note?.trim();
  const body = await client(`${BASE}/${segment(id)}/${decision}`, {
    method: 'POST',
    body: trimmed ? { note: trimmed } : {}
  });
  return approvalOf(record(body.approval));
}
