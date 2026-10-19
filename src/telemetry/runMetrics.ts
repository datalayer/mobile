/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Conversation health, sent without its words: each
 * streamed turn's time to first token, to its complete answer, a Stop's
 * latency, a failed stream's category, and how often a lost stream was read
 * back — as OTLP/JSON to the platform's metrics ingest
 * (`/api/otel/v1/otlp/v1/metrics`), under the person's account like any
 * Datalayer client. Never a prompt, an answer, an argument or an id. Kept in
 * memory, sent by tens and when the app goes to the background; one that
 * cannot be sent is dropped, never retried.
 */

import { otlpMetricsOf, type RunMeasure } from '@datalayer/agent-runtimes/lib/portable';

/** How many turns are sent at once. */
export const SEND_EVERY = 10;
export const METRICS_PATH = '/api/otel/v1/otlp/v1/metrics';

type Sink = {
  baseUrl: string;
  getAccessToken: () => string | undefined;
  fetch: typeof fetch;
  resource: Record<string, string>;
};

const state: { sink: Sink | null; turns: RunMeasure[]; recoveries: number } = { sink: null, turns: [], recoveries: 0 };

/** Where measures go: the platform's ingest, as the person signed in. */
export function setMetricsSink(sink: Sink | null): void {
  state.sink = sink;
}

/** Drops what is held: at sign-out, nothing of one account is sent as another's. */
export function dropRunMetrics(): void {
  state.turns = [];
  state.recoveries = 0;
}

/** Sends what is held, once. */
export async function flushRunMetrics(now = Date.now()): Promise<void> {
  const sink = state.sink;
  if (!sink || (state.turns.length === 0 && state.recoveries === 0)) {
    return;
  }
  const token = sink.getAccessToken();
  if (!token) {
    dropRunMetrics();
    return;
  }
  const body = otlpMetricsOf(state.turns, state.recoveries, sink.resource, now);
  dropRunMetrics();
  try {
    await sink.fetch(`${sink.baseUrl.replace(/\/+$/, '')}${METRICS_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
  } catch {
    // Dropped: health measures are never worth a retry.
  }
}

/** What a conversation tells: a turn measured, a lost stream read back. */
export const runMetrics = {
  turn(measure: RunMeasure): void {
    state.turns.push(measure);
    if (state.turns.length >= SEND_EVERY) void flushRunMetrics();
  },
  recovered(): void {
    state.recoveries += 1;
  }
};
