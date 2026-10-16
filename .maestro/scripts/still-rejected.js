// The phone did not decide again: the approval answered elsewhere is still rejected.
var got = http.get(E2E_RUNTIMES_URL + '/api/ai-agents/v1/tool-approvals/' + output.approvalId, {
  headers: { Authorization: 'Bearer ' + E2E_TOKEN }
});
if (got.status !== 200) throw new Error('The approval could not be read: ' + got.status);
var status = json(got.body).status;
if (status !== 'rejected') throw new Error('The approval answered elsewhere is now ' + status);
