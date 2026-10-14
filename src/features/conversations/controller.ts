/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * One conversation on the phone (MOBILE M-033 to M-035): Agent Runtimes'
 * portable clients and conversation reducer, driven for a screen. No React:
 * a screen subscribes to it.
 *
 * - An application's conversation is a session of its runtime's Session API:
 *   started with the first message, then a message per turn; a question it
 *   asks is answered by a message (text, a choice) or a settings change (a
 *   form); a file question is answered on the web.
 * - A standalone agent's is a thread of its AG-UI mount: each run carries the
 *   conversation so far; there is no session to reopen or end.
 * - Stop cancels the turn and leaves the conversation open. Reopening reads
 *   the session and its messages first and resumes only a stopped session or
 *   one the runtime no longer holds (from its record). Nothing is ever sent
 *   again by itself: a turn the phone lost while away is read back from the
 *   server, never repeated.
 * - Kept in memory only: nothing of a conversation is written to the device.
 */

import {
  emptyConversation,
  reduceConversation,
  RuntimeRefusal,
  withError,
  withPrompt,
  withTurnEnded,
  type AgentRunClient,
  type AgUiEvent,
  type AppSessionsClient,
  type ConversationState
} from '@datalayer/agent-runtimes/lib/portable';

export type AppTarget = {
  kind: 'app';
  sessions: AppSessionsClient;
  agent: string;
  deploymentUid: string;
  appUid: string;
  version: number;
};

export type AgentTarget = { kind: 'agent'; runs: AgentRunClient };

/** What a screen draws besides the conversation. */
export type ConversationView = {
  conversation: ConversationState;
  /** Reading the conversation from the server. */
  opening: boolean;
  /** The session's uid, once there is one (an agent: its thread). */
  uid: string | null;
  /** The session is over for good. */
  ended: boolean;
};

/** Said when a second prompt is sent while a turn runs. */
export const ONE_TURN_AT_A_TIME = 'Wait for this answer, or stop it, before sending another message.';
/** Said for a file question: the phone answers none (MOBILE §3.4). */
export const FILE_ON_THE_WEB =
  'This question asks for a file. Files are answered on the web in this release: open the conversation there to answer it.';

const isAbort = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

export class ConversationController {
  private view: ConversationView;
  private readonly listeners = new Set<() => void>();
  private abort: AbortController | null = null;
  /** A turn's stream was lost (the app went away, the network dropped): read back, never resent. */
  private lost = false;

  constructor(
    readonly target: AppTarget | AgentTarget,
    uid: string | null,
    private readonly newId: () => string
  ) {
    this.view = { conversation: emptyConversation(), opening: false, uid, ended: false };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getView = (): ConversationView => this.view;

  private set(change: Partial<ConversationView>): void {
    this.view = { ...this.view, ...change };
    for (const listener of [...this.listeners]) listener();
  }

  private apply = (event: AgUiEvent): void => {
    const conversation = reduceConversation(this.view.conversation, event);
    const session = conversation.session;
    const uid = this.view.uid ?? (session && typeof session.uid === 'string' ? session.uid : null);
    this.set({ conversation, uid });
  };

  get running(): boolean {
    return this.view.conversation.running || this.abort !== null;
  }

  /**
   * Read an application's conversation from the server: what the session
   * holds while it is open; a stopped session, or one the runtime no longer
   * holds, resumed (from its record). An agent's thread has nothing to read.
   */
  async open(): Promise<void> {
    const uid = this.view.uid;
    if (this.target.kind !== 'app' || !uid) {
      return;
    }
    const { sessions, agent } = this.target;
    this.set({ opening: true });
    try {
      let described: Record<string, unknown> | null = null;
      try {
        described = await sessions.describe(uid);
      } catch (error) {
        if (!(error instanceof RuntimeRefusal && error.status === 404)) throw error;
      }
      if (!described || described.state === 'stopped') {
        // Not held, or stopped: resumed, its conversation said by the stream's snapshot.
        this.set({ conversation: emptyConversation() });
        await this.stream(signal => sessions.resume(uid, agent, { onEvent: this.apply, signal }));
        return;
      }
      const messages = await sessions.messages(uid);
      let conversation = reduceConversation(emptyConversation(), {
        type: 'MESSAGES_SNAPSHOT',
        messages: messages.map(message => ({ id: message.id, role: message.role, content: message.content }))
      });
      conversation = reduceConversation(conversation, { type: 'CUSTOM', name: 'loop.session', value: described });
      // A turn still running elsewhere is not followed here: it is read again once it ends.
      this.set({ conversation });
    } catch (error) {
      this.set({ conversation: withError(this.view.conversation, error instanceof Error ? error.message : String(error)) });
    } finally {
      this.lost = false;
      this.set({ opening: false });
    }
  }

  /** Send the person's words: a new turn, or (for an application) the answer to its text or choice question. */
  async send(words: string): Promise<boolean> {
    const said = words.trim();
    if (!said || this.view.ended) {
      return false;
    }
    if (this.running || this.view.opening) {
      this.set({ conversation: withError(this.view.conversation, ONE_TURN_AT_A_TIME) });
      return false;
    }
    if (this.view.conversation.asking?.kind === 'file') {
      this.set({ conversation: withError(this.view.conversation, FILE_ON_THE_WEB) });
      return false;
    }
    const before = this.view.conversation;
    this.set({ conversation: withPrompt(before, this.newId(), said) });
    if (this.target.kind === 'agent') {
      const { runs } = this.target;
      const thread = this.view.uid ?? this.newId();
      this.set({ uid: thread });
      const turns = this.view.conversation.items.flatMap(item =>
        item.kind === 'message' ? [{ id: item.id, role: item.role, content: item.text }] : []
      );
      await this.stream(signal => runs.run(thread, this.newId(), turns, { onEvent: this.apply, signal }));
      return true;
    }
    const { sessions, agent, deploymentUid, appUid, version } = this.target;
    const uid = this.view.uid;
    if (!uid) {
      const session = this.newId();
      this.set({ uid: session });
      await this.stream(signal =>
        sessions.start({ agent, deploymentUid, appUid, version, opener: said, session }, { onEvent: this.apply, signal })
      );
    } else {
      await this.stream(signal => sessions.message(uid, said, { onEvent: this.apply, signal }));
    }
    return true;
  }

  /** Answer a form question with its values: a settings change (the Session API's answer to a form). */
  async answerForm(values: Record<string, unknown>): Promise<boolean> {
    const uid = this.view.uid;
    if (this.target.kind !== 'app' || !uid || this.view.conversation.asking?.kind !== 'form' || this.running) {
      return false;
    }
    const { sessions } = this.target;
    await this.stream(signal => sessions.changeSettings(uid, values, { onEvent: this.apply, signal }));
    return true;
  }

  /**
   * Stop the turn: the stream is cancelled here and on the runtime (the
   * session's Stop, or the agent thread's terminate). The conversation stays
   * open; the turn is said as stopped. Returns how long the runtime took.
   */
  async stop(): Promise<number> {
    if (!this.running) {
      return 0;
    }
    const started = Date.now();
    this.abort?.abort();
    this.abort = null;
    const uid = this.view.uid;
    this.set({ conversation: withTurnEnded(this.view.conversation, 'stopped') });
    if (uid) {
      try {
        if (this.target.kind === 'app') {
          await this.target.sessions.stop(uid);
        } else {
          await this.target.runs.terminate(uid);
        }
      } catch (error) {
        this.set({ conversation: withError(this.view.conversation, error instanceof Error ? error.message : String(error)) });
      }
    }
    return Date.now() - started;
  }

  /** End an application's conversation for good (its record stays). */
  async end(): Promise<void> {
    const uid = this.view.uid;
    if (this.target.kind !== 'app' || !uid) {
      return;
    }
    if (this.running) {
      await this.stop();
    }
    await this.target.sessions.end(uid);
    this.set({ ended: true });
  }

  /**
   * The app came back to the foreground. A turn whose stream was lost while
   * it was away is read back from the server — never sent again.
   */
  async foreground(): Promise<void> {
    if (this.lost && !this.abort) {
      await this.open();
    }
  }

  /** Let it go (sign-out, too many held): its stream is cancelled here only, nothing is sent. */
  dispose(): void {
    this.abort?.abort();
    this.abort = null;
    this.listeners.clear();
  }

  private async stream(run: (signal: AbortSignal) => Promise<void>): Promise<void> {
    const abort = new AbortController();
    this.abort = abort;
    try {
      await run(abort.signal);
    } catch (error) {
      if (abort.signal.aborted || isAbort(error)) {
        return;
      }
      if (error instanceof RuntimeRefusal) {
        this.set({ conversation: withError(this.view.conversation, error.message) });
        return;
      }
      // The stream was lost — cut short, the network gone, the app away. For
      // an application it is read back; for an agent it is said.
      this.lost = this.target.kind === 'app';
      this.set({ conversation: withError(this.view.conversation, error instanceof Error ? error.message : String(error)) });
    } finally {
      if (this.abort === abort) {
        this.abort = null;
      }
    }
  }
}
