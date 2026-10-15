/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The Inbox and detail say approvals with Agent Runtimes' shared card controller (M-016), as the web does. */

import { APPROVAL_CARD_WORDS, approvalCardOf } from '@datalayer/agent-runtimes/lib/portable';
import { approvalOf } from '../api/approvals';
import { actionOf, APPROVAL_WORDS, argumentsShown, rowSummary } from '../features/approvals/format';

describe('approvals said as every card says them (M-016)', () => {
  it('reads a REST approval through the shared controller: a mail whole, anything else every argument', () => {
    const mail = approvalOf({
      id: 'a1', agent_id: 'triage', tool_name: 'send_email', status: 'pending', created_at: '2026-10-15T09:00:00Z',
      tool_args: { to: ['ada@example.com'], subject: 'Report', body: 'Attached.', _rule: 'Mail asks first' }
    });
    expect(rowSummary(mail)).toBe(approvalCardOf(mail).summary);
    expect(rowSummary(mail)).toBe('ada@example.com · Report');
    const raw = approvalOf({ id: 'a2', tool_name: 'delete_file', status: 'pending', created_at: 'x', tool_args: { path: '/a', _check: 'Deletes' } });
    expect(actionOf(raw.toolName)).toBe('Delete file');
    expect(JSON.parse(argumentsShown(raw))).toEqual({ path: '/a' });
    expect(APPROVAL_WORDS).toBe(APPROVAL_CARD_WORDS);
  });
});
