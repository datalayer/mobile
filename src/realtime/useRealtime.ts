/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Foreground reconciliation over the ai-agents WebSocket (M-017). The socket
 * only accelerates server truth: every (re)connect refetches approvals,
 * deployments and visible activity, since the stream has no resume cursor yet
 * (MOBILE §4.4, item 8).
 */

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSession } from '../auth/SessionProvider';
import { environment } from '../config/environment';
import { KEYS, RECONCILED } from '../features/queries';

/** `https://host` -> `wss://host/api/ai-agents/v1/ws`. */
export const wsUrlOf = (runUrl: string): string => `${runUrl.replace(/^http/, 'ws')}/api/ai-agents/v1/ws`;

/** The queries one server event makes stale. */
export function keysOfEvent(raw: unknown): readonly QueryKey[] {
  const type = raw && typeof raw === 'object' ? String((raw as Record<string, unknown>).type ?? '') : '';
  if (type.startsWith('tool_approval') || type.startsWith('tool-approval')) {
    return [KEYS.approvals];
  }
  if (type.startsWith('deployment') || type.startsWith('app_')) {
    return [KEYS.deployments, ['activity']];
  }
  return [];
}

const MAX_BACKOFF_MS = 30_000;

/** React Native's WebSocket takes headers as a third argument; the DOM typing does not say so. */
type NativeWebSocket = new (
  url: string,
  protocols: string | string[] | undefined,
  options: { headers: Record<string, string> }
) => WebSocket;

export function useRealtime() {
  const queryClient = useQueryClient();
  const { status, accessToken } = useSession();
  const signedIn = status === 'signed-in';

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let active = AppState.currentState === 'active';

    const invalidate = (keys: readonly QueryKey[]) => {
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    const close = () => {
      if (retry) clearTimeout(retry);
      retry = null;
      const open = socket;
      socket = null;
      open?.close();
    };

    const connect = () => {
      const token = accessToken();
      if (!active || socket || !token) {
        return;
      }
      // The token travels as a header, not in the URL, so it never lands in access logs.
      const opened = new (WebSocket as NativeWebSocket)(wsUrlOf(environment().runUrl), undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      socket = opened;
      opened.onopen = () => {
        attempts = 0;
        invalidate(RECONCILED);
      };
      opened.onmessage = event => {
        try {
          invalidate(keysOfEvent(JSON.parse(String(event.data))));
        } catch {
          // Unknown frames are ignored; REST stays the truth.
        }
      };
      opened.onclose = () => {
        if (socket !== opened) return;
        socket = null;
        if (active) {
          attempts += 1;
          retry = setTimeout(connect, Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempts));
        }
      };
    };

    const subscription = AppState.addEventListener('change', next => {
      active = next === 'active';
      if (active) {
        attempts = 0;
        connect();
      } else {
        close();
      }
    });
    connect();

    return () => {
      active = false;
      subscription.remove();
      close();
    };
  }, [signedIn, accessToken, queryClient]);
}
