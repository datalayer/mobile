/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createClient } from '../api/client';
import { RUNTIMES_PLANE_PREFIXES, serviceUrlOf } from '../config/environment';

const env = { runUrl: 'https://prod1.datalayer.run', runtimesUrl: 'https://r1.datalayer.run' };

describe('the two planes (M-001, 16 October 2026)', () => {
  it('sends each route to the plane that serves it', () => {
    expect(serviceUrlOf(env, '/api/iam/v1/me')).toBe(env.runUrl);
    expect(serviceUrlOf(env, '/api/spacer/v1/spaces/items/types/app')).toBe(env.runUrl);
    expect(serviceUrlOf(env, '/api/otel/v1/otlp/v1/metrics')).toBe(env.runUrl);
    expect(serviceUrlOf(env, '/api/ai-agents/v1/apps/deployments')).toBe(env.runtimesUrl);
    expect(serviceUrlOf(env, '/api/ai-agents/v1/tool-approvals?status=pending')).toBe(env.runtimesUrl);
    expect(serviceUrlOf(env, '/api/runtimes/v1/runtimes')).toBe(env.runtimesUrl);
    // A prefix is a whole segment: a route that only starts like one is not the runtimes plane's.
    expect(serviceUrlOf(env, '/api/runtimes-other/v1')).toBe(env.runUrl);
  });

  it("holds Core's table of where each service lives", () => {
    // Read as text: the import gate keeps Core to lib/portable, and the table is a plain literal.
    const planes = readFileSync(join(dirname(require.resolve('@datalayer/core/lib/portable')), '..', 'config', 'planes.js'), 'utf8');
    const onRuntimes = [...planes.matchAll(/(\w+)Url: RUNTIMES_PLANE_URL/g)].map(match => match[1]).sort();
    const prefixOf: Record<string, string> = {
      aiAgents: '/api/ai-agents/',
      runtimes: '/api/runtimes/',
      scheduler: '/api/scheduler/',
      contents: '/api/contents/',
      aiInference: '/api/ai-inference/'
    };
    expect(onRuntimes.length).toBeGreaterThan(0);
    expect(onRuntimes.map(name => prefixOf[name] ?? `unmapped ${name}`).sort()).toEqual([...RUNTIMES_PLANE_PREFIXES].sort());
  });

  it('asks the host of each route', async () => {
    const asked: string[] = [];
    const fetcher = (async (url: string) => {
      asked.push(url);
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    }) as unknown as typeof fetch;
    const client = createClient({ baseUrl: path => serviceUrlOf(env, path), getAccessToken: () => 't', fetch: fetcher });
    await client('/api/iam/v1/me');
    await client('/api/ai-agents/v1/apps/deployments');
    expect(asked).toEqual(['https://prod1.datalayer.run/api/iam/v1/me', 'https://r1.datalayer.run/api/ai-agents/v1/apps/deployments']);
  });
});
