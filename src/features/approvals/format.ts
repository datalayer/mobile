/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an approval asks, in words. `messageOfApproval` mirrors the web
 * `views/studio/apps/appApprovals.ts` implementation and shares its fixtures
 * (see `src/test/approvalFormat.test.ts`).
 */

import type { Approval } from '../../api/approvals';

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

export type MessageAsked = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  forwards: boolean;
  replies: boolean;
};

const said = (approval: ApprovalLike, key: string): string => {
  const value = approval.toolArgs[key];
  return typeof value === 'string' ? value : '';
};

const addressed = (value: unknown): string =>
  Array.isArray(value)
    ? value.filter(item => typeof item === 'string').join(', ')
    : typeof value === 'string'
      ? value
      : '';

/** The whole message a send asks for; `null` for anything that is not a mail. */
export function messageOfApproval(approval: ApprovalLike): MessageAsked | null {
  const args = approval.toolArgs;
  const to = addressed(args.to);
  if (!to || typeof args.body !== 'string') {
    return null;
  }
  return {
    to,
    cc: addressed(args.cc),
    bcc: addressed(args.bcc),
    subject: said(approval, 'subject'),
    body: args.body,
    forwards: Boolean(said(approval, 'forward_message_id')),
    replies: Boolean(said(approval, 'thread_id') || said(approval, 'in_reply_to'))
  };
}

/** The rule (`_rule`) or check (`_check`) that asked. */
export const whyAsked = (approval: ApprovalLike): string => said(approval, '_rule') || said(approval, '_check');

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
