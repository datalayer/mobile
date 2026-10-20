#!/usr/bin/env node
/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Before the Maestro flows: say, in the run's annotations, where the prompt flow's conversation with the
// chat test application will be had (ai-agents' `reach`) and, when nothing runs it, whether the test
// account has the 10 free credits Start and continue reserves. Maestro reports a failed script as
// "Unknown error" and its logs are scrubbed, so this is where the reason is read. Never prints a token.
const E2E_TOKEN = process.env.E2E_TOKEN;
const E2E_CHAT_APP = process.env.E2E_CHAT_APP;
const E2E_RUNTIMES_URL = process.env.E2E_RUNTIMES_URL;
const E2E_RUN_URL = process.env.E2E_RUN_URL;
if (!E2E_TOKEN || !E2E_CHAT_APP || !E2E_RUNTIMES_URL || !E2E_RUN_URL) {
  console.error('E2E_TOKEN, E2E_CHAT_APP, E2E_RUNTIMES_URL and E2E_RUN_URL are needed.');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${E2E_TOKEN}`, Accept: 'application/json' };
const read = async (url) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${new URL(url).pathname}: ${response.status}`);
  return response.json();
};
const { deployments = [] } = await read(`${E2E_RUNTIMES_URL}/api/ai-agents/v1/apps/deployments`);
const chat = deployments.find(d => (d.app_name === E2E_CHAT_APP || d.name === E2E_CHAT_APP) && d.target === 'hosted');
if (!chat) {
  console.log('::warning title=Prompt flow::The chat test deployment was not found.');
  process.exit(0);
}
const { reach } = await read(`${E2E_RUNTIMES_URL}/api/ai-agents/v1/apps/conversations/mine/deployments/${chat.uid}/reach`);
if (reach.reach === 'closed') {
  console.log(`::warning title=Prompt flow::The chat test application cannot be talked to now: ${reach.reason}`);
} else if (reach.reach === 'launch') {
  const body = await read(`${E2E_RUN_URL}/api/iam/v1/usage/credits`);
  const held = (body.reservations ?? []).reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
  const free = (Number(body.credits?.credits) || 0) - held;
  const kept = chat.kept?.why ? ` Its kept computer: ${chat.kept.why}` : '';
  const level = free < 10 ? 'warning' : 'notice';
  console.log(`::${level} title=Prompt flow::Nothing runs the chat test application; the flow starts a computer of the test account's own (10 credits reserved). Free credits: ${free.toFixed(2)} (${held.toFixed(2)} held).${kept}`);
} else {
  console.log(`::notice title=Prompt flow::The conversation is had on ${reach.reach === 'kept' ? 'its kept computer' : "a computer of the test account's own already running"}.`);
}
