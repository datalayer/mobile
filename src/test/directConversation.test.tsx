/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A Direct Conversation on the phone: opened from a company's
 * replies, the person's words go only to the company with a one-use ticket,
 * lines said apart by who wrote them, replies read back from the cursor
 * (never by sending again), and once the company closes it nothing more is
 * sent there.
 */

import { directAuthor, protocolDisplayOf, type DirectAnswer, type DirectClient } from '@datalayer/agent-runtimes/lib/portable';
import { fireEvent, render } from '@testing-library/react-native';
import { DirectController } from '../features/conversations/direct';
import { ProtocolDisplayCard } from '../features/conversations/ProtocolDisplayCard';
import { DEFAULT_PREFERENCE, ThemeProvider } from '../theme/ThemeProvider';

const answer = (over: Partial<DirectAnswer> = {}): DirectAnswer => ({
  directConversation: 'dc_1', replies: [], status: 'working', responder: 'human', cursor: 'c1', display: null, ...over
});

function fakeClient() {
  const calls: string[] = [];
  const client = {
    ticket: jest.fn(),
    send: jest.fn(async (_target, text: string) => {
      calls.push(`send:${text}`);
      return answer({ replies: [{ from: 'human', text: 'Sam here.' }] });
    }),
    read: jest.fn(async (_target, cursor: string) => {
      calls.push(`read:${cursor}`);
      return answer({ replies: [{ from: 'agent', text: 'Closing now.' }], status: 'closed', cursor: 'c2' });
    })
  } as unknown as DirectClient;
  return { client, calls };
}

describe('a Direct Conversation on the phone', () => {
  it('sends only the person’s words to the company, reads replies from the cursor, and stops once closed', async () => {
    const { client, calls } = fakeClient();
    const direct = new DirectController(client, 'app-1');
    await direct.read(); // nothing to read before the first words
    direct.open('shop.example', 'conv_1');
    expect(direct.getView().open?.target).toEqual({ appUid: 'app-1', company: 'shop.example', conversationId: 'conv_1' });
    expect(await direct.send('Where is my parcel?')).toBe(true);
    expect(direct.getView().open?.lines.map(line => `${directAuthor(line)}: ${line.text}`)).toEqual([
      'You: Where is my parcel?', 'One of its people: Sam here.'
    ]);
    expect(direct.getView().open?.target.conversationId).toBe('dc_1');
    await direct.read();
    expect(calls).toEqual(['send:Where is my parcel?', 'read:c1']);
    expect(direct.getView().open?.closed).toBe(true);
    // Closed: nothing more is sent there.
    expect(await direct.send('Hello?')).toBe(false);
    expect(direct.getView().problem).toBe('shop.example closed this conversation: write through the application again.');
    expect(calls).toHaveLength(2);
    direct.close();
    expect(direct.getView().open).toBeNull();
  });

  it('keeps a refusal in the gateway’s sentence, and sends one message at a time', async () => {
    let release: (value: DirectAnswer) => void = () => undefined;
    const client = {
      send: jest.fn(() => new Promise<DirectAnswer>(resolve => (release = resolve))),
      read: jest.fn()
    } as unknown as DirectClient;
    const direct = new DirectController(client, 'app-1');
    direct.open('shop.example', 'conv_1');
    const first = direct.send('One');
    expect(await direct.send('Two')).toBe(false);
    release(answer());
    expect(await first).toBe(true);
    (client.send as jest.Mock).mockRejectedValueOnce(new Error('The ticket was already used.'));
    expect(await direct.send('Three')).toBe(false);
    expect(direct.getView().problem).toBe('The ticket was already used.');
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it('opens from what a company answered', async () => {
    const replies = protocolDisplayOf({
      type: 'application/vnd.datalayer.pap.replies+json', version: 2, id: 'r', text: 't',
      data: { company: 'shop.example', conversation: 'conv_1', replies: [{ sender: 'agent', text: 'Hi.' }], status: 'idle' }
    })!;
    const onOpenDirect = jest.fn();
    const store = { read: async () => DEFAULT_PREFERENCE, write: async () => undefined };
    const drawn = await render(
      <ThemeProvider store={store}>
        <ProtocolDisplayCard display={replies} onOpenSignIn={jest.fn()} onOpenApproval={jest.fn()} onSignedIn={jest.fn()} onOpenDirect={onOpenDirect} />
      </ThemeProvider>
    );
    expect(drawn.getByTestId('display-open-direct').props.label).toBe('Write to shop.example yourself');
    await fireEvent.press(drawn.getByTestId('display-open-direct'));
    expect(onOpenDirect).toHaveBeenCalledWith('shop.example', 'conv_1');
  });
});
