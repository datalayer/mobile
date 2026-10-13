/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import { protocolActivityDetail, protocolActivityRowOf, readProtocolActivity } from '../api/protocolActivity';

const operation = {
  uid: 'event-1',
  at: '2026-10-13T09:00:00Z',
  app_uid: 'app-1',
  deployment_uid: 'dep-1',
  method: 'pap.operation.confirmed',
  decision: 'allowed',
  outcome: 'ok',
  trace_id: '0123456789abcdef0123456789abcdef',
  redacted_arguments: { password: '[redacted]' },
  client_info: {
    role: 'personal_agent',
    domain: 'northstar.example',
    company: 'https://northstar.example/private/orders/42?token=secret',
    operation_id: 'return-42',
    revision: 3,
    code: 'authorization_code_that_must_not_render',
    key_id: 'key-that-must-not-render',
    access_token: 'token-that-must-not-render',
    proof: 'proof-that-must-not-render',
    scopes: 'orders:write'
  }
};

describe('protocol Activity', () => {
  it('keeps exact safe attribution and drops sensitive audit fields', () => {
    const row = protocolActivityRowOf(operation);
    expect(row).toEqual({
      uid: 'event-1',
      at: '2026-10-13T09:00:00Z',
      appUid: 'app-1',
      deploymentUid: 'dep-1',
      protocol: 'pap',
      kind: 'operation',
      counterpart: 'northstar.example',
      title: 'Change confirmed',
      outcome: 'Allowed · Succeeded',
      operationRef: 'return-42',
      revision: 3,
      amount: null,
      currency: ''
    });
    const rendered = JSON.stringify(row);
    for (const secret of ['private/orders', 'authorization_code', 'key-that', 'token-that', 'proof-that', 'orders:write', 'trace_id', 'password']) {
      expect(rendered).not.toContain(secret);
    }
    expect(protocolActivityDetail(row!)).toBe('northstar.example · Reference return-42 · revision 3');
  });

  it('uses only a hostname and validates a purchase receipt amount', () => {
    const row = protocolActivityRowOf({
      ...operation,
      uid: 'receipt-1',
      method: 'ucp.checkout.completed',
      client_info: {
        role: 'personal_agent',
        company: 'https://shop.example/a/full/path?checkout=secret',
        amount: 2599,
        currency: 'USD'
      }
    });
    expect(row?.counterpart).toBe('shop.example');
    expect(row?.kind).toBe('receipt');
    expect(protocolActivityDetail(row!)).toBe('shop.example · USD 25.99');
  });

  it('fails closed for unknown events, missing ownership, or malformed counterparts', () => {
    expect(protocolActivityRowOf({ ...operation, method: 'pap.future.secret' })).toBeNull();
    expect(protocolActivityRowOf({ ...operation, app_uid: '' })).toBeNull();
    const row = protocolActivityRowOf({ ...operation, client_info: { role: 'personal_agent', company: '/orders/secret' } });
    expect(row?.counterpart).toBe('Counterpart not known');
  });

  it('reads each protocol vocabulary and returns one sorted redacted list', async () => {
    const fetcher = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const method = new URL(url).searchParams.get('method')!;
      const protocol = method.slice(0, 3) === 'pap' ? 'pap' : method.slice(0, 4) as 'pact' | 'ucp.' | 'acp.';
      const event = protocol === 'pap' ? operation : null;
      return new Response(JSON.stringify({ items: event ? [event] : [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person', fetch: fetcher as typeof fetch });
    const rows = await readProtocolActivity(client);
    expect(rows).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([
      'https://run.test/api/mcp/v1/audit?method=pap.*&limit=50',
      'https://run.test/api/mcp/v1/audit?method=pact.*&limit=50',
      'https://run.test/api/mcp/v1/audit?method=ucp.*&limit=50',
      'https://run.test/api/mcp/v1/audit?method=acp.*&limit=50'
    ]));
  });
});
