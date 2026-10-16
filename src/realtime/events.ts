/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Pure classification of server broadcasts; safe in tests and native code. */

import type { QueryKey } from '@tanstack/react-query';
import { KEYS } from '../features/queryKeys';

/** The runtimes plane `https://host` -> `wss://host/api/ai-agents/v1/ws`. */
export const wsUrlOf = (runtimesUrl: string): string => `${runtimesUrl.replace(/^http/, 'ws')}/api/ai-agents/v1/ws`;

/** The queries one server broadcast (`{channel, event, data}`) makes stale. */
export function keysOfEvent(raw: unknown): readonly QueryKey[] {
  const frame = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const name = String(frame.event ?? frame.type ?? '');
  if (name.startsWith('tool_approval') || name.startsWith('tool-approval') || name === 'notification_created') {
    return [KEYS.approvals];
  }
  if (name.startsWith('deployment') || name.startsWith('app_')) {
    return [KEYS.deployments, ['activity']];
  }
  return [];
}
