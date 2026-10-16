/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Deployed LOOP applications, from ai-agents (`/api/ai-agents/v1/apps/deployments`). */

import {
  deploymentEventOf,
  notDeletedOf,
  resetBody,
  resetCountsOf,
  stateChangeBody,
  stoppedWorkOf,
  type DeploymentEvent,
  type DeploymentState,
  type ResetCounts,
  type StoppedWork
} from '@datalayer/agent-runtimes/lib/portable';
import type { Client } from './client';
import { count, type Raw, record, records, segment, text } from './fields';
import { deploymentProtocolsOf, type DeploymentProtocols } from '../protocols/deployments';

export type DeploymentTarget = 'hosted' | 'embedded' | 'preview';
// Pause, resume, reset and a deployment's events: Agent Runtimes' portable lifecycle, as the Studio's (M-041b).
export type { DeploymentEvent, DeploymentState, ResetCounts, StoppedWork };

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

/**
 * A runtime and the agent a conversation is had with there — always as
 * ai-agents locates it on opening (`locateThread`, `locateNew`), never read
 * from a deployment and remembered.
 */
export type SessionAddress = { baseUrl: string; agent: string };

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

/**
 * One application's deployments with the identity each acts under checked now
 * by the server (`identity=true`, MOBILE M-045b): Application → Protocols.
 */
export async function listCheckedDeployments(client: Client, appUid: string): Promise<Deployment[]> {
  const body = await client(`${BASE}?app_uid=${segment(appUid)}&identity=true`);
  return records(body.deployments).map(deploymentOf);
}

export async function getDeployment(client: Client, uid: string): Promise<Deployment> {
  const body = await client(`${BASE}/${segment(uid)}`);
  return deploymentOf(record(body.deployment ?? body));
}

/** Owner-only on the server: pause/resume one exact deployment version. */
export async function changeDeploymentState(
  client: Client,
  deployment: Pick<Deployment, 'uid' | 'version'>,
  state: DeploymentState
): Promise<{ deployment: Deployment; work: StoppedWork | null }> {
  const body = await client(`${BASE}/${segment(deployment.uid)}`, {
    method: 'PATCH', body: stateChangeBody(deployment.version, state)
  });
  return {
    deployment: deploymentOf(record(body.deployment)),
    work: body.work ? stoppedWorkOf(record(body.work)) : null
  };
}

export async function getResetCounts(client: Client, uid: string): Promise<{ paused: boolean; counts: ResetCounts }> {
  const body = await client(`${BASE}/${segment(uid)}/reset`);
  return { paused: body.paused === true, counts: resetCountsOf(record(body.reset)) };
}

export async function resetDeployment(
  client: Client,
  uid: string,
  confirmed: Pick<ResetCounts, 'conversations' | 'schedules'>
): Promise<{ notDeleted: { what: string; why: string }[] }> {
  const body = await client(`${BASE}/${segment(uid)}/reset`, {
    method: 'POST',
    body: resetBody(confirmed)
  });
  return { notDeleted: notDeletedOf(body) };
}

export async function listDeploymentEvents(client: Client, uid: string): Promise<DeploymentEvent[]> {
  const body = await client(`${BASE}/${segment(uid)}/events?limit=20`);
  return records(body.events).map(deploymentEventOf);
}

/** A deployment shared with the person (invited, not theirs), as ai-agents lists it. */
export type SharedDeployment = {
  uid: string;
  appUid: string;
  appName: string;
  state: 'live' | 'paused' | 'gone';
  /** Why nothing is sent to it now; `''` while live. */
  says: string;
  ownerName: string;
};

const sharedOf = (raw: Raw, gone: boolean): SharedDeployment | null => {
  const uid = text(raw.uid);
  if (!uid) return null;
  const owner = record(raw.owner);
  const state = gone ? 'gone' : raw.state === 'live' ? 'live' : 'paused';
  return {
    uid,
    appUid: text(raw.app_uid),
    appName: text(raw.app_name),
    state,
    // A state the phone cannot read is not live: nothing is offered for it.
    says: text(raw.says) || (state === 'live' ? '' : 'Nothing is sent to it now.'),
    ownerName: text(owner.name) || (text(owner.handle) ? `@${text(owner.handle)}` : '')
  };
};

/**
 * The deployments shared with the person (ai-agents `/apps/deployments/shared`,
 * decided 15 October 2026): those that invite them now, live or paused, and
 * those they talked to that were taken down since.
 */
export async function listShared(client: Client): Promise<SharedDeployment[]> {
  const body = await client('/api/ai-agents/v1/apps/deployments/shared');
  return [
    ...records(body.shared).map(raw => sharedOf(raw, false)),
    ...records(body.gone).map(raw => sharedOf(raw, true))
  ].filter((item): item is SharedDeployment => item !== null);
}
