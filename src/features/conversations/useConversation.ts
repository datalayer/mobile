/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** A conversation for a screen: held in memory across navigation, read back when the app returns. */

import { agentRunClient, appSessionsClient } from '@datalayer/agent-runtimes/lib/portable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { fetch as streamingFetch } from 'expo/fetch';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import {
  listThreads, locateNew, locateThread, startNewRuntime, startThreadRuntime, type ThreadReach
} from '../../api/conversations';
import { listShared, type SessionAddress } from '../../api/deployments';
import { useSession } from '../../auth/SessionProvider';
import { ConversationController } from './controller';
import { conversationFor, holdAs } from './registry';

/** Expo's `fetch`, whose response body streams (the platform's does not). */
const fetcher = streamingFetch as unknown as typeof fetch;

/** The query of a person's threads with an application. */
export const threadsKey = (appUid: string) => ['conversations', appUid] as const;

export function useThreads(appUid: string) {
  const { client } = useSession();
  return useQuery({ queryKey: threadsKey(appUid), queryFn: () => listThreads(client, appUid), enabled: Boolean(appUid) });
}

/** Every one of the person's threads, whoever's the application (an invited person's included). */
export function useAllThreads() {
  const { client } = useSession();
  return useQuery({ queryKey: ['conversations', '*'] as const, queryFn: () => listThreads(client) });
}

/** The deployments shared with the person, read from the server (all of them, talked to or not). */
export function useShared() {
  const { client } = useSession();
  return useQuery({ queryKey: ['deployments', 'shared'] as const, queryFn: () => listShared(client) });
}

/** The query of where a thread continues: asked again each time, never kept. */
export const threadReachKey = (sessionUid: string) => ['conversations', 'reach', sessionUid] as const;

/** Where a thread continues now (MOBILE §4.4.7): read on every open, not cached past the screen. */
export function useThreadReach(sessionUid: string | null) {
  const { client } = useSession();
  return useQuery({
    queryKey: threadReachKey(sessionUid ?? ''),
    queryFn: () => locateThread(client, sessionUid ?? ''),
    enabled: Boolean(sessionUid),
    staleTime: 0,
    gcTime: 0
  });
}

/** Where a new conversation with a deployment is had now: read on every open, not kept. */
export const newReachKey = (deploymentUid: string) => ['conversations', 'reach-new', deploymentUid] as const;

export function useNewReach(deploymentUid: string) {
  const { client } = useSession();
  return useQuery({
    queryKey: newReachKey(deploymentUid),
    queryFn: () => locateNew(client, deploymentUid),
    enabled: Boolean(deploymentUid),
    staleTime: 0,
    gcTime: 0
  });
}

/** Start a runtime of the person's own for a new conversation, then hold where it is had. */
export function useStartNewRuntime(deploymentUid: string) {
  const { client } = useSession();
  const queries = useQueryClient();
  return useMutation({
    mutationFn: () => startNewRuntime(client, deploymentUid),
    retry: false,
    onSuccess: (reach: ThreadReach) => queries.setQueryData(newReachKey(deploymentUid), reach)
  });
}

/** Start a runtime of the person's own for a thread, then hold where it continues. */
export function useStartThreadRuntime(sessionUid: string) {
  const { client } = useSession();
  const queries = useQueryClient();
  return useMutation({
    mutationFn: () => startThreadRuntime(client, sessionUid),
    retry: false,
    onSuccess: (reach: ThreadReach) => queries.setQueryData(threadReachKey(sessionUid), reach)
  });
}

/** What a screen opens: an application's session (new or not), or a standalone agent's thread. */
export type ConversationTarget =
  | {
      kind: 'app';
      address: SessionAddress;
      deploymentUid: string;
      appUid: string;
      version: number;
      /** The session to open again; none for a new conversation. */
      sessionUid: string | null;
      /** Tells a new conversation apart from another started from the same place. */
      key: string;
    }
  | { kind: 'agent'; baseUrl: string; agent: string; runtimeName: string; key: string };

function keyOf(target: ConversationTarget): string {
  // The runtime is part of its key: a conversation held for one runtime is never sent to another.
  return target.kind === 'app'
    ? `app:${target.deploymentUid}:${target.address.baseUrl}:${target.sessionUid ?? `new:${target.key}`}`
    : `agent:${target.runtimeName}:${target.agent}:${target.key}`;
}

export function useConversation(target: ConversationTarget) {
  const { accessToken } = useSession();
  const key = keyOf(target);
  const controller = conversationFor(key, () => {
    const options = { getAccessToken: accessToken, fetch: fetcher };
    if (target.kind === 'agent') {
      return new ConversationController(
        { kind: 'agent', runs: agentRunClient({ ...options, baseUrl: target.baseUrl, agent: target.agent }) },
        null,
        randomUUID
      );
    }
    return new ConversationController(
      {
        kind: 'app',
        sessions: appSessionsClient({ ...options, baseUrl: target.address.baseUrl }),
        agent: target.address.agent,
        deploymentUid: target.deploymentUid,
        appUid: target.appUid,
        version: target.version
      },
      target.sessionUid,
      randomUUID
    );
  });
  const view = useSyncExternalStore(controller.subscribe, controller.getView);

  // A conversation opened again is read from the server once; a lost turn is read back.
  useEffect(() => {
    const fresh = !view.conversation.items.length && !controller.running && !view.opening;
    void (fresh ? controller.open() : controller.foreground());
    const listening = AppState.addEventListener('change', state => {
      if (state === 'active') void controller.foreground();
    });
    return () => listening.remove();
    // Once per conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // A new conversation is also held under its session, so its thread opens it as it is.
  useEffect(() => {
    if (target.kind === 'app' && !target.sessionUid && view.uid) {
      holdAs(`app:${target.deploymentUid}:${target.address.baseUrl}:${view.uid}`, controller);
    }
  }, [controller, target, view.uid]);

  return { controller, view };
}
