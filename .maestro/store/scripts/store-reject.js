// Leaves nothing waiting on the test account: the screenshots' approval is rejected.
var answered = http.post(E2E_RUNTIMES_URL + '/api/ai-agents/v1/tool-approvals/' + output.approvalId + '/reject', {
  headers: { Authorization: 'Bearer ' + E2E_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ note: 'Store screenshots taken' })
});
if (answered.status !== 200) throw new Error('The approval was not rejected: ' + answered.status);
