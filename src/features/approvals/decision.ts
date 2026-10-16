/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What the decision flow says (M-020). Pure, so the words are tested apart from the screen. */

import { decide, getApproval, type Approval, type Decision } from '../../api/approvals';
import type { Client } from '../../api/client';
import type { Problem } from '@datalayer/core/lib/portable';
import { Problem as RequestProblem } from '@datalayer/core/lib/portable';

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

export type DecisionInput = { decision: Decision; note?: string; shown: Approval };

/** Refetch immediately before deciding; an older rendering never authorizes a changed request. */
export async function decideShown(client: Client, id: string, input: DecisionInput): Promise<Approval> {
  const current = await getApproval(client, id);
  if (current.status !== 'pending') {
    throw new RequestProblem('conflict', `approval ${id} is ${current.status}`, 409);
  }
  if (JSON.stringify(current.toolArgs) !== JSON.stringify(input.shown.toolArgs)) {
    throw new RequestProblem('conflict', `approval ${id} changed since it was shown`, 409);
  }
  return decide(client, id, input.decision, input.note);
}

/** One UI surface sends at most one decision at a time, even before React disables a double tap. */
export function oneDecisionAtATime<T>(run: (input: DecisionInput) => Promise<T>): (input: DecisionInput) => Promise<T> {
  let inFlight: Promise<T> | undefined;
  return input => {
    if (!inFlight) {
      const started = run(input);
      inFlight = started;
      void started.finally(() => {
        if (inFlight === started) inFlight = undefined;
      }).catch(() => undefined);
    }
    return inFlight;
  };
}
