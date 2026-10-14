/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A person's conversations (MOBILE M-031): their threads from ai-agents'
 * record (`/apps/conversations/mine/threads`, LOOP P-24), read as the web's
 * *Your conversations* reads them, and where each one can be reached now.
 *
 * A thread names its deployment, never a runtime: where its session is held
 * is read again from that deployment each time it is opened
 * (`Deployment.sessionAddress`), so an old runtime address is never trusted.
 */

import { agentRuntimesUrlOf, askedOf } from '@datalayer/agent-runtimes/lib/portable';
import type { Client } from './client';
import type { Deployment, SessionAddress } from './deployments';
import { count, type Raw, records, segment, text } from './fields';
import type { AgentRuntime } from './runtimes';

/** One of the person's conversations with an application. */
export type ConversationThread = {
  sessionUid: string;
  appUid: string;
  deploymentUid: string;
  startedAt: string;
  /** What the person, or the application, called it. */
  title: string;
  /** Its first question, without the runtime-only `<asked-for>` preamble. */
  firstAsked: string;
  turns: number;
  tags: string[];
};

export function threadOf(raw: Raw): ConversationThread {
  return {
    sessionUid: text(raw.session_uid),
    appUid: text(raw.app_uid),
    deploymentUid: text(raw.deployment_uid),
    startedAt: text(raw.started_at),
    title: text(raw.title),
    firstAsked: askedOf(text(raw.first_asked)),
    turns: Math.max(0, Math.trunc(count(raw.turns))),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : []
  };
}

/** A thread under its title, else its first question (as the web lists it). */
export const threadTitle = (thread: ConversationThread): string =>
  thread.title || thread.firstAsked || 'A conversation with no words yet';

/** The person's threads with one application, newest first. */
export async function listThreads(client: Client, appUid: string): Promise<ConversationThread[]> {
  const body = await client(`/api/ai-agents/v1/apps/conversations/mine/threads?app_uid=${segment(appUid)}&limit=50`);
  return records(body.threads).map(threadOf).filter(thread => thread.sessionUid);
}

/** Where a conversation can be held, or why it opens on the web only. */
export type Reach = { kind: 'reachable'; address: SessionAddress } | { kind: 'web'; why: string };

/** Said when a deployment has no runtime a phone can reach. */
export const OPENS_ON_THE_WEB =
  'This application runs while its page is open on the web: talk to it there, or have its owner keep it running.';

/** Where a deployment's conversations are held now. */
export function reachOf(deployment: Deployment | undefined): Reach {
  if (!deployment) {
    return { kind: 'web', why: 'This conversation’s deployment is no longer yours to open.' };
  }
  if (deployment.state === 'paused') {
    return { kind: 'web', why: 'This application is paused: nothing can be sent to it until its owner resumes it.' };
  }
  return deployment.sessionAddress ? { kind: 'reachable', address: deployment.sessionAddress } : { kind: 'web', why: OPENS_ON_THE_WEB };
}

/** An agent on a standalone runtime, as its `/api/v1/agents` lists it. */
export type RuntimeAgent = { id: string; name: string };

/**
 * The agents a standalone runtime serves over AG-UI, from its own list
 * (`GET {agent-runtimes}/api/v1/agents`). Refused, in a sentence, when it
 * answers none.
 */
export async function runtimeAgents(
  runtime: Pick<AgentRuntime, 'ingress' | 'runtimeName'>,
  token: string | undefined,
  fetcher: typeof fetch
): Promise<{ baseUrl: string; agents: RuntimeAgent[] }> {
  const baseUrl = agentRuntimesUrlOf(runtime.ingress);
  const response = await fetcher(`${baseUrl}/api/v1/agents`, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!response.ok) {
    throw new Error(`${runtime.runtimeName} did not list its agents (${response.status}).`);
  }
  const body = (await response.json()) as { agents?: unknown };
  const agents = records(body.agents)
    .filter(agent => (text(agent.transport) || text(agent.protocol) || 'ag-ui') === 'ag-ui')
    .map(agent => ({ id: text(agent.id), name: text(agent.name) || text(agent.id) }))
    .filter(agent => agent.id);
  if (!agents.length) {
    throw new Error(`${runtime.runtimeName} has no agent to talk to over AG-UI.`);
  }
  return { baseUrl, agents };
}
