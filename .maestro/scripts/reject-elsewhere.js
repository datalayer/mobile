// Another surface answers first: the web, or the deadline. The phone must then say so, not decide again.
var answered = http.post(E2E_RUNTIMES_URL + '/api/ai-agents/v1/tool-approvals/' + output.approvalId + '/reject', {
  headers: { Authorization: 'Bearer ' + E2E_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ note: 'Answered elsewhere by a Maestro smoke flow' })
});
if (answered.status !== 200) throw new Error('The other surface could not answer: ' + answered.status);
