/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** A conversation for a screen: held in memory across navigation, read back when the app returns. */

import { agentRunClient, appSessionsClient } from '@datalayer/agent-runtimes/lib/portable';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { fetch as streamingFetch } from 'expo/fetch';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { listThreads } from '../../api/conversations';
import type { SessionAddress } from '../../api/deployments';
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
  return target.kind === 'app'
    ? `app:${target.deploymentUid}:${target.sessionUid ?? `new:${target.key}`}`
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
      holdAs(`app:${target.deploymentUid}:${view.uid}`, controller);
    }
  }, [controller, target, view.uid]);

  return { controller, view };
}
