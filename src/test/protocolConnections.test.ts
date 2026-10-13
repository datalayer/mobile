/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import {
  consentWords, disconnectProtocolConnection, listProtocolConnections, protocolConnectionOf, sessionWords
} from '../api/protocolConnections';

const held = {
  reference: 'ref_1', tenant_id: 'app-1', protocol: 'pap', issuer: 'https://manzanita.example',
  connected_at: '2026-10-01T10:00:00Z', last_used: '2026-10-12T10:00:00Z',
  consent: {
    sign_in: 'device', requested_scopes: ['orders:read', 'orders:write'], granted_scopes: ['orders:read'],
    resource: 'https://manzanita.example/orders', expires_at: '2027-01-01T00:00:00Z'
  },
  session: { status: 'idle', responder: 'human', at: '2026-10-12T10:00:00Z' }
};

const fetcherOf = (body: unknown) => jest.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

describe('protocol connections in your name', () => {
  it('reads consent and conversation state without a credential', () => {
    const connection = protocolConnectionOf(held);
    expect(connection).toMatchObject({
      reference: 'ref_1', appUid: 'app-1', protocol: 'pap', domain: 'manzanita.example',
      consent: { signIn: 'device', requested: ['orders:read', 'orders:write'], granted: ['orders:read'] },
      session: { status: 'idle', responder: 'human' }
    });
    expect(JSON.stringify(connection)).not.toMatch(/token|credential|proof/i);
    expect(consentWords(connection.consent, Date.parse('2026-10-13T00:00:00Z'))).toContain('Signed in with a code');
    expect(sessionWords(connection.session)).toBe('Waiting for the next message, answered by a person.');
  });

  it('uses a PACT business domain from the recorded consent', () => {
    expect(protocolConnectionOf({ ...held, protocol: 'pact', consent: { ...held.consent, domain: 'air.example' } }).domain).toBe('air.example');
  });

  it('refuses incomplete custody projections', () => {
    expect(() => protocolConnectionOf({ ...held, reference: '' })).toThrow('malformed');
    expect(() => protocolConnectionOf({ ...held, consent: { ...held.consent, sign_in: 'magic' } })).toThrow('malformed');
  });

  it('lists and disconnects only through IAM’s person-owned routes', async () => {
    const fetcher = fetcherOf({ connections: [held] });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person-token', fetch: fetcher });
    await expect(listProtocolConnections(client)).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith('https://run.test/api/iam/v1/pap/my/connections', expect.objectContaining({ method: 'GET' }));

    const disconnectFetch = fetcherOf({ disconnected: true, revoked_at_company: true });
    const disconnectClient = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person-token', fetch: disconnectFetch });
    await expect(disconnectProtocolConnection(disconnectClient, 'ref /1')).resolves.toEqual({ revokedAtCounterpart: true });
    expect(disconnectFetch).toHaveBeenCalledWith(
      'https://run.test/api/iam/v1/pap/my/connections/ref%20%2F1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
