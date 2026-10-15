/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an approval asks, in words: Agent Runtimes' shared approval card
 * controller (`portable/approvalCard`, M-016) — the message whole, or every
 * argument; why it asked apart — as the web's *Waiting for you* says it.
 */

import {
  actionOf,
  APPROVAL_CARD_WORDS,
  approvalCardOf,
  argumentsShown,
  messageOfApproval,
  whyAsked,
  type MessageAsked
} from '@datalayer/agent-runtimes/lib/portable';
import type { Approval } from '../../api/approvals';

export { actionOf, approvalCardOf, argumentsShown, messageOfApproval, whyAsked, type MessageAsked };

export const APPROVAL_WORDS = APPROVAL_CARD_WORDS;

const said = (approval: Pick<Approval, 'toolArgs'>, key: string): string => {
  const value = approval.toolArgs[key];
  return typeof value === 'string' ? value : '';
};

/** The application it is of, when the runtime marked it. */
export const applicationOf = (approval: Pick<Approval, 'toolArgs' | 'agentId'>): string =>
  said(approval, 'application') || said(approval, '_app') || approval.agentId;

/** One line for a list row: a mail says recipients and subject, never its body. */
export const rowSummary = (approval: Approval): string => approvalCardOf(approval).summary;
