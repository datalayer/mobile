/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A person's running agent runtimes, from the runtimes service, read by Agent
 * Runtimes' portable contract (M-014b). Raw runtimes have no application
 * capabilities.
 */

import { agentRuntimesOf, type AgentRuntime } from '@datalayer/agent-runtimes/lib/portable';
import type { Client } from './client';

/** The person's agent runtimes: notebooks and terminals belong to the web workspace. */
export async function listAgentRuntimes(client: Client): Promise<AgentRuntime[]> {
  return agentRuntimesOf(await client('/api/runtimes/v1/runtimes'));
}
