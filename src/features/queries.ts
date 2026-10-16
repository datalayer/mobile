/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Server truth through TanStack Query. Keys are shared so the realtime socket can invalidate them (M-017). */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { mergeActivityPages } from '@datalayer/agent-runtimes/lib/portable';
import { readActivity } from '../api/activity';
import { cancelDeletion, readDeletion, requestDeletion } from '../api/accountDeletion';
import { type Approval, getApproval, listPending, markRead, pendingCount } from '../api/approvals';
import {
  applicationsOf, changeDeploymentState, getResetCounts, listCheckedDeployments, listDeploymentEvents, listDeployments, resetDeployment,
  type Deployment, type DeploymentState, type ResetCounts
} from '../api/deployments';
import { EMPTY_FACES, listFaces } from '../api/faces';
import { isProblem } from '@datalayer/core/lib/portable';
import { disconnectProtocolConnection, listProtocolConnections } from '../api/protocolConnections';
import { listAgentRuntimes } from '../api/runtimes';
import { readProtocolActivity } from '../api/protocolActivity';
import { readRunningPermissions } from '../api/appPermissions';
import { useSession } from '../auth/SessionProvider';
import { decideShown, oneDecisionAtATime } from './approvals/decision';
import { KEYS } from './queryKeys';

export { KEYS, RECONCILED } from './queryKeys';

export function useApplications() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.deployments, queryFn: () => listDeployments(client), select: applicationsOf });
}

export function useChangeDeploymentState() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deployment, state }: { deployment: Deployment; state: DeploymentState }) =>
      changeDeploymentState(client, deployment, state),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEYS.deployments });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: KEYS.approvals });
      void queryClient.invalidateQueries({ queryKey: KEYS.protocolConnections });
      void queryClient.invalidateQueries({ queryKey: ['deployments'] });
    }
  });
}

export function useResetDeployment() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deployment, confirmed }: { deployment: Deployment; confirmed?: ResetCounts }) => {
      if (!confirmed) return { phase: 'confirm' as const, ...(await getResetCounts(client, deployment.uid)) };
      return { phase: 'done' as const, ...(await resetDeployment(client, deployment.uid, confirmed)) };
    },
    onSuccess: result => {
      if (result.phase !== 'done') return;
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: KEYS.approvals });
      void queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.removeQueries({ queryKey: ['sessions'] });
    }
  });
}

export function useDeploymentEvents(uid: string) {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.deploymentEvents(uid), queryFn: () => listDeploymentEvents(client, uid), enabled: Boolean(uid) });
}

/** One application's deployments with their identity checked now (Application → Protocols, M-045b). */
export function useCheckedDeployments(appUid: string) {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.checkedDeployments(appUid), queryFn: () => listCheckedDeployments(client, appUid) });
}

export function useAgentRuntimes() {
  const { client } = useSession();
  return useQuery({
    queryKey: KEYS.runtimes,
    queryFn: () => listAgentRuntimes(client)
  });
}

export function usePendingApprovals() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.approvals, queryFn: () => listPending(client) });
}

/** The uncapped server count drives the app badge; the inbox list is deliberately capped. */
export function usePendingCount() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.approvalCount, queryFn: () => pendingCount(client) });
}

/** Fetched on every open: `staleTime: 0`. */
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

/** Every application's activity (M-040), completed sessions a page at a time. */
export function useAllActivity() {
  const { client } = useSession();
  return useInfiniteQuery({
    queryKey: KEYS.allActivity,
    queryFn: ({ pageParam }) => readActivity(client, undefined, pageParam),
    initialPageParam: 0,
    getNextPageParam: page => page.nextOffset ?? undefined,
    select: data => mergeActivityPages(data.pages)
  });
}

/** The applications' faces: decoration, so a failure shows the default eyes rather than an error. */
export function useFaces() {
  const { client } = useSession();
  const faces = useQuery({ queryKey: KEYS.faces, queryFn: () => listFaces(client), staleTime: 5 * 60_000 });
  return faces.data ?? EMPTY_FACES;
}

export function useProtocolConnections() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.protocolConnections, queryFn: () => listProtocolConnections(client) });
}

export function useProtocolActivity() {
  // The audit is the MCP gateway's, at its own host: under the run address it is not found.
  const { gatewayClient } = useSession();
  return useQuery({ queryKey: KEYS.protocolActivity, queryFn: () => readProtocolActivity(gatewayClient), staleTime: 30_000 });
}

export function useRunningPermissions(appUid: string, version: number) {
  const { client } = useSession();
  return useQuery({
    queryKey: KEYS.runningPermissions(appUid, version),
    queryFn: () => readRunningPermissions(client, appUid, version),
    enabled: Boolean(appUid && version > 0),
    staleTime: 5 * 60_000
  });
}

/** The person's pending account deletion (M-052): null when none is asked. */
export function useAccountDeletion() {
  const { client } = useSession();
  return useQuery({ queryKey: KEYS.accountDeletion, queryFn: () => readDeletion(client) });
}

/** Ask for the account to be deleted (`handle` typed to confirm), or, with null, withdraw the request. */
export function useChangeAccountDeletion() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (handle: string | null) => {
      if (handle === null) {
        await cancelDeletion(client);
        return null;
      }
      return requestDeletion(client, handle);
    },
    onSuccess: request => queryClient.setQueryData(KEYS.accountDeletion, request)
  });
}

export function useDisconnectProtocolConnection() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => disconnectProtocolConnection(client, reference),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEYS.protocolConnections });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: KEYS.deployments });
      void queryClient.invalidateQueries({ queryKey: KEYS.approvals });
      queryClient.removeQueries({ queryKey: ['sessions'] });
      queryClient.removeQueries({ queryKey: ['protocols'] });
    }
  });
}

/**
 * A decision (M-020): the approval is read again immediately before, so what
 * is approved is what is shown; a `409` or a changed status replaces the
 * controls with the server's answer; a `503` leaves it pending to retry.
 */
export function useDecide(id: string) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  const run = useMemo(() => oneDecisionAtATime(input => decideShown(client, id, input)), [client, id]);
  return useMutation({
    mutationFn: run,
    retry: false,
    onSuccess: approval => {
      queryClient.setQueryData(KEYS.approval(id), approval);
      queryClient.setQueryData<Approval[]>(KEYS.approvals, list => list?.filter(item => item.id !== approval.id));
      void queryClient.invalidateQueries({ queryKey: KEYS.approvalCount });
    },
    onError: error => {
      if (isProblem(error) && (error.kind === 'conflict' || error.kind === 'not-found')) {
        void queryClient.invalidateQueries({ queryKey: KEYS.approval(id) });
        void queryClient.invalidateQueries({ queryKey: KEYS.approvals });
      }
    }
  });
}
