/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createClient } from '../api/client';
import { readRunningPermissions } from '../api/appPermissions';

const stored = (version: number, spec: Record<string, unknown>) => JSON.stringify({
  format: 'loop.app.item/v1', state: { revision: version }, spec
});

const spec = {
  rules: [{ action: 'Send the report', applies_to: ['send'], behaviour: 'ask_first' }],
  connections: [{ server: 'google-workspace:1.0.0', access: 'write', as: 'user', only: ['gmail_*'] }],
  backend_tools: ['search'],
  permissions: { spaces: [{ space: 'reports', access: 'read' }], computer: { browse: true, files: false, shell: false } },
  pap: { connections: [{ company: 'outfitters.example', access: 'write', as: 'user', scopes: ['orders:read'] }] },
  pact: { connections: [{ brand: 'air.example', access: 'read', scopes: ['bookings:read'] }] },
  commerce: { merchants: [{ merchant: 'shop.example', protocol: 'ucp', access: 'write', limit: { amount: '50.00', currency: 'USD' } }] },
  signed_fetch: { sites: [{ id: 'verifier', site: 'verify.example' }] }
};

const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('exact running rules and permissions', () => {
  it('reads the current version and summarizes only declared access', async () => {
    const fetcher = jest.fn(async () => response({ document: { type_s: 'app', model_s: stored(3, spec) } }));
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person', fetch: fetcher as typeof fetch });
    await expect(readRunningPermissions(client, 'app /1', 3)).resolves.toEqual({
      known: true,
      version: 3,
      rules: ['Send the report: asks first (send).'],
      permissions: [
        'Reads and writes google-workspace:1.0.0 as each signed-in person, limited to gmail_*.',
        'Uses search.',
        'Reads Space reports.',
        'Browses the web on its computer.',
        'Reads and changes things at outfitters.example over PAP for each signed-in person, asking for orders:read.',
        'Reads at air.example over PACT for each signed-in person, asking for bookings:read.',
        'Shops and asks before buying at test merchant shop.example over UCP, at most 50.00 USD per purchase.',
        "Reads pages at verify.example with GET only, signing every request with this application's key."
      ],
      problem: ''
    });
    expect(fetcher).toHaveBeenCalledWith('https://run.test/api/spacer/v1/lexicals/app%20%2F1', expect.anything());
  });

  it('resolves an earlier deployed version instead of showing the latest draft', async () => {
    const fetcher = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/lexicals/app-1')) return response({ document: { type_s: 'app', model_s: stored(4, { ...spec, rules: [] }) } });
      if (url.endsWith('/spaces/items/types/appversion')) {
        return response({ items: [{ uid: 'kept-2', metadata_s: JSON.stringify({ app: 'app-1', version: 2 }) }] });
      }
      return response({ document: { type_s: 'appversion', model_s: stored(2, spec) } });
    });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person', fetch: fetcher as typeof fetch });
    const projection = await readRunningPermissions(client, 'app-1', 2);
    expect(projection.version).toBe(2);
    expect(projection.rules).toEqual(['Send the report: asks first (send).']);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('says unknown for a missing or malformed exact version and never borrows another version', async () => {
    const fetcher = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url.endsWith('/lexicals/app-1')
        ? response({ document: { type_s: 'app', model_s: stored(4, spec) } })
        : response({ items: [] });
    });
    const client = createClient({ baseUrl: 'https://run.test', getAccessToken: () => 'person', fetch: fetcher as typeof fetch });
    await expect(readRunningPermissions(client, 'app-1', 2)).resolves.toMatchObject({ known: false, version: 2 });

    const malformed = createClient({
      baseUrl: 'https://run.test', getAccessToken: () => 'person',
      fetch: (async () => response({ document: { type_s: 'app', model_s: stored(1, { ...spec, permissions: {} }) } })) as typeof fetch
    });
    await expect(readRunningPermissions(malformed, 'app-1', 1)).resolves.toMatchObject({ known: false });
  });
});
