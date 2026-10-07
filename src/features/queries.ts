/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Server truth through TanStack Query. Keys are shared so the realtime socket can invalidate them (M-017). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readActivity } from '../api/activity';
import { type Approval, type Decision, decide, getApproval, listPending, markRead } from '../api/approvals';
import { applicationsOf, listDeployments } from '../api/deployments';
import { isProblem, Problem } from '../api/problems';
import { isAgentRuntime, listRuntimes } from '../api/runtimes';
import { useSession } from '../auth/SessionProvider';

export const KEYS = {
  deployments: ['deployments'] as const,
  runtimes: ['runtimes'] as const,
  approvals: ['approvals'] as const,
  approval: (id: string) => ['approvals', id] as const,
  activity: (appUid: string) => ['activity', appUid] as const
};

/** Every key a reconnect refetches: approvals, deployments and visible activity. */
export const RECONCILED = [KEYS.approvals, KEYS.deployments, KEYS.runtimes, ['activity']] as const;

export function useApplications() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.deployments, queryFn: () => listDeployments(client), select: applicationsOf });
}

export function useAgentRuntimes() {
  const { client } = useSession();
  return useQuery({
    queryKey: KEYS.runtimes,
    queryFn: () => listRuntimes(client),
    select: runtimes => runtimes.filter(isAgentRuntime)
  });
}

export function usePendingApprovals() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.approvals, queryFn: () => listPending(client) });
}

/** Fetched on every open: `staleTime: 0` (MOBILE §3.2). */
export function useApproval(id: string) {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.approval(id), queryFn: () => getApproval(client, id), staleTime: 0 });
}

export function useMarkRead() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markRead(client, id),
    onSuccess: (approval: Approval) => {
      queryClient.setQueryData<Approval[]>(KEYS.approvals, list =>
        list?.map(item => (item.id === approval.id ? { ...item, read: true } : item))
      );
    }
  });
}

export function useActivity(appUid: string) {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.activity(appUid), queryFn: () => readActivity(client, appUid), enabled: Boolean(appUid) });
}

/**
 * A decision (M-020): the approval is read again immediately before, so what
 * is approved is what is shown; a `409` or a changed status replaces the
 * controls with the server's answer; a `503` leaves it pending to retry.
 */
export function useDecide(id: string) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ decision, note, shown }: { decision: Decision; note?: string; shown: Approval }) => {
      const current = await getApproval(client, id);
      if (current.status !== 'pending') {
        throw new Problem('conflict', `approval ${id} is ${current.status}`, 409);
      }
      if (JSON.stringify(current.toolArgs) !== JSON.stringify(shown.toolArgs)) {
        throw new Problem('conflict', `approval ${id} changed since it was shown`, 409);
      }
      return decide(client, id, decision, note);
    },
    onSuccess: approval => {
      queryClient.setQueryData(KEYS.approval(id), approval);
      queryClient.setQueryData<Approval[]>(KEYS.approvals, list => list?.filter(item => item.id !== approval.id));
    },
    onError: error => {
      if (isProblem(error) && (error.kind === 'conflict' || error.kind === 'not-found')) {
        void queryClient.invalidateQueries({ queryKey: KEYS.approval(id) });
        void queryClient.invalidateQueries({ queryKey: KEYS.approvals });
      }
    }
  });
}
