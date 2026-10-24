/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * The Expo/Hermes proof: every shared portable entry the
 * phone imports, evaluated and called in a bundle Metro made, compiled by the
 * hermesc React Native ships and run by the Hermes VM alone — no React Native
 * runtime, no DOM, no Jupyter, no Lumino, no shim. `index.ts` is the bundle's
 * entry; the Jest spec runs the same checks under Node.
 */

import {
  activityFixture,
  activityOf,
  agentRuntimesOf,
  agentSummaryOfRuntime,
  approvalCardOf,
  deploymentEventLine,
  deploymentEventOf,
  isCreatingAgent,
  resetCountsOf,
  resetLines,
  stateChangeBody,
  stoppedWorkLine,
  stoppedWorkOf,
  conversationFixture,
  displayLine,
  emptyConversation,
  otlpMetricsOf,
  presenceOfConversation,
  PRESENCE_LINES,
  protocolDisplayOf,
  reduceConversation,
  RunMeter,
  sessionStateSaid,
  shieldDisplayFixtures,
  type AgUiEvent
} from '@datalayer/agent-runtimes/lib/portable';
import { kindOfStatus, personOf, Problem, problemOf, retries } from '@datalayer/core/lib/portable';
import { EYES_VIEW, eyesGeometry, exportPortableTheme } from '@datalayer/primer-addons/lib/theme/portable';

/** One check: its name and whether it held. */
export type ProofLine = { name: string; held: boolean; detail: string };

function check(name: string, run: () => string): ProofLine {
  try {
    return { name, held: true, detail: run() };
  } catch (error) {
    return { name, held: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function expect(condition: boolean, what: string): void {
  if (!condition) {
    throw new Error(what);
  }
}

/** A turn as the runtime streams it: a word, a tool call with its result, the answer, the end. */
const TURN: AgUiEvent[] = [
  { type: 'RUN_STARTED', threadId: 't', runId: 'r' },
  { type: 'TEXT_MESSAGE_START', messageId: 'a-1', role: 'assistant' },
  { type: 'TEXT_MESSAGE_CONTENT', messageId: 'a-1', delta: 'Looking ' },
  { type: 'TEXT_MESSAGE_CONTENT', messageId: 'a-1', delta: 'it up.' },
  { type: 'TEXT_MESSAGE_END', messageId: 'a-1' },
  { type: 'TOOL_CALL_START', toolCallId: 'c-1', toolCallName: 'lookup_order' },
  { type: 'TOOL_CALL_ARGS', toolCallId: 'c-1', delta: '{"order":7}' },
  { type: 'TOOL_CALL_END', toolCallId: 'c-1' },
  { type: 'TOOL_CALL_RESULT', toolCallId: 'c-1', messageId: 'r-1', content: 'Shipped on Monday.' },
  { type: 'RUN_FINISHED', threadId: 't', runId: 'r' }
];

/** Every check of the proof, in order; none throws. */
export function proofLines(): ProofLine[] {
  return [
    check('core: personOf', () => {
      const person = personOf({ uid: 'u-1', handle_s: 'ada', first_name_t: 'Ada', last_name_t: 'Lovelace' });
      if (person?.displayName !== 'Ada Lovelace') {
        throw new Error(`personOf said ${JSON.stringify(person)}`);
      }
      expect(personOf({ uid: 'u-1' }) === undefined, 'personOf accepted a person without a handle');
      return person.displayName;
    }),
    check('core: problem states', () => {
      const problem = new Problem(kindOfStatus(429), 'GET /x → 429');
      expect(problem instanceof Error && problemOf(problem) === problem, 'a Problem is not an Error under Hermes');
      expect(retries(problem) && !retries(new Problem('forbidden', '')), 'retries says the wrong thing');
      return problem.message;
    }),
    check('primer-addons: theme and eyes', () => {
      const theme = exportPortableTheme('loop');
      const tokens = Object.keys(theme.modes.light).length;
      expect(tokens > 0 && Object.keys(theme.modes.dark).length > 0, 'the portable theme is empty');
      const eyes = eyesGeometry('aside');
      expect(EYES_VIEW.width === 52 && typeof eyes === 'object', 'the eyes have no geometry');
      return `${tokens} light tokens, eyes ${EYES_VIEW.width}×${EYES_VIEW.height}`;
    }),
    check('agent-runtimes: reduceConversation on a streamed turn', () => {
      const state = TURN.reduce(reduceConversation, emptyConversation());
      expect(!state.running, 'the turn is still running after RUN_FINISHED');
      const message = state.items.find(item => item.kind === 'message');
      expect(message?.kind === 'message' && message.text === 'Looking it up.', `the answer reads ${JSON.stringify(message)}`);
      const tool = state.items.find(item => item.kind === 'tool');
      expect(tool?.kind === 'tool' && tool.name === 'lookup_order' && tool.status === 'complete', `the tool row is ${JSON.stringify(tool)}`);
      return `${state.items.length} rows`;
    }),
    check('agent-runtimes: presence of the shared fixture', () => {
      const fixture = conversationFixture();
      const presence = presenceOfConversation(fixture);
      expect(presence === 'waiting', `the fixture's presence is ${presence}`);
      expect(presenceOfConversation(fixture, true) === 'paused', 'a paused deployment is not said paused');
      return PRESENCE_LINES[presence];
    }),
    check('agent-runtimes: approvalCard', () => {
      const mail = approvalCardOf({
        tool_name: 'send_email',
        tool_args: { to: 'ada@example.com', subject: 'Order 7', body: 'It shipped.' }
      });
      expect(mail.action === 'Send email' && mail.message?.body === 'It shipped.', `the mail card is ${JSON.stringify(mail)}`);
      const raw = approvalCardOf({ tool_name: 'delete_file', tool_args: { path: '/tmp/a' } });
      expect(raw.message === null && raw.raw.includes('/tmp/a'), `the raw card is ${JSON.stringify(raw)}`);
      return mail.summary;
    }),
    check('agent-runtimes: runMeasures', () => {
      let now = 1_000;
      const meter = new RunMeter('application', () => now);
      for (const event of TURN) {
        now += 10;
        meter.event(event);
      }
      const measure = meter.read();
      expect(measure.firstTokenMs === 30 && measure.answerMs === 100, `the turn measured ${JSON.stringify(measure)}`);
      const body = otlpMetricsOf([measure], 0, { 'service.name': 'proof' }, 1_700_000_000_000);
      expect(JSON.stringify(body).includes('1700000000000000000'), 'the OTLP body lost its nanosecond time (BigInt)');
      return `first token ${measure.firstTokenMs} ms`;
    }),
    check('agent-runtimes: activity on the shared fixture', () => {
      const activity = activityOf(activityFixture());
      const [done] = activity.completed;
      expect(activity.inProgress.length === 1 && activity.nextOffset === 20, `the activity reads ${JSON.stringify(activity)}`);
      if (!done) {
        throw new Error('the fixture has no completed session');
      }
      return `completed: ${done.uid} ${sessionStateSaid(done)}`;
    }),
    check('agent-runtimes: lifecycle', () => {
      expect(stateChangeBody(3, 'paused').version === 3, 'the pause body lost its version');
      const paused = stoppedWorkLine(stoppedWorkOf({ stopped: [{ what: 'a session', runtime: 'r1' }] }));
      const reset = resetLines(resetCountsOf({ conversations: 2, schedules: 1 })).goes;
      const event = deploymentEventLine(deploymentEventOf({ kind: 'resumed', actor_handle: 'ada' }));
      expect(event === 'Resumed by ada', `the event reads ${event}`);
      return `${paused} | ${reset} | ${event}`;
    }),
    check('agent-runtimes: runtimes', () => {
      const [runtime] = agentRuntimesOf({ runtimes: [{ runtime_name: 'r1', type: 'agent', state: 'starting' }, { runtime_name: 'n1', type: 'notebook' }] });
      if (!runtime) {
        throw new Error('no agent runtime was read');
      }
      expect(isCreatingAgent(agentSummaryOfRuntime(runtime)), 'a starting runtime is not being created');
      return runtime.runtimeName;
    }),
    check('agent-runtimes: displays', () => {
      const { diff, terminal } = shieldDisplayFixtures();
      const lines = [diff, terminal].map(wire => {
        const display = protocolDisplayOf(wire);
        if (!display) {
          throw new Error(`${String(wire.type)} was not read`);
        }
        return displayLine(display);
      });
      return lines.join(' | ');
    })
  ];
}

/** The proof's report, one line per check, and whether every check held. */
export function runProof(say: (line: string) => void): boolean {
  const lines = proofLines();
  for (const line of lines) {
    say(`${line.held ? 'held' : 'FAILED'} · ${line.name} · ${line.detail}`);
  }
  return lines.every(line => line.held);
}
