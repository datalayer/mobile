/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  cancelDeletion,
  confirms,
  DELETION_PATH,
  DELETION_WORDS,
  deletionOf,
  readDeletion,
  requestDeletion
} from '../api/accountDeletion';
import type { Client, RequestOptions } from '../api/client';
import { STORE_LINKS } from '../config/resources';

const PENDING = { requested_at: '2026-10-16T09:30:00Z', due_at: '2026-11-15T09:30:00Z', grace_days: 30 };

function fakeClient(answer: unknown) {
  const asked: { path: string; options?: RequestOptions }[] = [];
  const client = (async (path: string, options?: RequestOptions) => {
    asked.push({ path, options });
    return answer;
  }) as Client;
  return { client, asked };
}

describe('the account deletion request (M-052)', () => {
  it("reads IAM's answer: none pending, or the pending request", () => {
    expect(deletionOf({ success: true, request: null })).toBeNull();
    expect(deletionOf({ success: true, request: PENDING })).toEqual({
      requestedAt: '2026-10-16T09:30:00Z',
      dueAt: '2026-11-15T09:30:00Z',
      graceDays: 30
    });
  });

  it('refuses an answer that does not say, or a malformed request, rather than guess', () => {
    expect(() => deletionOf({ success: true })).toThrow('did not say');
    expect(() => deletionOf({ request: { ...PENDING, due_at: 'soon' } })).toThrow('malformed');
    expect(() => deletionOf({ request: { ...PENDING, grace_days: 0 } })).toThrow('malformed');
  });

  it('is confirmed by the handle exactly', () => {
    expect(confirms('eric', 'eric')).toBe(true);
    expect(confirms('eric', '  eric ')).toBe(true);
    expect(confirms('eric', 'Eric')).toBe(false);
    expect(confirms('eric', 'eri')).toBe(false);
    expect(confirms('', '')).toBe(false);
  });

  it('asks, reads and withdraws at /me/deletion on IAM, the handle sent to confirm', async () => {
    const asking = fakeClient({ success: true, request: PENDING });
    await expect(requestDeletion(asking.client, 'eric')).resolves.toMatchObject({ graceDays: 30 });
    expect(asking.asked).toEqual([{ path: DELETION_PATH, options: { method: 'POST', body: { confirm: 'eric' } } }]);
    expect(DELETION_PATH).toBe('/api/iam/v1/me/deletion');

    const reading = fakeClient({ success: true, request: null });
    await expect(readDeletion(reading.client)).resolves.toBeNull();
    expect(reading.asked[0].options).toBeUndefined();

    const withdrawing = fakeClient({ success: true });
    await cancelDeletion(withdrawing.client);
    expect(withdrawing.asked).toEqual([{ path: DELETION_PATH, options: { method: 'DELETE' } }]);
  });

  it('does not take an ask that recorded nothing as recorded', async () => {
    await expect(requestDeletion(fakeClient({ success: true, request: null }).client, 'eric')).rejects.toThrow('did not record');
  });

  it('says the date and the grace period of a pending request', () => {
    const words = DELETION_WORDS.pending(deletionOf({ request: PENDING })!);
    expect(words).toContain('2026');
    expect(words).toContain('30 days after you asked');
  });

  it("gives the store records the web's own control", () => {
    expect(STORE_LINKS.accountDeletion).toBe('https://datalayer.ai/settings/profile/danger');
  });
});
