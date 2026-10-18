/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The native renderers of Agent Runtimes' conversation contract (MOBILE
 * M-030, M-032): each row of the shared fixture — the one the web's renderers
 * are tested against — drawn with the contract's words and labels.
 */

import {
  conversationFixture, messageLabel, presenceLine, presenceOfConversation, stepLine, toolLabel, type ConversationItem
} from '@datalayer/agent-runtimes/lib/portable';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import {
  ErrorRow, MessageRow, PresenceLine, StepRow, ToolRow, TurnEndRow
} from '../features/conversations/ConversationView';
import { DEFAULT_PREFERENCE, ThemeProvider } from '../theme/ThemeProvider';

const store = { read: async () => DEFAULT_PREFERENCE, write: async () => undefined };
const draw = (element: ReactElement) => render(<ThemeProvider store={store}>{element}</ThemeProvider>);

const fixture = conversationFixture();
const of = <K extends ConversationItem['kind']>(kind: K) =>
  fixture.items.filter((item): item is Extract<ConversationItem, { kind: K }> => item.kind === kind);
/** The n-th row of a kind in the fixture, which the fixture promises to hold. */
const nth = <K extends ConversationItem['kind']>(kind: K, index = 0): Extract<ConversationItem, { kind: K }> => {
  const item = of(kind)[index];
  if (!item) throw new Error(`The fixture holds no ${kind} row ${index}.`);
  return item;
};

describe('native renderers behind the shared conversation contract', () => {
  it('draws messages with the contract labels, the answer through the safe Markdown subset', async () => {
    for (const item of of('message')) {
      const drawn = await draw(<MessageRow item={item} />);
      expect(drawn.getByLabelText(messageLabel(item))).toBeTruthy();
      expect(drawn.queryByText(/\*\*shipped\*\*/)).toBeNull();
      await drawn.unmount();
    }
  });

  it('draws a tool call collapsed until it is opened, by its contract label', async () => {
    const done = nth('tool', 0);
    const failed = nth('tool', 1);
    const toggled = jest.fn();
    const drawn = await draw(<ToolRow item={done} expanded={false} onToggle={toggled} />);
    expect(drawn.getByLabelText(toolLabel(done))).toBeTruthy();
    expect(drawn.queryByText(done.result)).toBeNull();
    await fireEvent.press(drawn.getByLabelText(toolLabel(done)));
    expect(toggled).toHaveBeenCalledTimes(1);
    await drawn.rerender(<ThemeProvider store={store}><ToolRow item={done} expanded onToggle={toggled} /></ThemeProvider>);
    expect(drawn.getByText(done.result)).toBeTruthy();
    await drawn.rerender(<ThemeProvider store={store}><ToolRow item={failed} expanded onToggle={toggled} /></ThemeProvider>);
    expect(drawn.getByLabelText(toolLabel(failed))).toBeTruthy();
    expect(drawn.getByText(failed.error)).toBeTruthy();
  });

  it('draws steps, a wordless end, a failure and the presence line in the contract words', async () => {
    const step = await draw(<StepRow item={nth('step')} />);
    expect(step.getByText(stepLine(nth('step')))).toBeTruthy();
    const end = await draw(<TurnEndRow item={nth('end')} />);
    expect(end.getByText(nth('end').words)).toBeTruthy();
    expect(end.getByTestId(`turn-end-${nth('end').end}`)).toBeTruthy();
    const failure = await draw(<ErrorRow item={nth('error')} />);
    expect(failure.getByText(nth('error').text)).toBeTruthy();
    const state = presenceOfConversation(fixture);
    expect(state).toBe('waiting');
    const presence = await draw(<PresenceLine state={state} />);
    expect(presence.getByText(presenceLine({ state }))).toBeTruthy();
  });
});
