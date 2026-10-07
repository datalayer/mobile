/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The one ai-agents WebSocket, as the rest of the app reaches it: typed
 * requests answered to this client (`{type, data}` or `{type, error}`), as
 * the server answers `tool-approvals-history` and the push installation
 * messages. `useRealtime` owns the connection and attaches it here.
 */

export type Answer = { type: string; data?: Record<string, unknown>; error?: string };

type Pending = { resolve: (answer: Answer) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

const REQUEST_TIMEOUT_MS = 10_000;

let socket: { send: (text: string) => void } | null = null;
const pending = new Map<string, Pending[]>();
const openListeners = new Set<() => void>();

/** Called by `useRealtime` when its socket opens (with it) and closes (with `null`). */
export function attachSocket(open: { send: (text: string) => void } | null): void {
  socket = open;
  if (open) {
    for (const listener of openListeners) {
      listener();
    }
    return;
  }
  for (const [type, waiting] of pending) {
    for (const request of waiting) {
      clearTimeout(request.timer);
      request.reject(new Error(`The connection closed before ${type} was answered.`));
    }
  }
  pending.clear();
}

/** Called for every frame: answers settle the request of their type, oldest first. Returns whether it was one. */
export function settleAnswer(frame: unknown): boolean {
  if (!frame || typeof frame !== 'object' || 'event' in frame) {
    return false;
  }
  const answer = frame as Answer;
  const waiting = typeof answer.type === 'string' ? pending.get(answer.type) : undefined;
  const request = waiting?.shift();
  if (!request) {
    return false;
  }
  clearTimeout(request.timer);
  request.resolve(answer);
  return true;
}

export function isConnected(): boolean {
  return socket !== null;
}

/** Sends a typed request and waits for its answer; refused when not connected. */
export function request(type: string, body: Record<string, unknown> = {}): Promise<Answer> {
  const open = socket;
  if (!open) {
    return Promise.reject(new Error('Not connected.'));
  }
  return new Promise<Answer>((resolve, reject) => {
    const timer = setTimeout(() => {
      const waiting = pending.get(type);
      const index = waiting?.findIndex(entry => entry.timer === timer) ?? -1;
      if (waiting && index >= 0) {
        waiting.splice(index, 1);
      }
      reject(new Error(`${type} was not answered in time.`));
    }, REQUEST_TIMEOUT_MS);
    const waiting = pending.get(type) ?? [];
    waiting.push({ resolve, reject, timer });
    pending.set(type, waiting);
    open.send(JSON.stringify({ ...body, type }));
  });
}

/** Runs `listener` every time the socket opens, as long as it is subscribed. */
export function onOpen(listener: () => void): () => void {
  openListeners.add(listener);
  return () => openListeners.delete(listener);
}
