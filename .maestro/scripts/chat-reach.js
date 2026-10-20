// Where a new conversation with the chat test application is had now, as ai-agents tells the phone:
// `kept` (its owner's computer answers), `runtime` (one of the test account's own runs for it) or
// `launch` (nothing runs it: the flow starts a computer of the account's own, 10 credits reserved,
// which the workflow's e2e-cleanup job stops). Anything else fails here, with ai-agents' reason.
var headers = { Authorization: 'Bearer ' + E2E_TOKEN };
var listed = http.get(E2E_RUNTIMES_URL + '/api/ai-agents/v1/apps/deployments', { headers: headers });
if (listed.status !== 200) throw new Error('The deployments could not be listed: ' + listed.status);
var chat = json(listed.body).deployments.filter(function (d) {
  return (d.app_name === E2E_CHAT_APP || d.name === E2E_CHAT_APP) && d.target === 'hosted';
});
if (!chat.length) throw new Error('The chat test deployment was not found: ' + E2E_CHAT_APP);
var asked = http.get(E2E_RUNTIMES_URL + '/api/ai-agents/v1/apps/conversations/mine/deployments/' + chat[0].uid + '/reach', { headers: headers });
if (asked.status !== 200) throw new Error('Where the conversation is had could not be read: ' + asked.status);
var place = json(asked.body).reach;
if (place.reach === 'closed') throw new Error('The chat test application cannot be talked to now: ' + place.reason);
if (place.reach === 'launch') {
  // As IAM decides a reservation: the account's credits less what its reservations hold.
  var credits = http.get(E2E_RUN_URL + '/api/iam/v1/usage/credits', { headers: headers });
  if (credits.status !== 200) throw new Error('The test account\'s credits could not be read: ' + credits.status);
  var body = json(credits.body);
  var held = (body.reservations || []).reduce(function (sum, r) { return sum + (Number(r.credits) || 0); }, 0);
  var free = (Number(body.credits && body.credits.credits) || 0) - held;
  if (free < 10) {
    throw new Error('The test account has ' + free.toFixed(2) + ' free credits (' + held.toFixed(2) + ' held by its reservations); starting a computer for the conversation reserves 10.');
  }
}
output.chatReach = place.reach;
