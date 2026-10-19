/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { approvalOf, listPending, markRead } from '../api/approvals';

describe('the server-owned approval read state', () => {
  it('marks the exact encoded approval through the persistent server route', async () => {
    const calls: { path: string; options: unknown }[] = [];
    const client = (async (path: string, options?: unknown) => {
      calls.push({ path, options });
      return { approval: { id: 'approval / 1', status: 'pending', read: true } };
    }) as unknown as Parameters<typeof markRead>[0];

    await expect(markRead(client, 'approval / 1')).resolves.toMatchObject({ id: 'approval / 1', read: true });
    expect(calls).toEqual([
      {
        path: '/api/ai-agents/v1/tool-approvals/approval%20%2F%201/mark-read',
        options: { method: 'POST' }
      }
    ]);
  });

  it('reads persisted read state while keeping pending approvals oldest first', async () => {
    const client = (async () => ({
      approvals: [
        { id: 'new', status: 'pending', read: true, created_at: '2026-10-14T11:00:00Z' },
        { id: 'done', status: 'approved', read: false, created_at: '2026-10-14T09:00:00Z' },
        { id: 'old', status: 'pending', read: false, created_at: '2026-10-14T10:00:00Z' }
      ]
    })) as unknown as Parameters<typeof listPending>[0];

    await expect(listPending(client)).resolves.toEqual([
      expect.objectContaining({ id: 'old', read: false }),
      expect.objectContaining({ id: 'new', read: true })
    ]);
  });

  it('defaults an absent read marker to unread', () => {
    expect(approvalOf({ id: 'a-1' }).read).toBe(false);
  });
});
