/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { pushPreferenceOf, routeOfNotification } from '../push/routes';
import { attachSocket, isConnected, request, settleAnswer } from '../realtime/channel';
import { keysOfEvent } from '../realtime/useRealtime';

describe('the WebSocket channel', () => {
  afterEach(() => attachSocket(null));

  it('sends a typed request and settles it with the answer of its type', async () => {
    const sent: string[] = [];
    attachSocket({ send: text => sent.push(text) });
    const answered = request('push_installations');
    expect(JSON.parse(sent[0]!)).toEqual({ type: 'push_installations' });
    expect(settleAnswer({ channel: 'user:alice', event: 'notification_created', data: {} })).toBe(false);
    expect(settleAnswer({ type: 'push_installations', data: { installations: [] } })).toBe(true);
    await expect(answered).resolves.toEqual({ type: 'push_installations', data: { installations: [] } });
  });

  it('refuses a request while not connected, and fails one in flight when the socket closes', async () => {
    await expect(request('push_installations')).rejects.toThrow('Not connected.');
    attachSocket({ send: () => undefined });
    expect(isConnected()).toBe(true);
    const inFlight = request('push_installation_register', { installationId: 'phone-1' });
    attachSocket(null);
    await expect(inFlight).rejects.toThrow('closed');
  });
});

describe('server broadcasts', () => {
  it('are read by their event name, as the server sends them', () => {
    expect(keysOfEvent({ channel: 'user:alice', event: 'tool_approval_created', data: {} })).toEqual([['approvals']]);
    expect(keysOfEvent({ channel: 'user:alice', event: 'notification_created', data: {} })).toEqual([['approvals']]);
    expect(keysOfEvent({ channel: 'user:alice', event: 'something_else', data: {} })).toEqual([]);
  });
});

describe('a tapped notification (M-025)', () => {
  it('opens only a route a push may name', () => {
    expect(routeOfNotification({ v: 1, route: '/approvals/a-1' })).toBe('/approvals/a-1');
    expect(routeOfNotification({ v: 1, route: '/apps/app_2' })).toBe('/apps/app_2');
    expect(routeOfNotification({ v: 1, route: '/settings' })).toBe('/');
    expect(routeOfNotification({ v: 1, route: 'https://evil.example/approvals/a' })).toBe('/');
    expect(routeOfNotification({ v: 1, route: '/approvals/../settings' })).toBe('/');
  });

  it('opens the inbox for a payload version it does not know, and nothing for no data', () => {
    expect(routeOfNotification({ v: 2, route: '/approvals/a-1' })).toBe('/');
    expect(routeOfNotification(null)).toBeNull();
  });
});

describe('the push preference', () => {
  it('is off until turned on, with the server defaults', () => {
    expect(pushPreferenceOf(null)).toEqual({ enabled: false, categories: ['approvals', 'attention', 'failures'] });
  });

  it('keeps only categories the server knows', () => {
    expect(pushPreferenceOf(JSON.stringify({ enabled: true, categories: ['approvals', 'spam'] }))).toEqual({
      enabled: true,
      categories: ['approvals']
    });
    expect(pushPreferenceOf('{broken').enabled).toBe(false);
  });
});
