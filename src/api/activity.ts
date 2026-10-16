/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an application, or all of them, is doing (LOOP R-15, MOBILE M-040), from
 * `/api/ai-agents/v1/apps/activity`: read and said by Agent Runtimes' portable
 * contract, as the Studio reads it (M-015b).
 */

import { activityOf, type AppActivity } from '@datalayer/agent-runtimes/lib/portable';
import type { Client } from './client';
import { segment } from './fields';

/** One application's activity, or, with none, all of the caller's; completed sessions from `offset`. */
export async function readActivity(client: Client, appUid?: string, offset = 0, limit = 20): Promise<AppActivity> {
  const only = appUid ? `app_uid=${segment(appUid)}&` : '';
  return activityOf(await client(`/api/ai-agents/v1/apps/activity?${only}limit=${limit}&offset=${offset}`));
}
