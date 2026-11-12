/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import {
  consentWords, disconnectProtocolConnection, listProtocolConnections, protocolConnectionOf, sessionWords
} from '../api/protocolConnections';

/**
 * One entry of IAM's GET /api/iam/v1/pap/my/connections as it answers today
 * (pap_custody.connections_of): the reference and protocol, then what record_consent
 * and record_session (PAP 0.4's four conversation fields) kept beside it.
 */
const held = {
  reference: 'ref_1', protocol: 'pap', connected_at: '2026-10-01T10:00:00+00:00',
  tenant_id: 'app-1', issuer: 'https://manzanita.example',
  consent: {
    domain: 'manzanita.example', account: 'Home', sign_in: 'device',
    requested_scopes: ['orders:read', 'orders:write'], granted_scopes: ['orders:read'],
    resource: 'https://manzanita.example/orders',
    consented_at: '2026-10-01T10:00:00+00:00', expires_at: '2027-01-01T00:00:00+00:00'
  },
  session: { working: false, handoff: 'none', responder: 'human', closed: false, at: '2026-11-10T10:00:00+00:00' },
  last_used: '2026-11-10T10:00:00+00:00'
};

const fetcherOf = (body: unknown) => jest.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

describe('protocol connections in your name', () => {
  it('reads consent and conversation state without a credential', () => {
    const connection = protocolConnectionOf(held);
    expect(connection).toMatchObject({
      reference: 'ref_1', appUid: 'app-1', protocol: 'pap', domain: 'manzanita.example',
      consent: { signIn: 'device', requested: ['orders:read', 'orders:write'], granted: ['orders:read'] },
      session: { working: false, handoff: 'none', responder: 'human', closed: false, at: '2026-11-10T10:00:00+00:00' }
    });
    expect(JSON.stringify(connection)).not.toMatch(/token|credential|proof/i);
    expect(consentWords(connection.consent, Date.parse('2026-10-13T00:00:00Z'))).toContain('Signed in with a code');
    expect(sessionWords(connection.session)).toBe('Waiting for the next message, answered by a person.');
  });

  it('says where a PAP 0.4 conversation stands from its four fields', () => {
    const words = (session: Partial<typeof held.session>) =>
      sessionWords(protocolConnectionOf({ ...held, session: { ...held.session, ...session } }).session);
    expect(words({ working: true, responder: 'agent' })).toBe('Working on it, answered by its agent.');
    expect(words({ working: true, handoff: 'pending', responder: 'agent' })).toBe('Finding a person at the company to answer.');
    expect(words({ closed: true })).toBe('Closed, answered by a person.');
    expect(protocolConnectionOf({ ...held, session: undefined }).session).toBeNull();
  });

  it('refuses a malformed conversation and the PAP 0.3 shape, with no fallback', () => {
    expect(() => protocolConnectionOf({ ...held, session: { status: 'idle', responder: 'human', at: '2026-10-12T10:00:00Z' } }))
      .toThrow('The protocol Session held for this connection is malformed.');
    expect(() => protocolConnectionOf({ ...held, session: { ...held.session, working: 'false' } })).toThrow('malformed');
    expect(() => protocolConnectionOf({ ...held, session: { ...held.session, handoff: 'queued' } })).toThrow('malformed');
    expect(() => protocolConnectionOf({ ...held, session: { ...held.session, closed: undefined } })).toThrow('malformed');
    expect(() => protocolConnectionOf({ ...held, session: { ...held.session, at: 'yesterday' } })).toThrow('malformed');
  });

  it('uses a PACT business domain from the recorded consent', () => {
    // A PACT Brand's delegation names no account.
    const pactConsent: Record<string, unknown> = { ...held.consent };
    delete pactConsent.account;
    expect(protocolConnectionOf({ ...held, protocol: 'pact', consent: { ...pactConsent, domain: 'air.example' } }).domain).toBe('air.example');
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
