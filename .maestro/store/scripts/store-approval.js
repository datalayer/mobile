// The approval the store screenshots show: a mail an agent asks to send, waiting on the test
// account. Nothing runs on its decision (no runtime waits on it); the flow rejects it at the end.
var headers = { Authorization: 'Bearer ' + E2E_TOKEN, 'Content-Type': 'application/json' };
var base = E2E_RUNTIMES_URL + '/api/ai-agents/v1/tool-approvals';
// The Inbox shows this one alone: an approval an earlier store run left is rejected first, and so is
// a smoke flow's (agent maestro-smoke, nothing runs on it) left by a flow that stopped before its end,
// when over ten minutes old (a smoke flow decides its own within a minute or two, so one running now
// on another device keeps it).
var pending = http.get(base + '?status=pending&limit=200', { headers: headers });
if (pending.status !== 200) throw new Error('The pending approvals were not listed: ' + pending.status);
var tenMinutesAgo = Date.now() - 600 * 1000;
(json(pending.body).approvals || []).forEach(function (left) {
  var agent = left.agent_id || left.agentId;
  var asked = Date.parse(String(left.created_at || left.createdAt || '').slice(0, 19) + 'Z'); // UTC, to the second
  if (agent === 'sales-digest' || (agent === 'maestro-smoke' && asked < tenMinutesAgo)) {
    http.post(base + '/' + left.id + '/reject', { headers: headers, body: JSON.stringify({ note: 'Cleared before the store screenshots' }) });
  }
});
var made = (function () {
  var options = {
    headers: headers,
    body: JSON.stringify({
      agent_id: 'sales-digest',
      runtime_name: '',
      tool_name: 'send_email',
      tool_args: {
        application: 'Sales digest',
        _rule: 'A mail leaving the company waits for your approval',
        to: 'team@example.com',
        subject: 'Weekly sales summary',
        body:
          'Hello team,\n\nSales grew 12% this week, led by the new subscription plans. ' +
          'The full numbers are in the shared notebook.\n\nBest,\nThe sales digest agent'
      }
    })
  };
  return http.post(base, options);
})();
if (made.status !== 200) throw new Error('The approval was not created: ' + made.status);
output.approvalId = json(made.body).id;
