/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Deployed LOOP applications, from ai-agents (`/api/ai-agents/v1/apps/deployments`). */

import type { Client } from './client';
import { count, type Raw, record, records, segment, text } from './fields';
import { deploymentProtocolsOf, type DeploymentProtocols } from '../protocols/deployments';

export type DeploymentTarget = 'hosted' | 'embedded' | 'preview';
export type DeploymentState = 'live' | 'paused';

export type Deployment = {
  uid: string;
  appUid: string;
  appName: string;
  version: number;
  target: DeploymentTarget;
  state: DeploymentState;
  slug: string;
  updatedAt: string;
  speaks: DeploymentProtocols | null;
};

export type StoppedWork = {
  stopped: { what: string; runtime: string }[];
  notStopped: { what: string; runtime: string; why: string }[];
};

export type ResetCounts = {
  conversations: number;
  entries: number;
  schedules: number;
  memoriesNote: string;
};

export type DeploymentEvent = {
  uid: string;
  kind: 'promoted' | 'rolled_back' | 'paused' | 'resumed' | 'reset';
  actor: string;
  at: string;
  details: Raw;
};

/** The same reading as the web `deploymentOf`, limited to what mobile shows. */
export function deploymentOf(raw: Raw): Deployment {
  const version = count(raw.version);
  return {
    uid: text(raw.uid),
    appUid: text(raw.app_uid),
    appName: text(raw.app_name),
    version: version > 0 ? Math.trunc(version) : 1,
    target: raw.target === 'embedded' || raw.target === 'preview' ? raw.target : 'hosted',
    state: raw.state === 'paused' ? 'paused' : 'live',
    slug: text(raw.slug),
    updatedAt: text(raw.updated_at),
    speaks: deploymentProtocolsOf(raw.speaks)
  };
}

/** One application and its deployments, newest first. */
export type Application = {
  appUid: string;
  name: string;
  deployments: Deployment[];
  /** Live when any of its deployments is. */
  state: DeploymentState;
};

/** Deployments grouped under their application, previews left out, most recently changed first. */
export function applicationsOf(deployments: readonly Deployment[]): Application[] {
  const byApp = new Map<string, Application>();
  for (const deployment of deployments) {
    if (deployment.target === 'preview' || !deployment.appUid) {
      continue;
    }
    const known = byApp.get(deployment.appUid);
    if (known) {
      known.deployments.push(deployment);
      if (deployment.state === 'live') {
        known.state = 'live';
      }
      if (!known.name && deployment.appName) {
        known.name = deployment.appName;
      }
    } else {
      byApp.set(deployment.appUid, {
        appUid: deployment.appUid,
        name: deployment.appName,
        deployments: [deployment],
        state: deployment.state
      });
    }
  }
  const latest = (app: Application) =>
    app.deployments.reduce((max, d) => (d.updatedAt > max ? d.updatedAt : max), '');
  return [...byApp.values()].sort((a, b) => latest(b).localeCompare(latest(a)));
}

const BASE = '/api/ai-agents/v1/apps/deployments';

export async function listDeployments(client: Client): Promise<Deployment[]> {
  const body = await client(BASE);
  return records(body.deployments).map(deploymentOf);
}

export async function getDeployment(client: Client, uid: string): Promise<Deployment> {
  const body = await client(`${BASE}/${segment(uid)}`);
  return deploymentOf(record(body.deployment ?? body));
}

const workItems = (value: unknown): Raw[] => records(value);

export function stoppedWorkOf(value: unknown): StoppedWork {
  const raw = record(value);
  return {
    stopped: workItems(raw.stopped).map(item => ({ what: text(item.what), runtime: text(item.runtime) })),
    notStopped: workItems(raw.not_stopped).map(item => ({
      what: text(item.what), runtime: text(item.runtime), why: text(item.why)
    }))
  };
}

export function stoppedWorkWords(work: StoppedWork): string {
  const stopped = work.stopped.length;
  const first = stopped === 0 ? 'Paused: nothing was running.' : `Paused: ${stopped} ${stopped === 1 ? 'session' : 'sessions'} in progress stopped.`;
  const missed = work.notStopped.map(item => `${item.what}${item.runtime ? ` (${item.runtime})` : ''}: ${item.why}`).join(' ');
  return missed ? `${first} Not stopped — ${missed}` : first;
}

/** Owner-only on the server: pause/resume one exact deployment version. */
export async function changeDeploymentState(
  client: Client,
  deployment: Pick<Deployment, 'uid' | 'version'>,
  state: DeploymentState
): Promise<{ deployment: Deployment; work: StoppedWork | null }> {
  const body = await client(`${BASE}/${segment(deployment.uid)}`, {
    method: 'PATCH', body: { version: deployment.version, state }
  });
  return {
    deployment: deploymentOf(record(body.deployment)),
    work: body.work ? stoppedWorkOf(body.work) : null
  };
}

export function resetCountsOf(value: unknown): ResetCounts {
  const raw = record(value);
  const safeCount = (item: unknown) => Math.max(0, Math.trunc(count(item)));
  return {
    conversations: safeCount(raw.conversations),
    entries: safeCount(raw.entries),
    schedules: safeCount(raw.schedules),
    memoriesNote: text(raw.memories_note)
  };
}

export async function getResetCounts(client: Client, uid: string): Promise<{ paused: boolean; counts: ResetCounts }> {
  const body = await client(`${BASE}/${segment(uid)}/reset`);
  return { paused: body.paused === true, counts: resetCountsOf(body.reset) };
}

export async function resetDeployment(
  client: Client,
  uid: string,
  confirmed: Pick<ResetCounts, 'conversations' | 'schedules'>
): Promise<{ notDeleted: { what: string; why: string }[] }> {
  const body = await client(`${BASE}/${segment(uid)}/reset`, {
    method: 'POST',
    body: { conversations: confirmed.conversations, schedules: confirmed.schedules }
  });
  return {
    notDeleted: records(body.not_deleted).map(item => ({ what: text(item.what), why: text(item.why) }))
  };
}

export function resetWords(counts: ResetCounts): { deletes: string; stays: string } {
  const plural = (value: number, word: string) => `${value} ${word}${value === 1 ? '' : 's'}`;
  return {
    deletes: `${plural(counts.conversations, 'conversation')} and ${plural(counts.schedules, 'schedule')}`,
    stays: `The deployment, its address and version stay.${counts.memoriesNote ? ` ${counts.memoriesNote}` : ''}`
  };
}

const EVENT_KINDS = new Set<DeploymentEvent['kind']>(['promoted', 'rolled_back', 'paused', 'resumed', 'reset']);

export function deploymentEventOf(value: unknown): DeploymentEvent {
  const raw = record(value);
  if (!EVENT_KINDS.has(raw.kind as DeploymentEvent['kind'])) throw new Error(`Unknown deployment event: ${String(raw.kind)}`);
  return {
    uid: text(raw.uid), kind: raw.kind as DeploymentEvent['kind'],
    actor: text(raw.actor_handle) || text(raw.actor_uid), at: text(raw.at), details: record(raw.details)
  };
}

export async function listDeploymentEvents(client: Client, uid: string): Promise<DeploymentEvent[]> {
  const body = await client(`${BASE}/${segment(uid)}/events?limit=20`);
  return records(body.events).map(deploymentEventOf);
}

export function deploymentEventWords(event: DeploymentEvent): string {
  const from = Math.trunc(count(event.details.from));
  const to = Math.trunc(count(event.details.to));
  const moved = from > 0 && to > 0 ? ` from version ${from} to version ${to}` : '';
  const verb = {
    promoted: `Promoted${moved}`, rolled_back: `Rolled back${moved}`, paused: 'Paused', resumed: 'Resumed', reset: 'Reset'
  }[event.kind];
  const organization = event.kind === 'paused' && event.details.by === 'organization_owner' ? ', an owner of your organization' : '';
  const deleted = record(event.details.deleted);
  const deletedConversations = Math.trunc(count(deleted.conversations));
  const deletedSchedules = Math.trunc(count(deleted.schedules));
  const plural = (value: number, word: string) => `${value} ${word}${value === 1 ? '' : 's'}`;
  const what = event.kind === 'reset' && Object.keys(deleted).length
    ? ` — ${plural(deletedConversations, 'conversation')} and ${plural(deletedSchedules, 'schedule')} deleted`
    : '';
  return `${verb}${event.actor ? ` by ${event.actor}${organization}` : ''}${event.at ? `, ${new Date(event.at).toLocaleString()}` : ''}${what}`;
}
