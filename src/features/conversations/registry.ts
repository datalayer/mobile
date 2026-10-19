/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The conversations the phone holds while it runs: in memory
 * only, so that leaving a conversation and coming back — or the app going to
 * the background and back — finds it as it was, its stream still running.
 * Nothing is written to the device: after the process ends, a conversation is
 * read again from the server. Bounded, and forgotten at sign-out.
 */

import type { ConversationController } from './controller';

/** How many conversations are held at once: the most recently opened. */
export const HELD_LIMIT = 8;

const held = new Map<string, ConversationController>();

/** The conversation held under a key, made when there is none. */
export function conversationFor(key: string, make: () => ConversationController): ConversationController {
  const found = held.get(key);
  if (found) {
    // Most recently opened last.
    held.delete(key);
    held.set(key, found);
    return found;
  }
  const made = make();
  held.set(key, made);
  for (const [oldest, controller] of held) {
    if (held.size <= HELD_LIMIT) break;
    if (controller.running || controller === made) continue;
    held.delete(oldest);
    // Let go once no other key holds it (a new conversation is also held under its session).
    if (![...held.values()].includes(controller)) controller.dispose();
  }
  return made;
}

/** Hold a conversation under another key too: a new one, once its session has a uid. */
export function holdAs(key: string, controller: ConversationController): void {
  held.set(key, controller);
}

/** How many are held (a test). */
export const heldCount = (): number => new Set(held.values()).size;

/** Forget every conversation: the person signed out, or another account signed in. */
export function forgetConversations(): void {
  for (const controller of new Set(held.values())) {
    controller.dispose();
  }
  held.clear();
}
