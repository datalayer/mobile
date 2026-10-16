// An approval asked as Agent Runtimes asks one, waiting on the test account; nothing runs on its decision.
var made = (function () {
  var options = {
    headers: { Authorization: 'Bearer ' + E2E_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: 'maestro-smoke',
      runtime_name: '',
      tool_name: 'maestro_noop',
      tool_args: { note: 'A Maestro smoke flow (MOBILE M-054): nothing runs on this decision.' }
    })
  };
  return http.post(E2E_RUNTIMES_URL + '/api/ai-agents/v1/tool-approvals', options);
})();
if (made.status !== 200) throw new Error('The approval was not created: ' + made.status);
output.approvalId = json(made.body).id;
