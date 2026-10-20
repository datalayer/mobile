#!/usr/bin/env node
/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// After the Maestro flows: stop the computers the test account started for its own conversations
// with the chat test application (named `conversation-<deployment uid's first 8>` by ai-agents),
// so a flow's runtime lives minutes, not until its 10 credits are spent. Its owner's kept computer
// (`kept-…`) and every other runtime are left alone. Says only how many it stopped; never a token.
const E2E_TOKEN = process.env.E2E_TOKEN;
const E2E_CHAT_APP = process.env.E2E_CHAT_APP;
const E2E_RUNTIMES_URL = process.env.E2E_RUNTIMES_URL;
if (!E2E_TOKEN || !E2E_CHAT_APP || !E2E_RUNTIMES_URL) {
  console.error('E2E_TOKEN, E2E_CHAT_APP and E2E_RUNTIMES_URL are needed.');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${E2E_TOKEN}`, Accept: 'application/json' };
const read = async (path) => {
  const response = await fetch(`${E2E_RUNTIMES_URL}${path}`, { headers });
  if (!response.ok) throw new Error(`${path.split('?')[0]}: ${response.status}`);
  return response.json();
};
const { deployments = [] } = await read('/api/ai-agents/v1/apps/deployments');
const chat = deployments.find(d => (d.app_name === E2E_CHAT_APP || d.name === E2E_CHAT_APP) && d.target === 'hosted');
if (!chat) throw new Error('The chat test deployment was not found.');
const name = `conversation-${String(chat.uid).slice(0, 8)}`;
const { runtimes = [] } = await read('/api/runtimes/v1/runtimes');
const ours = runtimes.filter(r => r.deployment_uid === chat.uid && r.given_name === name);
for (const runtime of ours) {
  const response = await fetch(`${E2E_RUNTIMES_URL}/api/runtimes/v1/runtimes/${encodeURIComponent(runtime.runtime_name)}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok && response.status !== 404) throw new Error(`A conversation runtime was not stopped: ${response.status}`);
}
console.log(`Conversation runtimes stopped: ${ours.length}.`);
