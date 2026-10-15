/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A protocol sign-in watched until it finishes (MOBILE M-039). Once the
 * person opened the company's page — Direct: the system browser, back
 * through IAM's return bound to that browser and the company asked; Device:
 * the code entered there — the gateway is asked how it stands, with their
 * own sign-in, every few seconds while the app is in front, at once when it
 * comes back, and never past the sign-in's expiry. A continuation is taken
 * only bound to this application, this company and a verified issuer
 * (`signInStandsOf`), and goes on in the same conversation, once: the
 * person's *I have signed in* message. Watches outlive navigation (held by
 * conversation and company), never the process, and end at sign-out.
 */

import { SIGN_IN_POLL_MS, type SignInStands } from '@datalayer/agent-runtimes/lib/portable';

export type SignInAsk = (appUid: string, company: string) => Promise<SignInStands | null>;

export type SignInWatchState = 'watching' | 'signed_in' | 'refused' | 'expired' | 'unread';

export type SignInWatch = {
  appUid: string;
  company: string;
  state: SignInWatchState;
  /** The gateway's sentence, for a refusal. */
  reason: string;
};

type Held = SignInWatch & { until: number; going: boolean; goOn: () => void; listeners: Set<() => void> };

const watches = new Map<string, Held>();
const keyOf = (appUid: string, company: string): string => `${appUid}\n${company.toLowerCase()}`;

/** The default lifetime of a sign-in that names none. */
export const SIGN_IN_DEFAULT_MS = 10 * 60 * 1000;

/**
 * Watches a sign-in of `company` started in an application's conversation;
 * `goOn` continues that conversation once it finished. Watching it again
 * keeps the first watch (one continuation).
 */
export function watchSignIn(appUid: string, company: string, expiresAt: string | undefined, goOn: () => void, now = Date.now()): SignInWatch {
  const key = keyOf(appUid, company);
  const held = watches.get(key);
  if (held && held.state === 'watching') {
    return held;
  }
  const until = expiresAt && !Number.isNaN(Date.parse(expiresAt)) ? Date.parse(expiresAt) : now + SIGN_IN_DEFAULT_MS;
  const fresh: Held = { appUid, company, state: 'watching', reason: '', until, going: false, goOn, listeners: new Set() };
  watches.set(key, fresh);
  return fresh;
}

export const signInWatchOf = (appUid: string, company: string): SignInWatch | undefined => watches.get(keyOf(appUid, company));

export function subscribeSignIn(appUid: string, company: string, listener: () => void): () => void {
  const held = watches.get(keyOf(appUid, company));
  held?.listeners.add(listener);
  return () => held?.listeners.delete(listener);
}

function settle(held: Held, state: SignInWatchState, reason = ''): void {
  held.state = state;
  held.reason = reason;
  held.listeners.forEach(listener => listener());
}

/** Asks once for every watch still waiting; continues each conversation whose sign-in finished, once. */
export async function pollSignIns(ask: SignInAsk, now = Date.now()): Promise<void> {
  await Promise.all(
    [...watches.values()]
      .filter(held => held.state === 'watching' && !held.going)
      .map(async held => {
        if (now >= held.until) {
          settle(held, 'expired');
          return;
        }
        held.going = true;
        try {
          const stands = await ask(held.appUid, held.company);
          if (!stands) {
            return; // None under way here, or an answer that does not bind: nothing is continued.
          }
          if (stands.status === 'signed_in') {
            settle(held, 'signed_in');
            held.goOn();
          } else if (stands.status === 'refused' || stands.status === 'denied') {
            settle(held, 'refused', stands.reason);
          }
        } catch {
          settle(held, 'unread');
          held.state = 'watching'; // asked again next time
        } finally {
          held.going = false;
        }
      })
  );
}

/** Whether anything is still watched: what keeps the poll going. */
export const watchingAny = (): boolean => [...watches.values()].some(held => held.state === 'watching');

/** Forgets every watch: at sign-out. */
export function forgetSignIns(): void {
  watches.clear();
}

export { SIGN_IN_POLL_MS };
