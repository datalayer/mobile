/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Foreground reconciliation over the ai-agents WebSocket (M-017). The socket
 * only accelerates server truth: every (re)connect refetches approvals,
 * deployments and visible activity, since the stream has no resume cursor yet.
 */

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useSession } from '../auth/SessionProvider';
import { environment } from '../config/environment';
import { RECONCILED } from '../features/queryKeys';
import { attachSocket, settleAnswer } from './channel';
import { keysOfEvent, wsUrlOf } from './events';

export { keysOfEvent, wsUrlOf } from './events';

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
    // A browser WebSocket cannot carry the Authorization header, and the token stays out of URLs: the web preview refreshes by pull.
    if (!signedIn || Platform.OS === 'web') {
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
      attachSocket(null);
      open?.close();
    };

    const connect = () => {
      const token = accessToken();
      if (!active || socket || !token) {
        return;
      }
      // The token travels as a header, not in the URL, so it never lands in access logs.
      const opened = new (WebSocket as NativeWebSocket)(wsUrlOf(environment().runtimesUrl), undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      socket = opened;
      opened.onopen = () => {
        attempts = 0;
        attachSocket(opened);
        invalidate(RECONCILED);
      };
      opened.onmessage = event => {
        try {
          const frame: unknown = JSON.parse(String(event.data));
          if (!settleAnswer(frame)) {
            invalidate(keysOfEvent(frame));
          }
        } catch {
          // Unknown frames are ignored; REST stays the truth.
        }
      };
      opened.onclose = () => {
        if (socket !== opened) return;
        socket = null;
        attachSocket(null);
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
