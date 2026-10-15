/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { activityOf } from '../api/activity';
import { approvalOf, waitingFirst } from '../api/approvals';
import { applicationsOf, deploymentOf } from '../api/deployments';
import { isAgentRuntime, runtimeOf } from '../api/runtimes';
import { environmentOf } from '../config/environment';
import { actionOf, argumentsShown, messageOfApproval, rowSummary, whyAsked } from '../features/approvals/format';
import { keysOfEvent, wsUrlOf } from '../realtime/events';

const approval = (raw: Record<string, unknown>) =>
  approvalOf({ id: 'a1', tool_name: 'send', status: 'pending', created_at: '2026-01-01T00:00:00Z', ...raw });

// Same fixtures as the web `appApprovals.spec.ts` (MOBILE §3.2).
describe('a message it asks to send', () => {
  const body = 'Hello,\n\n' + 'We are correcting invoice 2026-114 today. '.repeat(40) + '\n\nEric';

  it('is shown whole: to whom, its subject, every word', () => {
    const message = messageOfApproval(
      approval({
        tool_name: 'google-workspace__send_gmail_message',
        tool_args: { to: 'client@acme.com', subject: 'Re: Invoice', body, thread_id: 't2', _rule: 'Your rule' }
      })
    );
    expect(message).toEqual({ to: 'client@acme.com', cc: '', bcc: '', subject: 'Re: Invoice', body, forwards: false, replies: true });
    expect(message!.body.length).toBeGreaterThan(1000);
  });

  it('says when it forwards, and lists every address', () => {
    const message = messageOfApproval(
      approval({ tool_args: { to: ['ana@datalayer.io', 'bo@datalayer.io'], body: 'For you.', forward_message_id: 'm4' } })
    );
    expect(message).toMatchObject({ to: 'ana@datalayer.io, bo@datalayer.io', forwards: true, replies: false });
  });

  it('is nothing for an approval that sends no message', () => {
    expect(messageOfApproval(approval({ tool_args: { title: 'Weekly digest', content: 'x' } }))).toBeNull();
    expect(messageOfApproval(approval({ tool_args: { to: 'a@b.c' } }))).toBeNull();
  });

  it('keeps the body off the list row', () => {
    const row = rowSummary(approval({ tool_args: { to: 'a@b.c', subject: 'Hi', body: 'secret body' } }));
    expect(row).toBe('a@b.c · Hi');
  });
});

describe('any other approval', () => {
  it('shows every argument but the private markers, and why it asked', () => {
    const item = approval({ tool_args: { path: '/tmp/x', mode: 'w', _check: 'Writes need you' } });
    expect(JSON.parse(argumentsShown(item))).toEqual({ path: '/tmp/x', mode: 'w' });
    expect(whyAsked(item)).toBe('Writes need you');
    expect(argumentsShown(approval({}))).toBe('It gave no arguments.');
  });

  it('names its action', () => {
    expect(actionOf('send_email')).toBe('Send email');
    expect(actionOf('')).toBe('An action');
  });
});

describe('the inbox', () => {
  it('lists pending approvals oldest first and reads the server read state', () => {
    const list = waitingFirst([
      approval({ id: 'new', created_at: '2026-02-01T00:00:00Z', read: true }),
      approval({ id: 'done', status: 'approved' }),
      approval({ id: 'old', created_at: '2026-01-01T00:00:00Z' })
    ]);
    expect(list.map(a => a.id)).toEqual(['old', 'new']);
    expect(list[1]!.read).toBe(true);
  });
});

describe('deployments', () => {
  it('group under their application, previews apart, live when any is', () => {
    const apps = applicationsOf([
      deploymentOf({ uid: 'd1', app_uid: 'a', app_name: 'Triage', state: 'paused', target: 'hosted', updated_at: '2026-01-01' }),
      deploymentOf({ uid: 'd2', app_uid: 'a', state: 'live', target: 'embedded', updated_at: '2026-01-03' }),
      deploymentOf({ uid: 'd3', app_uid: 'a', target: 'preview' }),
      deploymentOf({ uid: 'd4', app_uid: 'b', app_name: 'Digest', state: 'paused', updated_at: '2026-01-02' })
    ]);
    expect(apps.map(app => [app.appUid, app.name, app.state, app.deployments.length])).toEqual([
      ['a', 'Triage', 'live', 2],
      ['b', 'Digest', 'paused', 1]
    ]);
  });

  it('read a malformed record safely', () => {
    expect(deploymentOf({ version: 'x', target: 'nope' })).toMatchObject({ version: 1, target: 'hosted', state: 'live' });
  });
});

describe('running agents', () => {
  it('keep only agent runtimes', () => {
    const agent = runtimeOf({ runtime_name: 'r1', type: 'agent', environment: { name: 'ai-agents-env' } });
    const notebook = runtimeOf({ runtime_name: 'r2', type: 'notebook', environment: { name: 'python-cpu-env' } });
    expect(agent.environment).toBe('ai-agents-env');
    expect([agent, notebook].filter(isAgentRuntime).map(r => r.runtimeName)).toEqual(['r1']);
  });
});

describe('activity', () => {
  it('reads in progress, scheduled and completed, and says a scheduler problem', () => {
    const work = activityOf({
      in_progress: [{ uid: 'e1', session_uid: 's1', kind: 'run', created_at: '2026-01-01' }],
      scheduled: [{ deployment_uid: 'd1', version: 2, cron: '0 9 * * *', next_at: '2026-01-02' }],
      scheduled_problem: 'Its schedules could not be read',
      completed: 'nope'
    });
    expect(work.inProgress[0]).toMatchObject({ uid: 'e1', sessionUid: 's1' });
    expect(work.scheduled[0]).toMatchObject({ version: 2, cron: '0 9 * * *' });
    expect(work.scheduledProblem).toBe('Its schedules could not be read');
    expect(work.completed).toEqual([]);
  });
});

describe('realtime', () => {
  it('derives the socket address from the services address', () => {
    expect(wsUrlOf('https://prod1.datalayer.run')).toBe('wss://prod1.datalayer.run/api/ai-agents/v1/ws');
    expect(wsUrlOf('http://localhost:8888')).toBe('ws://localhost:8888/api/ai-agents/v1/ws');
  });

  it('maps an event to the queries it makes stale', () => {
    expect(keysOfEvent({ type: 'tool_approval_updated' })).toEqual([['approvals']]);
    expect(keysOfEvent({ type: 'unknown' })).toEqual([]);
    expect(keysOfEvent(null)).toEqual([]);
  });
});

describe('interim sign-in (M-019)', () => {
  const of = (profile: string) =>
    environmentOf({
      EXPO_PUBLIC_DATALAYER_RUN_URL: 'https://prod1.datalayer.run',
      EXPO_PUBLIC_DATALAYER_MCP_URL: 'https://mcp.datalayer.run',
      EXPO_PUBLIC_BUILD_PROFILE: profile
    });

  it.each(['staging', 'production'])('is not offered by a %s build', profile => {
    expect(of(profile).allowsInterimSignIn).toBe(false);
  });

  it.each(['development', 'e2e', 'preview'])('is offered by a %s build', profile => {
    expect(of(profile).allowsInterimSignIn).toBe(true);
  });
});
