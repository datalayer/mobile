/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type Client } from '../api/client';
import { isProblem } from '../api/problems';
import { environment } from '../config/environment';
import { logIn, whoIs, type Person } from './iam';
import { tokenStore as defaultTokenStore, type TokenStore } from './tokenStore';

export type SessionState =
  | { status: 'restoring' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; person: Person };

export type Session = SessionState & {
  client: Client;
  signInWithPassword: (handle: string, password: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | undefined>(undefined);

export function SessionProvider({
  children,
  tokenStore = defaultTokenStore,
  fetcher
}: {
  children: ReactNode;
  tokenStore?: TokenStore;
  fetcher?: typeof fetch;
}) {
  const queryClient = useQueryClient();
  const token = useRef<string | undefined>(undefined);
  const [state, setState] = useState<SessionState>({ status: 'restoring' });

  const client = useMemo(
    () => createClient({ baseUrl: environment().runUrl, getAccessToken: () => token.current, fetch: fetcher }),
    [fetcher]
  );

  const forget = useCallback(async () => {
    token.current = undefined;
    queryClient.clear();
    await tokenStore.forget();
    setState({ status: 'signed-out' });
  }, [queryClient, tokenStore]);

  const adopt = useCallback(
    async (candidate: string) => {
      const person = await whoIs(client, candidate);
      await tokenStore.write(candidate);
      token.current = candidate;
      setState({ status: 'signed-in', person });
    },
    [client, tokenStore]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const kept = await tokenStore.read().catch(() => null);
      if (!kept) {
        if (!cancelled) setState({ status: 'signed-out' });
        return;
      }
      try {
        const person = await whoIs(client, kept);
        if (cancelled) return;
        token.current = kept;
        setState({ status: 'signed-in', person });
      } catch (error) {
        if (cancelled) return;
        // An expired token is forgotten; an unreachable server keeps it for the next start.
        if (isProblem(error) && error.kind === 'unauthenticated') {
          await tokenStore.forget();
        }
        setState({ status: 'signed-out' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, tokenStore]);

  const signInWithPassword = useCallback(
    async (handle: string, password: string) => {
      if (!environment().allowsInterimSignIn) {
        throw new Error('This build signs in with Datalayer only.');
      }
      await adopt(await logIn(client, handle.trim(), password));
    },
    [adopt, client]
  );

  const signInWithToken = useCallback(
    async (candidate: string) => {
      if (!environment().allowsInterimSignIn) {
        throw new Error('This build signs in with Datalayer only.');
      }
      await adopt(candidate.trim());
    },
    [adopt]
  );

  const signOut = useCallback(async () => {
    const current = token.current;
    await forget();
    if (current) {
      // Best effort: the local session is gone whether or not IAM hears it (MOBILE.md §6.1).
      client('/api/iam/v1/logout', { token: current }).catch(() => undefined);
    }
  }, [client, forget]);

  const session = useMemo<Session>(
    () => ({ ...state, client, signInWithPassword, signInWithToken, signOut }),
    [state, client, signInWithPassword, signInWithToken, signOut]
  );

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession is used outside SessionProvider.');
  }
  return session;
}
