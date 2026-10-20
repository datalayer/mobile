/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Reporting a generated answer: what goes to support, the answer's words
 * only when the person includes them, and which rows offer Report.
 */

import type { ConversationItem } from '@datalayer/agent-runtimes/lib/portable';
import { fireEvent, render } from '@testing-library/react-native';
import type { Client, RequestOptions } from '../api/client';
import { REPORT_REASONS, REPORT_WORDS, reportAnswer, reportRequest, SUPPORT_REQUEST_PATH, type ReportContext } from '../api/report';
import { ReportLink, reportable } from '../features/conversations/ConversationView';
import { DEFAULT_PREFERENCE, ThemeProvider } from '../theme/ThemeProvider';

const APP: ReportContext = {
  kind: 'application',
  name: 'Mail assistant',
  appUid: '01APP',
  deploymentUid: 'dep-1',
  sessionUid: 'ses-1'
};
const AGENT: ReportContext = { kind: 'agent', name: 'Helper', runtimeName: 'rt-1', agent: 'helper' };
const ANSWER = { id: 'msg-7', text: 'A generated answer the person finds offensive.' };
const DEVICE = { platform: 'android', version: '1.0.0' };

describe('reporting a generated answer', () => {
  it("sends where the answer was given and why, without its words unless the person includes them", () => {
    const without = reportRequest(APP, ANSWER, 'offensive', false, DEVICE);
    expect(without.brand).toBe('datalayer');
    expect(without.subject).toContain('Offensive or harmful');
    expect(without.subject).toContain('Mail assistant');
    for (const line of ['Reason: Offensive or harmful', 'Application: Mail assistant (01APP)', 'Deployment: dep-1', 'Conversation: ses-1', 'Answer: msg-7', 'App: android 1.0.0']) {
      expect(without.message).toContain(line);
    }
    expect(without.message).not.toContain(ANSWER.text);
    expect(without.message).toContain('not sent');

    const withWords = reportRequest(APP, ANSWER, 'wrong', true, DEVICE);
    expect(withWords.message).toContain('Reason: Wrong or misleading');
    expect(withWords.message).toContain(ANSWER.text);
  });

  it("names a standalone agent by its agent and runtime", () => {
    const request = reportRequest(AGENT, ANSWER, 'offensive', false, DEVICE);
    expect(request.message).toContain('Agent: Helper (helper)');
    expect(request.message).toContain('Runtime: rt-1');
    expect(request.message).not.toContain('Deployment:');
  });

  it('offers at most two reasons, so the alert holds them with Cancel on Android', () => {
    expect(REPORT_REASONS.length).toBeLessThanOrEqual(2);
  });

  it("posts the request to the support service as the person", async () => {
    const asked: { path: string; options?: RequestOptions }[] = [];
    const client = (async (path: string, options?: RequestOptions) => {
      asked.push({ path, options });
      return { success: true };
    }) as Client;
    await reportAnswer(client, APP, ANSWER, 'offensive', false, DEVICE);
    expect(asked).toHaveLength(1);
    expect(asked[0]?.path).toBe(SUPPORT_REQUEST_PATH);
    expect(asked[0]?.options?.method).toBe('POST');
    expect(asked[0]?.options?.body).toEqual(reportRequest(APP, ANSWER, 'offensive', false, DEVICE));
  });

  it("a refused report is the caller's error, never a silent success", async () => {
    const client = (async () => {
      throw new Error('Support could not be reached.');
    }) as Client;
    await expect(reportAnswer(client, APP, ANSWER, 'offensive', false, DEVICE)).rejects.toThrow('Support could not be reached.');
  });

  it('offers Report only under a complete answer of the application or agent', () => {
    const answer = { kind: 'message', id: 'a', role: 'assistant', text: 'Done.', streaming: false } as ConversationItem;
    expect(reportable(answer)).toBe(true);
    expect(reportable({ ...answer, streaming: true } as ConversationItem)).toBe(false);
    expect(reportable({ ...answer, role: 'user' } as ConversationItem)).toBe(false);
    expect(reportable({ ...answer, text: '  ' } as ConversationItem)).toBe(false);
    expect(reportable({ kind: 'error', id: 'e', text: 'Failed.' } as ConversationItem)).toBe(false);
  });

  it('draws the Report link with its label and calls back when pressed', async () => {
    const store = { read: async () => DEFAULT_PREFERENCE, write: async () => undefined };
    const pressed = jest.fn();
    const drawn = await render(
      <ThemeProvider store={store}>
        <ReportLink onPress={pressed} />
      </ThemeProvider>
    );
    fireEvent.press(drawn.getByLabelText(REPORT_WORDS.linkLabel));
    expect(pressed).toHaveBeenCalledTimes(1);
  });
});
