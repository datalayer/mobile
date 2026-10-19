/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A person's conversations: their threads from ai-agents'
 * record (`/apps/conversations/mine/threads`), read as the web's
 * *Your conversations* reads them, and where each one can be reached now.
 *
 * A thread names its deployment, never a runtime: where it is continued is
 * asked of ai-agents each time it is opened (`locateThread`) —
 * the runtime its deployment is kept on, a runtime of the person's own, one to
 * start, or why not — whoever's the application, so an old runtime address is
 * never trusted. A new conversation is located the same way from its
 * deployment (`locateNew`), the person's own or one shared with them.
 */

import { agentRuntimesUrlOf, askedOf, type AgentRuntime } from '@datalayer/agent-runtimes/lib/portable';
import type { Client } from './client';
import type { SessionAddress } from './deployments';
import { count, type Raw, record, records, segment, text } from './fields';

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

const THREADS = '/api/ai-agents/v1/apps/conversations/mine/threads';
const NEW = '/api/ai-agents/v1/apps/conversations/mine/deployments';

/** The person's threads, newest first: with one application, or with every one, whoever's. */
export async function listThreads(client: Client, appUid = ''): Promise<ConversationThread[]> {
  const body = await client(`${THREADS}?${appUid ? `app_uid=${segment(appUid)}&` : ''}limit=50`);
  return records(body.threads).map(threadOf).filter(thread => thread.sessionUid);
}

/** What the thread's deployment is, as ai-agents names it with where it is continued. */
export type ThreadPlace = { appUid: string; appName: string; deploymentUid: string; version: number; owner: boolean };

/**
 * Where one of the person's conversations is continued now (ai-agents'
 * `…/threads/{uid}/reach`): on a runtime that answers now — the one its
 * deployment is kept on, or one of their own — with a runtime of their own to
 * start first, or not, in ai-agents' sentence.
 */
export type ThreadReach =
  | ({ kind: 'reachable'; address: SessionAddress; on: 'kept' | 'own' } & ThreadPlace)
  | ({ kind: 'launch' } & ThreadPlace)
  | { kind: 'closed'; why: string };

/** Said when ai-agents' answer cannot be read: nothing is sent anywhere. */
export const REACH_UNREAD = 'Where this conversation continues could not be read: open it on the web.';

/** Said before a runtime of the person's own is started for a conversation. */
export const STARTS_YOUR_RUNTIME =
  'Nothing runs this application for you now. Continuing starts a computer of your own for it, as its page on the web does, and its time is counted to your credits.';

const reachable = (url: unknown, agent: unknown): SessionAddress | null => {
  const baseUrl = text(url).replace(/\/+$/, '');
  const id = text(agent);
  return /^https:\/\//.test(baseUrl) && id ? { baseUrl, agent: id } : null;
};

/** ai-agents' answer, strictly: an unknown kind or an address that is not HTTPS is closed. */
export function threadReachOf(raw: Raw): ThreadReach {
  const place: ThreadPlace = {
    appUid: text(raw.app_uid),
    appName: text(raw.app_name),
    deploymentUid: text(raw.deployment_uid),
    version: Math.max(1, Math.trunc(count(raw.version))),
    owner: raw.owner === true
  };
  if (raw.reach === 'closed') {
    return { kind: 'closed', why: text(raw.reason) || REACH_UNREAD };
  }
  if (!place.appUid || !place.deploymentUid) {
    return { kind: 'closed', why: REACH_UNREAD };
  }
  if (raw.reach === 'launch') {
    return { kind: 'launch', ...place };
  }
  if (raw.reach === 'kept' || raw.reach === 'runtime') {
    const address = reachable(raw.url, raw.agent_id);
    return address ? { kind: 'reachable', address, on: raw.reach === 'kept' ? 'kept' : 'own', ...place } : { kind: 'closed', why: REACH_UNREAD };
  }
  return { kind: 'closed', why: REACH_UNREAD };
}

/** Where a conversation continues now; asked each time it is opened, never remembered. */
export async function locateThread(client: Client, sessionUid: string): Promise<ThreadReach> {
  const body = await client(`${THREADS}/${segment(sessionUid)}/reach`);
  return threadReachOf(record(body.reach));
}

/**
 * Where a new conversation with a deployment is had now (decided 15 October
 * 2026): the person's own, or one shared with them, as a thread is located;
 * one they may not open is not found.
 */
export async function locateNew(client: Client, deploymentUid: string): Promise<ThreadReach> {
  const body = await client(`${NEW}/${segment(deploymentUid)}/reach`);
  return threadReachOf(record(body.reach));
}

/** Start a runtime of the person's own for a new conversation ai-agents said `launch` of. */
export async function startNewRuntime(client: Client, deploymentUid: string): Promise<ThreadReach> {
  const body = await client(`${NEW}/${segment(deploymentUid)}/reach`, { method: 'POST' });
  return threadReachOf(record(body.reach));
}

/** Start a runtime of the person's own for a conversation ai-agents said `launch` of; answers where it continues. */
export async function startThreadRuntime(client: Client, sessionUid: string): Promise<ThreadReach> {
  const body = await client(`${THREADS}/${segment(sessionUid)}/reach`, { method: 'POST' });
  return threadReachOf(record(body.reach));
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
