/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Protocol displays drawn natively (MOBILE M-037), from Agent Runtimes'
 * strict reading of the stream: sign-ins, an operation (a purchase too) to
 * confirm in Approvals, outcomes, replies with who wrote them, a handoff,
 * and an unknown display shown by its text only; a coding agent's diff and
 * terminal (SHIELD SH-16) from Agent Runtimes' shared `shieldDisplayFixtures`.
 */

import { emptyConversation, protocolDisplayOf, reduceConversation, shieldDisplayFixtures, type AgUiEvent, type ProtocolDisplay } from '@datalayer/agent-runtimes/lib/portable';
import { fireEvent, render } from '@testing-library/react-native';
import { PHONE_LINES, ProtocolDisplayCard, moreLines } from '../features/conversations/ProtocolDisplayCard';
import { DEFAULT_PREFERENCE, ThemeProvider } from '../theme/ThemeProvider';

const store = { read: async () => DEFAULT_PREFERENCE, write: async () => undefined };
const wire = (type: string, data: Record<string, unknown>, id = 'd-1') =>
  ({ type: `application/vnd.datalayer.pap.${type}+json`, version: 1, id, text: 'A model-safe sentence.', data });

function draw(display: ProtocolDisplay) {
  const actions = { onOpenSignIn: jest.fn(), onOpenApproval: jest.fn(), onSignedIn: jest.fn() };
  return render(<ThemeProvider store={store}><ProtocolDisplayCard display={display} {...actions} /></ThemeProvider>).then(drawn => ({ drawn, actions }));
}

describe('protocol displays on the phone (M-037)', () => {
  it('draws a device sign-in with its code, opens its page and says the person signed in', async () => {
    const display = protocolDisplayOf(wire('sign-in', { mode: 'device', open: 'https://shop.example/device', code: 'AB-12', needs: ['orders:read'] }))!;
    const { drawn, actions } = await draw(display);
    expect(drawn.getByText('Your code: AB-12')).toBeTruthy();
    expect(drawn.getByText('It needs: orders:read.')).toBeTruthy();
    expect(drawn.getByTestId('display-open-sign-in').props.label).toBe('Open shop.example');
    await fireEvent.press(drawn.getByTestId('display-open-sign-in'));
    expect(actions.onOpenSignIn).toHaveBeenCalledWith('https://shop.example/device');
    await fireEvent.press(drawn.getByTestId('display-signed-in'));
    expect(actions.onSignedIn).toHaveBeenCalledWith('I have signed in at shop.example. Please check again.');
  });

  it('draws an operation to confirm verbatim and sends the decision to Approvals', async () => {
    const display = protocolDisplayOf(wire('confirm', {
      company: 'shop.example', summary: 'Buy 2 tents for 300 EUR', terms: { total: { value: 30000, currency: 'EUR' } },
      operation_ref: 'op-1', revision: 2, does: 'buy', was: { revision: 1, terms: {} }, only_the_person: true
    }, 'appr-1-confirm'))!;
    const { drawn, actions } = await draw(display);
    expect(drawn.getByText('Buy 2 tents for 300 EUR')).toBeTruthy();
    expect(drawn.getByText('total: {"value":30000,"currency":"EUR"}')).toBeTruthy();
    expect(drawn.getByText('Version 2, changed since version 1 · It moves money · Only you can decide it')).toBeTruthy();
    await fireEvent.press(drawn.getByTestId('display-review'));
    expect(actions.onOpenApproval).toHaveBeenCalledWith('appr-1');
  });

  it('labels each reply by who wrote it, says who answers now, and shows an unknown display by its text', async () => {
    const replies = protocolDisplayOf(wire('replies', {
      company: 'shop.example', conversation: 'c1', status: 'queued', responder: 'human',
      replies: [{ sender: 'agent', text: 'Let me find someone.' }, { sender: 'human', text: 'Hi, I am Sam.' }]
    }))!;
    const first = await draw(replies);
    expect(first.drawn.getByLabelText('shop.example, one of its people: Hi, I am Sam.')).toBeTruthy();
    expect(first.drawn.getByText('Waiting for one of the company’s people.')).toBeTruthy();
    const odd = protocolDisplayOf({ type: 'application/vnd.example.chart+json', version: 1, id: 'x', text: 'A chart of sales.', data: { html: '<b>x</b>' } })!;
    const second = await draw(odd);
    expect(second.drawn.getByText('A chart of sales.')).toBeTruthy();
    expect(second.drawn.queryByText(/<b>/)).toBeNull();
  });

  it('reads the display from the stream onto its tool row', () => {
    const events: AgUiEvent[] = [
      { type: 'TOOL_CALL_START', toolCallId: 't1', toolCallName: 'pap_handoff' },
      { type: 'TOOL_CALL_RESULT', toolCallId: 't1', content: JSON.stringify({ status: 'queued', responder: 'human' }) }
    ];
    const [tool] = events.reduce(reduceConversation, emptyConversation()).items;
    expect(tool).toMatchObject({ kind: 'tool', display: { kind: 'handoff', handed: true, responder: 'human' } });
  });

  it('draws a coding agent’s diff line by line, each line said as kept, added or removed (SH-16)', async () => {
    const display = protocolDisplayOf(shieldDisplayFixtures().diff as never)!;
    expect(display.kind).toBe('diff');
    const { drawn } = await draw(display);
    expect(drawn.getByText('Changed hello.py (+2 −1 lines)')).toBeTruthy();
    expect(drawn.getByText('-print("hi")')).toBeTruthy();
    expect(drawn.getByText('+def hello():')).toBeTruthy();
    expect(drawn.getByLabelText('Added:     print("hi, shield")')).toBeTruthy();
    expect(drawn.getByLabelText('Removed: print("hi")')).toBeTruthy();
  });

  it('cuts a long diff on the phone and says how many lines the web shows besides', async () => {
    const fixture = shieldDisplayFixtures().diff as { data: Record<string, unknown> } & Record<string, unknown>;
    const long = Array.from({ length: PHONE_LINES + 5 }, (_, n) => `line ${n}`).join('\n') + '\n';
    const display = protocolDisplayOf({ ...fixture, data: { ...fixture.data, old_text: null, new_text: long } } as never)!;
    const { drawn } = await draw(display);
    expect(drawn.getByText('+line 0')).toBeTruthy();
    expect(drawn.queryByText(`+line ${PHONE_LINES}`)).toBeNull();
    expect(drawn.getByText(moreLines(5))).toBeTruthy();
  });

  it('draws a terminal: its command, its output and how it ended (SH-16)', async () => {
    const display = protocolDisplayOf(shieldDisplayFixtures().terminal as never)!;
    expect(display.kind).toBe('terminal');
    const { drawn } = await draw(display);
    expect(drawn.getByText('Ran `pytest -q`: exit 0')).toBeTruthy();
    expect(drawn.getByText('$ pytest -q')).toBeTruthy();
    expect(drawn.getByTestId('display-terminal-output').props.children).toBe('3 passed in 0.12s');
    expect(drawn.getByText('It finished.')).toBeTruthy();
  });

  it('draws a terminal still running, and a failed one in its exit code', async () => {
    const fixture = shieldDisplayFixtures().terminal as { data: Record<string, unknown> } & Record<string, unknown>;
    const running = protocolDisplayOf({ ...fixture, data: { ...fixture.data, output: 'collecting…\n', exit_code: null, released: false } } as never)!;
    const first = await draw(running);
    expect(first.drawn.getByText('Ran `pytest -q`: running')).toBeTruthy();
    expect(first.drawn.getByText('Still running: its output is shown as it comes.')).toBeTruthy();
    const failed = protocolDisplayOf({ ...fixture, data: { ...fixture.data, output: '1 failed\n', exit_code: 1 } } as never)!;
    const second = await draw(failed);
    expect(second.drawn.getByText('It failed, exit 1.')).toBeTruthy();
  });
});
