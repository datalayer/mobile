/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type Client } from '../api/client';
import { isProblem } from '../api/problems';
import { environment } from '../config/environment';
import { browserSignIn } from './browserSignIn';
import { logIn, whoIs, type Person } from './iam';
import {
  OAuthFailure,
  discover,
  exchangeCode,
  needsRefresh,
  refreshCredential,
  revoke,
  type Credential,
  type OAuthConfig
} from './oauth';
import { tokenStore as defaultTokenStore, type TokenStore } from './tokenStore';
import { forgetConversations } from '../features/conversations/registry';
import { forgetSignIns } from '../features/conversations/signInWatch';
import { dropRunMetrics, flushRunMetrics, setMetricsSink } from '../telemetry/runMetrics';

export type SessionState =
  | { status: 'restoring' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; person: Person };

export type Session = SessionState & {
  client: Client;
  /** The current token, read when a connection opens; never rendered or logged. */
  accessToken: () => string | undefined;
  /** Authorization Code + PKCE in the system browser; `false` when the person cancelled. */
  signInWithDatalayer: () => Promise<boolean>;
  signInWithPassword: (handle: string, password: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | undefined>(undefined);

type CredentialHolder = { get: () => Credential | undefined; set: (value: Credential | undefined) => void };

function newCredentialHolder(): CredentialHolder {
  let value: Credential | undefined;
  return {
    get: () => value,
    set: next => {
      value = next;
    }
  };
}

type Refresher = { run: () => Promise<string | undefined>; set: (run: () => Promise<string | undefined>) => void };

function newRefresher(): Refresher {
  let current: () => Promise<string | undefined> = async () => undefined;
  return {
    run: () => current(),
    set: next => {
      current = next;
    }
  };
}

/** The id the build is installed under, which names its OAuth redirect scheme. */
function applicationId(): string {
  const id = Constants.expoConfig?.extra?.applicationId;
  return typeof id === 'string' && id ? id : 'ai.datalayer.mobile';
}

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
  // Read lazily per request; never rendered, so not state.
  const [credential] = useState(newCredentialHolder);
  const [state, setState] = useState<SessionState>({ status: 'restoring' });
  const [expiresAt, setExpiresAt] = useState<number | undefined>();
  const oauthConfig = useRef<Promise<OAuthConfig> | undefined>(undefined);
  const refreshing = useRef<Promise<string | undefined> | undefined>(undefined);
  // The client is made once; it reaches the latest refresh through this.
  const [refresher] = useState(newRefresher);

  const config = useCallback((): Promise<OAuthConfig> => {
    oauthConfig.current ??= discover(environment().runUrl, applicationId(), fetcher).catch(error => {
      oauthConfig.current = undefined;
      throw error;
    });
    return oauthConfig.current;
  }, [fetcher]);

  const client = useMemo(
    () =>
      createClient({
        baseUrl: environment().runUrl,
        getAccessToken: () => credential.get()?.accessToken,
        refreshAccessToken: refresher.run,
        fetch: fetcher
      }),
    [fetcher, credential, refresher]
  );

  // Conversation health, measured without words (M-036): sent as the person, and when the app goes away.
  useEffect(() => {
    setMetricsSink({
      baseUrl: environment().runUrl,
      getAccessToken: () => credential.get()?.accessToken,
      fetch: fetcher,
      resource: {
        'service.name': 'datalayer-mobile',
        'service.version': Application.nativeApplicationVersion ?? '',
        'os.type': Platform.OS
      }
    });
    const listening = AppState.addEventListener('change', state => state === 'background' && void flushRunMetrics());
    return () => {
      listening.remove();
      setMetricsSink(null);
    };
  }, [credential, fetcher]);

  const keep = useCallback(
    async (next: Credential) => {
      await tokenStore.write(next);
      credential.set(next);
      setExpiresAt(next.expiresAt);
    },
    [credential, tokenStore]
  );

  const forget = useCallback(async () => {
    credential.set(undefined);
    setExpiresAt(undefined);
    queryClient.clear();
    // Conversations are held in memory only, and never cross an account.
    forgetConversations();
    forgetSignIns();
    dropRunMetrics();
    await tokenStore.forget();
    setState({ status: 'signed-out' });
  }, [credential, queryClient, tokenStore]);

  /** One refresh at a time: the refresh token rotates, and a second use would revoke the session. */
  const refresh = useCallback((): Promise<string | undefined> => {
    refreshing.current ??= (async () => {
      const current = credential.get();
      if (!current?.refreshToken) {
        return undefined;
      }
      try {
        const next = await refreshCredential(await config(), current.refreshToken, fetcher);
        await keep(next);
        return next.accessToken;
      } catch (error) {
        if (error instanceof OAuthFailure && error.signsOut) {
          await forget();
        }
        return undefined;
      }
    })().finally(() => {
      refreshing.current = undefined;
    });
    return refreshing.current;
  }, [config, credential, fetcher, forget, keep]);

  useEffect(() => {
    refresher.set(refresh);
  }, [refresher, refresh]);

  const adopt = useCallback(
    async (candidate: Credential) => {
      const person = await whoIs(client, candidate.accessToken);
      await keep(candidate);
      setState({ status: 'signed-in', person });
    },
    [client, keep]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const kept = await tokenStore.read().catch(() => null);
      if (!kept) {
        if (!cancelled) setState({ status: 'signed-out' });
        return;
      }
      credential.set(kept);
      setExpiresAt(kept.expiresAt);
      try {
        if (needsRefresh(kept, Date.now())) {
          await refresh();
        }
        const current = credential.get();
        if (!current) {
          if (!cancelled) setState({ status: 'signed-out' });
          return;
        }
        const person = await whoIs(client, current.accessToken);
        if (!cancelled) setState({ status: 'signed-in', person });
      } catch (error) {
        if (cancelled) return;
        // An expired token is forgotten; an unreachable server keeps it for the next start.
        if (isProblem(error) && error.kind === 'unauthenticated') {
          credential.set(undefined);
          await tokenStore.forget();
        }
        setState({ status: 'signed-out' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, credential, refresh, tokenStore]);

  // Refreshed a minute before it expires, so a request rarely meets a 401.
  useEffect(() => {
    if (expiresAt === undefined || state.status !== 'signed-in') {
      return;
    }
    const timer = setTimeout(() => void refresh(), Math.max(0, expiresAt - 60_000 - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, refresh, state.status]);

  const signInWithDatalayer = useCallback(async () => {
    const oauth = await config();
    const granted = await browserSignIn(oauth);
    if (!granted) {
      return false;
    }
    await adopt(await exchangeCode(oauth, granted.code, granted.codeVerifier, fetcher));
    return true;
  }, [adopt, config, fetcher]);

  const signInWithPassword = useCallback(
    async (handle: string, password: string) => {
      if (!environment().allowsInterimSignIn) {
        throw new Error('This build signs in with Datalayer only.');
      }
      await adopt({ accessToken: await logIn(client, handle.trim(), password) });
    },
    [adopt, client]
  );

  const signInWithToken = useCallback(
    async (candidate: string) => {
      if (!environment().allowsInterimSignIn) {
        throw new Error('This build signs in with Datalayer only.');
      }
      await adopt({ accessToken: candidate.trim() });
    },
    [adopt]
  );

  const signOut = useCallback(async () => {
    const current = credential.get();
    await forget();
    if (!current) {
      return;
    }
    // Best effort: the local session is gone whether or not IAM hears it (MOBILE.md §6.1).
    if (current.refreshToken) {
      const refreshToken = current.refreshToken;
      config()
        .then(oauth => revoke(oauth, refreshToken, fetcher))
        .catch(() => undefined);
    } else {
      client('/api/iam/v1/logout', { token: current.accessToken }).catch(() => undefined);
    }
  }, [client, config, credential, fetcher, forget]);

  const session = useMemo<Session>(
    () => ({
      ...state,
      client,
      accessToken: () => credential.get()?.accessToken,
      signInWithDatalayer,
      signInWithPassword,
      signInWithToken,
      signOut
    }),
    [state, client, credential, signInWithDatalayer, signInWithPassword, signInWithToken, signOut]
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
