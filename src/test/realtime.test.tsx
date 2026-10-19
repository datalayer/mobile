/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { RECONCILED } from '../features/queries';
import { isConnected } from '../realtime/channel';
import { useRealtime } from '../realtime/useRealtime';

jest.mock('../auth/SessionProvider', () => ({
  useSession: () => ({ status: 'signed-in', accessToken: () => 'the-token' })
}));

class FakeSocket {
  static opened: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  constructor(
    readonly url: string,
    _protocols: unknown,
    readonly options: { headers: Record<string, string> }
  ) {
    FakeSocket.opened.push(this);
  }
  send() {}
  close() {
    this.closed = true;
  }
}

let appStateListener: ((state: AppStateStatus) => void) | undefined;

beforeEach(() => {
  FakeSocket.opened = [];
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeSocket;
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => jest.restoreAllMocks());

async function mounted() {
  const queryClient = new QueryClient();
  const invalidated: unknown[] = [];
  jest.spyOn(queryClient, 'invalidateQueries').mockImplementation(async filters => {
    invalidated.push(filters?.queryKey);
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useRealtime(), { wrapper });
  return { hook, invalidated };
}

describe('foreground reconciliation', () => {
  it('connects with the token in a header, never in the URL', async () => {
    await mounted();
    const [socket] = FakeSocket.opened;
    // ai-agents is on the runtimes plane.
    expect(socket!.url).toBe('wss://r1.datalayer.run/api/ai-agents/v1/ws');
    expect(socket!.options.headers).toEqual({ Authorization: 'Bearer the-token' });
  });

  it('refetches approvals, deployments and activity on every connect, and again on every reconnect', async () => {
    const { invalidated } = await mounted();
    await act(async () => FakeSocket.opened[0]!.onopen?.());
    expect(invalidated).toEqual([...RECONCILED]);
    expect(isConnected()).toBe(true);

    await act(async () => appStateListener?.('background'));
    expect(FakeSocket.opened[0]!.closed).toBe(true);
    expect(isConnected()).toBe(false);

    await act(async () => appStateListener?.('active'));
    expect(FakeSocket.opened).toHaveLength(2);
    await act(async () => FakeSocket.opened[1]!.onopen?.());
    expect(invalidated).toEqual([...RECONCILED, ...RECONCILED]);
  });

  it('lets an event only hasten what the server already holds', async () => {
    const { invalidated } = await mounted();
    await act(async () => FakeSocket.opened[0]!.onopen?.());
    invalidated.length = 0;
    await act(async () =>
      FakeSocket.opened[0]!.onmessage?.({ data: JSON.stringify({ channel: 'user:a', event: 'tool_approval_created', data: {} }) })
    );
    expect(invalidated).toEqual([['approvals']]);
  });
});
