/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Conversations on the phone (MOBILE M-031 to M-035), over Agent Runtimes'
 * portable session clients and conversation reducer: threads and where they
 * are reached, prompt/stream/stop/resume, questions, the safe Markdown subset,
 * and what survives navigation and the background.
 */

import { RUN_CUT_SHORT, RuntimeRefusal, type AgUiEvent, type AppSessionsClient, type AgentRunClient, type StreamOptions } from '@datalayer/agent-runtimes/lib/portable';
import {
  locateThread, OPENS_ON_THE_WEB, REACH_UNREAD, reachOf, runtimeAgents, startThreadRuntime, threadOf, threadReachOf, threadTitle
} from '../api/conversations';
import { deploymentOf, sessionAddressOf } from '../api/deployments';
import { ConversationController, FILE_ON_THE_WEB, ONE_TURN_AT_A_TIME } from '../features/conversations/controller';
import { blocksOf, linkAllowed, spansOf } from '../features/conversations/markdownBlocks';
import { conversationFor, forgetConversations, HELD_LIMIT, heldCount, holdAs } from '../features/conversations/registry';

const KEPT = {
  uid: 'd1', app_uid: 'a1', app_name: 'Desk', version: 3, target: 'hosted', state: 'live', always_on: true,
  kept: { state: 'running', url: 'https://r1.datalayer.run/agent-runtimes/rt-9/', agent_id: 'desk-agent' }
};

describe('threads and where they are reached (M-031)', () => {
  it('lists a thread without the runtime-only asked-for preamble', () => {
    const thread = threadOf({
      session_uid: 's1', app_uid: 'a1', deployment_uid: 'd1', started_at: '2026-10-14T10:00:00Z', title: '',
      first_asked: '<asked-for>PAP: Ada through Acme</asked-for>\nWhere is my order?', turns: 2, tags: ['orders', 3]
    });
    expect(thread).toMatchObject({ sessionUid: 's1', deploymentUid: 'd1', firstAsked: 'Where is my order?', turns: 2, tags: ['orders'] });
    expect(threadTitle(thread)).toBe('Where is my order?');
    expect(threadTitle({ ...thread, title: 'Order 7' })).toBe('Order 7');
    expect(() => threadOf({ session_uid: 's', first_asked: '<asked-for>never closed' })).toThrow(/never closes/);
  });

  it('reaches a deployment only where it is kept running now, read again with the deployment', () => {
    expect(sessionAddressOf(KEPT)).toEqual({ baseUrl: 'https://r1.datalayer.run/agent-runtimes/rt-9', agent: 'desk-agent' });
    expect(reachOf(deploymentOf(KEPT))).toEqual({ kind: 'reachable', address: { baseUrl: 'https://r1.datalayer.run/agent-runtimes/rt-9', agent: 'desk-agent' } });
    // Not kept on, its runtime ended, a bad address: the web.
    expect(sessionAddressOf({ ...KEPT, always_on: false })).toBeNull();
    expect(sessionAddressOf({ ...KEPT, kept: { state: 'ended', agent_id: 'desk-agent' } })).toBeNull();
    expect(sessionAddressOf({ ...KEPT, kept: { ...KEPT.kept, url: 'javascript:alert(1)' } })).toBeNull();
    expect(reachOf(deploymentOf({ ...KEPT, always_on: false }))).toEqual({ kind: 'web', why: OPENS_ON_THE_WEB });
    // Paused: nothing is sent, whatever the runtime.
    expect(reachOf(deploymentOf({ ...KEPT, state: 'paused' }))).toMatchObject({ kind: 'web', why: expect.stringMatching(/paused/) });
    expect(reachOf(undefined)).toMatchObject({ kind: 'web' });
  });

  it('continues a thread where ai-agents says it continues now, whoever the application is (§4.4.7)', async () => {
    const place = { session_uid: 's1', app_uid: 'a1', app_name: 'Desk', deployment_uid: 'd1', version: 4, owner: false };
    expect(threadReachOf({ ...place, reach: 'kept', url: 'https://r1.datalayer.run/agent-runtimes/rt-9/', agent_id: 'desk' })).toEqual({
      kind: 'reachable', on: 'kept', address: { baseUrl: 'https://r1.datalayer.run/agent-runtimes/rt-9', agent: 'desk' },
      appUid: 'a1', appName: 'Desk', deploymentUid: 'd1', version: 4, owner: false
    });
    expect(threadReachOf({ ...place, reach: 'runtime', url: 'https://r1/agent-runtimes/rt-2', agent_id: 'desk' })).toMatchObject({ kind: 'reachable', on: 'own' });
    expect(threadReachOf({ ...place, reach: 'launch' })).toMatchObject({ kind: 'launch', deploymentUid: 'd1', owner: false });
    expect(threadReachOf({ ...place, reach: 'closed', reason: 'Desk is paused by its owner, so this conversation is not continued now.' })).toEqual({
      kind: 'closed', why: 'Desk is paused by its owner, so this conversation is not continued now.'
    });
    // Fail closed: no address, not HTTPS, no agent, an unknown kind, no deployment.
    for (const raw of [
      { ...place, reach: 'kept' },
      { ...place, reach: 'runtime', url: 'http://r1/agent-runtimes/rt-2', agent_id: 'desk' },
      { ...place, reach: 'runtime', url: 'javascript:alert(1)', agent_id: 'desk' },
      { ...place, reach: 'kept', url: 'https://r1/agent-runtimes/rt-2' },
      { ...place, reach: 'somewhere', url: 'https://r1/agent-runtimes/rt-2', agent_id: 'desk' },
      { ...place, deployment_uid: '', reach: 'launch' },
      { reach: 'closed' }
    ]) {
      expect(threadReachOf(raw)).toEqual({ kind: 'closed', why: REACH_UNREAD });
    }
    const asked: { path: string; method?: string }[] = [];
    const client = (async (path: string, options?: { method?: string }) => {
      asked.push({ path, method: options?.method });
      return { reach: { ...place, reach: options?.method === 'POST' ? 'runtime' : 'launch', url: 'https://r1/agent-runtimes/rt-2', agent_id: 'desk' } };
    }) as never;
    expect(await locateThread(client, 's 1')).toMatchObject({ kind: 'launch' });
    expect(await startThreadRuntime(client, 's 1')).toMatchObject({ kind: 'reachable', on: 'own' });
    expect(asked).toEqual([
      { path: '/api/ai-agents/v1/apps/conversations/mine/threads/s%201/reach', method: undefined },
      { path: '/api/ai-agents/v1/apps/conversations/mine/threads/s%201/reach', method: 'POST' }
    ]);
  });

  it('finds a standalone runtime agents from its ingress, AG-UI only', async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({ agents: [
      { id: 'helper', name: 'Helper', transport: 'ag-ui' },
      { id: 'other', transport: 'a2a' }
    ] })));
    const found = await runtimeAgents({ ingress: 'https://h/jupyter/server/rt-1', runtimeName: 'rt-1' }, 'tok', fetcher as never);
    expect(found).toEqual({ baseUrl: 'https://h/agent-runtimes/rt-1', agents: [{ id: 'helper', name: 'Helper' }] });
    expect((fetcher.mock.calls[0] as unknown[])[0]).toBe('https://h/agent-runtimes/rt-1/api/v1/agents');
    const none = jest.fn(async () => new Response(JSON.stringify({ agents: [] })));
    await expect(runtimeAgents({ ingress: 'https://h/jupyter/server/rt-1', runtimeName: 'rt-1' }, 'tok', none as never)).rejects.toThrow(/no agent/);
    await expect(runtimeAgents({ ingress: '', runtimeName: 'rt-1' }, 'tok', none as never)).rejects.toThrow(/no address/);
  });
});

describe('the safe Markdown subset (M-032)', () => {
  it('draws blocks and inline marks, and keeps raw HTML as words', () => {
    expect(blocksOf('# Title\n\nSome **bold** and `code`.\n\n- one\n- two\n\n```\n<script>x</script>\n```\n<img src=x onerror=alert(1)>')).toEqual([
      { kind: 'heading', level: 1, spans: [{ kind: 'text', text: 'Title' }] },
      { kind: 'paragraph', spans: [{ kind: 'text', text: 'Some ' }, { kind: 'strong', text: 'bold' }, { kind: 'text', text: ' and ' }, { kind: 'code', text: 'code' }, { kind: 'text', text: '.' }] },
      { kind: 'list', ordered: false, items: [[{ kind: 'text', text: 'one' }], [{ kind: 'text', text: 'two' }]] },
      { kind: 'code', text: '<script>x</script>' },
      { kind: 'paragraph', spans: [{ kind: 'text', text: '<img src=x onerror=alert(1)>' }] }
    ]);
  });

  it('keeps a link only for HTTPS or mail; anything else stays words', () => {
    expect(spansOf('[docs](https://datalayer.ai/docs)')).toEqual([{ kind: 'link', text: 'docs', url: 'https://datalayer.ai/docs' }]);
    expect(spansOf('[x](javascript:alert(1))')).toEqual([{ kind: 'text', text: '[x](javascript:alert(1))' }]);
    expect(linkAllowed('http://example.com')).toBe(false);
    expect(linkAllowed('mailto:ada@example.com')).toBe(true);
    expect(linkAllowed('datalayer://approvals/1')).toBe(false);
  });
});

/** A session's turn: framed, its words streamed. */
const turn = (...middle: AgUiEvent[]): AgUiEvent[] => [{ type: 'RUN_STARTED' }, ...middle, { type: 'RUN_FINISHED' }];
const words = (id: string, text: string): AgUiEvent[] => [
  { type: 'TEXT_MESSAGE_START', messageId: id, role: 'assistant' },
  { type: 'TEXT_MESSAGE_CONTENT', messageId: id, delta: text },
  { type: 'TEXT_MESSAGE_END', messageId: id }
];

type Played = AgUiEvent[] | ((options: StreamOptions) => Promise<void>);

/** A Session API that plays the turns it is given, in order, and records each call. */
function fakeSessions(plays: Played[], described: Record<string, unknown> | 'gone' = { uid: 's1', state: 'open', asking: null }) {
  const calls: unknown[][] = [];
  const play = async (options: StreamOptions) => {
    const next = plays.shift();
    if (!next) throw new Error('nothing more to play');
    if (typeof next === 'function') return next(options);
    for (const event of next) options.onEvent(event);
  };
  const sessions: AppSessionsClient = {
    start: async (start, options) => { calls.push(['start', start]); return play(options); },
    message: async (uid, text, options) => { calls.push(['message', uid, text]); return play(options); },
    changeSettings: async (uid, values, options) => { calls.push(['settings', uid, values]); return play(options); },
    resume: async (uid, agent, options) => { calls.push(['resume', uid, agent]); return play(options); },
    stop: async uid => { calls.push(['stop', uid]); return { uid, state: 'stopped' }; },
    end: async uid => { calls.push(['end', uid]); return { uid, state: 'ended' }; },
    describe: async uid => {
      calls.push(['describe', uid]);
      if (described === 'gone') throw new RuntimeRefusal(404, 'Session not held.');
      return described;
    },
    messages: async uid => {
      calls.push(['messages', uid]);
      return [{ id: 'u0', role: 'user', content: 'Earlier', createdAt: new Date() }, { id: 'a0', role: 'assistant', content: 'Answered earlier', createdAt: new Date() }];
    }
  };
  return { sessions, calls };
}

let ids = 0;
const newId = () => `id-${(ids += 1)}`;
const appTarget = (sessions: AppSessionsClient) => ({ kind: 'app' as const, sessions, agent: 'desk-agent', deploymentUid: 'd1', appUid: 'a1', version: 3 });
const texts = (controller: ConversationController) =>
  controller.getView().conversation.items.map(item => ('text' in item ? `${item.kind}:${item.text}` : item.kind === 'end' ? `end:${item.end}` : item.kind));

describe('prompt, stream, stop and resume (M-033)', () => {
  beforeEach(() => { ids = 0; });

  it('starts a new conversation with the first message on the deployment kept runtime', async () => {
    const { sessions, calls } = fakeSessions([turn({ type: 'CUSTOM', name: 'loop.session', value: { uid: 'id-2', state: 'open' } }, ...words('a1', 'Hello Ada'))]);
    const controller = new ConversationController(appTarget(sessions), null, newId);
    expect(await controller.send('  Hi  ')).toBe(true);
    expect(calls).toEqual([['start', { agent: 'desk-agent', deploymentUid: 'd1', appUid: 'a1', version: 3, opener: 'Hi', session: 'id-2' }]]);
    expect(texts(controller)).toEqual(['message:Hi', 'message:Hello Ada']);
    expect(controller.getView().uid).toBe('id-2');
    expect(controller.running).toBe(false);
  });

  it('refuses a second message while a turn streams, and sends once', async () => {
    let release: () => void = () => {};
    const { sessions, calls } = fakeSessions([
      options => new Promise<void>(resolve => {
        options.onEvent({ type: 'RUN_STARTED' });
        release = () => { options.onEvent({ type: 'RUN_FINISHED' }); resolve(); };
      })
    ]);
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    const first = controller.send('One');
    expect(controller.running).toBe(true);
    expect(await controller.send('Two')).toBe(false);
    expect(texts(controller)).toContain(`error:${ONE_TURN_AT_A_TIME}`);
    release();
    await first;
    expect(calls.filter(call => call[0] === 'message')).toEqual([['message', 's1', 'One']]);
  });

  it('stops the turn: the stream is cancelled here and on the runtime, and the conversation stays open', async () => {
    let aborted = false;
    const { sessions, calls } = fakeSessions([
      options => new Promise<void>((_, reject) => {
        options.onEvent({ type: 'RUN_STARTED' });
        options.onEvent({ type: 'TEXT_MESSAGE_START', messageId: 'a', role: 'assistant' });
        options.signal?.addEventListener('abort', () => {
          aborted = true;
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
      turn(...words('b', 'Next answer'))
    ]);
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    const sending = controller.send('Long job');
    await controller.stop();
    await sending;
    expect(aborted).toBe(true);
    expect(calls).toContainEqual(['stop', 's1']);
    expect(controller.running).toBe(false);
    expect(texts(controller).slice(-1)).toEqual(['end:stopped']);
    // Still open: the next message goes on in the same session.
    expect(await controller.send('Again')).toBe(true);
    expect(texts(controller).slice(-1)).toEqual(['message:Next answer']);
  });

  it('opens a held conversation by reading it; resumes only a stopped one or one no longer held', async () => {
    const open = fakeSessions([], { uid: 's1', state: 'open', asking: null });
    const held = new ConversationController(appTarget(open.sessions), 's1', newId);
    await held.open();
    expect(open.calls.map(call => call[0])).toEqual(['describe', 'messages']);
    expect(texts(held)).toEqual(['message:Earlier', 'message:Answered earlier']);

    const stopped = fakeSessions([turn({ type: 'MESSAGES_SNAPSHOT', messages: [{ id: 'u', role: 'user', content: 'Before' }] })], { uid: 's1', state: 'stopped' });
    const reopened = new ConversationController(appTarget(stopped.sessions), 's1', newId);
    await reopened.open();
    expect(stopped.calls).toEqual([['describe', 's1'], ['resume', 's1', 'desk-agent']]);
    expect(texts(reopened)).toEqual(['message:Before']);

    const gone = fakeSessions([turn({ type: 'MESSAGES_SNAPSHOT', messages: [{ id: 'u', role: 'user', content: 'From the record' }] })], 'gone');
    const fromRecord = new ConversationController(appTarget(gone.sessions), 's1', newId);
    await fromRecord.open();
    expect(gone.calls.map(call => call[0])).toEqual(['describe', 'resume']);
    expect(texts(fromRecord)).toEqual(['message:From the record']);
  });

  it('says a wordless turn by how it ended, and a refusal in the runtime sentence', async () => {
    const { sessions } = fakeSessions([
      turn(),
      async () => { throw new RuntimeRefusal(409, 'Desk is waiting for an answer: Which plan?'); }
    ]);
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    await controller.send('Do it');
    expect(texts(controller).slice(-1)).toEqual(['end:answered']);
    await controller.send('Again');
    expect(texts(controller).slice(-1)).toEqual(['error:Desk is waiting for an answer: Which plan?']);
  });

  it('talks to a standalone agent with the conversation so far, and terminates its run on Stop', async () => {
    const calls: unknown[][] = [];
    const runs: AgentRunClient = {
      run: async (thread, run, messages, options) => {
        calls.push(['run', thread, messages.map(message => `${message.role}:${message.content}`)]);
        if (messages.length > 4) {
          // The third run streams until it is stopped.
          options.onEvent({ type: 'RUN_STARTED' });
          return new Promise<void>((_, reject) =>
            options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
          );
        }
        for (const event of turn(...words(`a${calls.length}`, `Answer ${calls.length}`))) options.onEvent(event);
      },
      terminate: async thread => { calls.push(['terminate', thread]); }
    };
    const controller = new ConversationController({ kind: 'agent', runs }, null, newId);
    await controller.send('First');
    await controller.send('Second');
    expect(calls[1]).toEqual(['run', 'id-2', ['user:First', 'assistant:Answer 1', 'user:Second']]);
    // Nothing runs: Stop sends nothing.
    expect(await controller.stop()).toBe(0);
    const third = controller.send('Third');
    await controller.stop();
    await third;
    expect(calls.slice(-1)).toEqual([['terminate', 'id-2']]);
    expect(texts(controller).slice(-1)).toEqual(['end:stopped']);
    // A raw agent has no session to end.
    await controller.end();
    expect(controller.getView().ended).toBe(false);
  });
});

describe('questions the application asks (M-034)', () => {
  beforeEach(() => { ids = 0; });
  const asked = (asking: Record<string, unknown>) =>
    [{ type: 'RUN_STARTED' }, ...words('q', String(asking.prompt)), { type: 'RUN_FINISHED', result: { asking } }] as AgUiEvent[];

  it('answers a choice and words with a message', async () => {
    const { sessions, calls } = fakeSessions([asked({ kind: 'choice', prompt: 'Which plan?', options: ['Free', 'Pro'] }), turn(...words('a', 'Pro it is'))]);
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    await controller.send('Sign me up');
    expect(controller.getView().conversation.asking).toMatchObject({ kind: 'choice', options: ['Free', 'Pro'] });
    await controller.send('Pro');
    expect(calls.slice(-1)).toEqual([['message', 's1', 'Pro']]);
    expect(controller.getView().conversation.asking).toBeNull();
  });

  it('answers a form with a settings change, and only a form', async () => {
    const { sessions, calls } = fakeSessions([asked({ kind: 'form', prompt: 'Your seats', schema: { properties: { seats: { type: 'integer' } } } }), turn()]);
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    await controller.send('Quote me');
    expect(await controller.answerForm({ seats: 4 })).toBe(true);
    expect(calls.slice(-1)).toEqual([['settings', 's1', { seats: 4 }]]);
    expect(await controller.answerForm({ seats: 5 })).toBe(false);
  });

  it('sends a file question to the web, and sends nothing', async () => {
    const { sessions, calls } = fakeSessions([asked({ kind: 'file', prompt: 'Which file?', accept: ['.csv'] })]);
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    await controller.send('Report');
    expect(await controller.send('here it is')).toBe(false);
    expect(texts(controller).slice(-1)).toEqual([`error:${FILE_ON_THE_WEB}`]);
    expect(calls.filter(call => call[0] === 'message')).toHaveLength(1);
  });
});

describe('across navigation and the background (M-035)', () => {
  beforeEach(() => { ids = 0; forgetConversations(); });

  it('reads a turn lost while away back from the server, and never sends it again', async () => {
    const { sessions, calls } = fakeSessions([
      async options => { options.onEvent({ type: 'RUN_STARTED' }); throw new Error(RUN_CUT_SHORT); }
    ], { uid: 's1', state: 'open', asking: null });
    const controller = new ConversationController(appTarget(sessions), 's1', newId);
    await controller.send('While I was away');
    expect(texts(controller).slice(-1)).toEqual([`error:${RUN_CUT_SHORT}`]);
    await controller.foreground();
    expect(calls.map(call => call[0])).toEqual(['message', 'describe', 'messages']);
    expect(texts(controller)).toEqual(['message:Earlier', 'message:Answered earlier']);
    // Once read back, coming back again reads nothing more.
    await controller.foreground();
    expect(calls).toHaveLength(3);
  });

  it('holds a conversation across navigation, bounded, and forgets them all at sign-out', () => {
    const { sessions } = fakeSessions([]);
    const make = () => new ConversationController(appTarget(sessions), null, newId);
    const first = conversationFor('app:d1:new:1', make);
    expect(conversationFor('app:d1:new:1', make)).toBe(first);
    holdAs('app:d1:s1', first);
    expect(conversationFor('app:d1:s1', make)).toBe(first);
    for (let i = 0; i < HELD_LIMIT + 4; i += 1) conversationFor(`app:d1:new:x${i}`, make);
    expect(heldCount()).toBeLessThanOrEqual(HELD_LIMIT);
    forgetConversations();
    expect(heldCount()).toBe(0);
    expect(conversationFor('app:d1:new:1', make)).not.toBe(first);
  });
});
