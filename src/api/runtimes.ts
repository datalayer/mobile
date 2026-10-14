/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** A person's running agent runtimes, from the runtimes service. Raw runtimes have no application capabilities. */

import type { Client } from './client';
import { type Raw, record, records, text } from './fields';

export type AgentRuntime = {
  uid: string;
  runtimeName: string;
  givenName: string;
  environment: string;
  /** The agentspec it runs, when the runtime says. */
  agentSpecId: string;
  type: string;
  state: string;
  startedAt: string;
  expiredAt: string;
  /** Its Jupyter address, from which its agents' is read (`agentRuntimesUrlOf`). */
  ingress: string;
};

export function runtimeOf(raw: Raw): AgentRuntime {
  const environment = record(raw.environment);
  return {
    uid: text(raw.uid),
    runtimeName: text(raw.runtime_name) || text(raw.pod_name),
    givenName: text(raw.given_name),
    environment: text(environment.title) || text(environment.name) || text(raw.environment_title) || text(raw.environment_name),
    agentSpecId: text(raw.agent_spec_id) || text(raw.attached_agent_spec_id_s),
    type: text(raw.type),
    state: text(raw.state) || text(raw.status) || 'running',
    startedAt: text(raw.started_at),
    expiredAt: text(raw.expired_at),
    ingress: text(raw.ingress)
  };
}

/** Agent runtimes only: notebooks and terminals belong to the web workspace. */
export const isAgentRuntime = (runtime: AgentRuntime): boolean =>
  runtime.type === 'agent' || Boolean(runtime.agentSpecId) || /agent/i.test(runtime.environment);

export async function listRuntimes(client: Client): Promise<AgentRuntime[]> {
  const body = await client('/api/runtimes/v1/runtimes');
  return records(body.runtimes).map(runtimeOf).filter(runtime => runtime.runtimeName);
}
