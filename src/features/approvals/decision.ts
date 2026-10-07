/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What the decision flow says (M-020). Pure, so the words are tested apart from the screen. */

import type { Decision } from '../../api/approvals';
import type { Problem } from '../../api/problems';

export const DECISION_WORDS = {
  approve: 'Approve',
  reject: 'Reject',
  note: 'A note, if you want one',
  cancel: 'Cancel',
  sending: 'Sending your answer…',
  stale: 'It was answered somewhere else, or the run waiting on it is over. This is its current state.',
  gone: 'This item is no longer available.',
  unreachable: 'Your answer could not be delivered to the run. It is still waiting; try again.'
} as const;

/** The sheet's title names the action, so what is confirmed is plain. */
export const confirmTitle = (decision: Decision, action: string): string =>
  decision === 'approve' ? `Approve: ${action}?` : `Reject: ${action}?`;

export const STATUS_WORDS: Record<string, string> = {
  pending: 'Waiting for your answer.',
  approved: 'Approved.',
  approved_with_changes: 'Approved with changes.',
  rejected: 'Rejected.',
  expired: 'The run waiting on it is over; it can no longer be answered.'
};

export const statusSays = (status: string): string => STATUS_WORDS[status] ?? status;

/** What a failed decision means for the controls: gone, replaced by the server state, or still pending. */
export type DecisionOutcome = 'gone' | 'stale' | 'retry';

export function outcomeOf(problem: Problem): DecisionOutcome {
  switch (problem.kind) {
    case 'not-found':
      return 'gone';
    case 'conflict':
      return 'stale';
    default:
      return 'retry';
  }
}

export const outcomeSays = (outcome: DecisionOutcome): string =>
  outcome === 'gone' ? DECISION_WORDS.gone : outcome === 'stale' ? DECISION_WORDS.stale : DECISION_WORDS.unreachable;
