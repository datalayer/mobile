/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A Direct Conversation on the phone (MOBILE M-038, PAP_DATALAYER P-08): a
 * linked sub-conversation under the application's, opened from what a
 * company answered. While it is open the parent's composer is locked — the
 * person's words go only to the company, each with IAM's one-use ticket,
 * never to the application or its model — and the company's replies are
 * read back from the cursor (on opening the app again too), never by sending
 * again. Closed by the company, the parent is talked to again.
 *
 * Agent Runtimes' `portable/direct` is the client and the state; this holds
 * it for a screen, in memory only.
 */

import {
  DIRECT_WORDS,
  directClient,
  openDirect,
  withDirectAnswer,
  type DirectClient,
  type DirectOpen
} from '@datalayer/agent-runtimes/lib/portable';

export type DirectView = { open: DirectOpen | null; busy: boolean; problem: string };

export class DirectController {
  private view: DirectView = { open: null, busy: false, problem: '' };
  private listeners = new Set<() => void>();

  constructor(
    private readonly client: DirectClient,
    private readonly appUid: string
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getView = (): DirectView => this.view;

  private set(next: Partial<DirectView>): void {
    this.view = { ...this.view, ...next };
    this.listeners.forEach(listener => listener());
  }

  /** Opens it under the conversation a company answered in: the parent's composer is locked from now. */
  open(company: string, conversationId: string): void {
    this.set({ open: openDirect({ appUid: this.appUid, company, conversationId }), problem: '' });
  }

  /** Back to the application: the parent's composer talks to it again. */
  close(): void {
    this.set({ open: null, problem: '', busy: false });
  }

  /** The person's own words, sent once; refused in the gateway's sentence, the words kept by the caller. */
  async send(text: string): Promise<boolean> {
    const open = this.view.open;
    if (!open || open.closed || this.view.busy) {
      this.set({ problem: open?.closed ? DIRECT_WORDS.closed(open.target.company) : this.view.problem });
      return false;
    }
    this.set({ busy: true, problem: '' });
    try {
      const answer = await this.client.send(open.target, text);
      if (this.view.open === open) {
        this.set({ open: withDirectAnswer(open, answer, text) });
      }
      return true;
    } catch (error) {
      this.set({ problem: error instanceof Error ? error.message : String(error) });
      return false;
    } finally {
      this.set({ busy: false });
    }
  }

  /** What the company wrote since the last read: on opening the app again, never by sending again. */
  async read(): Promise<void> {
    const open = this.view.open;
    // Nothing to read before the first words: the Direct Conversation opens with them.
    if (!open || open.closed || open.lines.length === 0) {
      return;
    }
    try {
      const answer = await this.client.read(open.target, open.cursor);
      if (this.view.open === open) {
        this.set({ open: withDirectAnswer(open, answer) });
      }
    } catch (error) {
      this.set({ problem: error instanceof Error ? error.message : String(error) });
    }
  }
}

/** A controller for one conversation of an application: IAM under the run address, the gateway at its own. */
export const directControllerFor = (
  appUid: string,
  iamUrl: string,
  gatewayUrl: string,
  getAccessToken: () => string | undefined,
  fetcher: typeof fetch
): DirectController => new DirectController(directClient({ iamUrl, gatewayUrl, getAccessToken, fetch: fetcher }), appUid);
