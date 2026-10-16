/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Pure query-key contract shared by requests and realtime reconciliation. */

export const KEYS = {
  deployments: ['deployments'] as const,
  runtimes: ['runtimes'] as const,
  approvals: ['approvals'] as const,
  approvalCount: ['approvals', 'count'] as const,
  approval: (id: string) => ['approvals', id] as const,
  activity: (appUid: string) => ['activity', appUid] as const,
  deploymentEvents: (uid: string) => ['deployments', uid, 'events'] as const,
  checkedDeployments: (appUid: string) => ['deployments', 'checked', appUid] as const,
  allActivity: ['activity', '*all'] as const,
  faces: ['faces'] as const,
  protocolConnections: ['protocol-connections'] as const,
  protocolActivity: ['activity', 'protocols'] as const,
  accountDeletion: ['account', 'deletion'] as const,
  runningPermissions: (appUid: string, version: number) => ['apps', appUid, 'versions', version, 'permissions'] as const
};

/** Every key a reconnect refetches: approvals, deployments and visible activity. */
export const RECONCILED = [KEYS.approvals, KEYS.deployments, KEYS.runtimes, KEYS.protocolConnections, ['activity']] as const;
