// The approval the store screenshots show: a mail an agent asks to send, waiting on the test
// account. Nothing runs on its decision (no runtime waits on it); the flow rejects it at the end.
var made = (function () {
  var options = {
    headers: { Authorization: 'Bearer ' + E2E_TOKEN, 'Content-Type': 'application/json' },
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
  return http.post(E2E_RUNTIMES_URL + '/api/ai-agents/v1/tool-approvals', options);
})();
if (made.status !== 200) throw new Error('The approval was not created: ' + made.status);
output.approvalId = json(made.body).id;
