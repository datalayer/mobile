/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What an approval asks, in words. The message and its reason come from Agent Runtimes' portable entry, as the web's do. */

import { messageOfApproval, whyAsked, type MessageAsked } from '@datalayer/agent-runtimes/lib/portable';
import type { Approval } from '../../api/approvals';

export { messageOfApproval, whyAsked, type MessageAsked };

export const APPROVAL_WORDS = {
  to: 'To',
  cc: 'Cc',
  bcc: 'Bcc',
  subject: 'Subject',
  forwards: 'It forwards a message you received.',
  replies: 'A reply, in its conversation.',
  arguments: 'What it would do',
  why: 'Why it asked',
  noArguments: 'It gave no arguments.'
} as const;

type ApprovalLike = Pick<Approval, 'toolArgs'>;

const said = (approval: ApprovalLike, key: string): string => {
  const value = approval.toolArgs[key];
  return typeof value === 'string' ? value : '';
};

/** The application it is of, when the runtime marked it. */
export const applicationOf = (approval: Pick<Approval, 'toolArgs' | 'agentId'>): string =>
  said(approval, 'application') || said(approval, '_app') || approval.agentId;

/** `send_email` -> `Send email`. */
export const actionOf = (toolName: string): string => {
  const words = toolName.replace(/[_-]+/g, ' ').trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : 'An action';
};

/** One line for a list row: a mail says recipients and subject, never its body. */
export function rowSummary(approval: Approval): string {
  const message = messageOfApproval(approval);
  if (message) {
    return message.subject ? `${message.to} · ${message.subject}` : message.to;
  }
  return whyAsked(approval);
}

/** Every argument, complete, as the raw fallback. Private `_` markers are shown apart as *why*. */
export function argumentsShown(approval: ApprovalLike): string {
  const visible = Object.fromEntries(Object.entries(approval.toolArgs).filter(([key]) => !key.startsWith('_')));
  return Object.keys(visible).length === 0 ? APPROVAL_WORDS.noArguments : JSON.stringify(visible, null, 2);
}
