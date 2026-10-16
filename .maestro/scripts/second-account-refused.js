// MOBILE M-054, pause/reset authorization: a second account calling the owner's controls is refused.
var listed = http.get(E2E_RUNTIMES_URL + '/api/ai-agents/v1/apps/deployments', {
  headers: { Authorization: 'Bearer ' + E2E_TOKEN }
});
if (listed.status !== 200) throw new Error('The owner could not list deployments: ' + listed.status);
var mine = json(listed.body).deployments.filter(function (d) { return d.app_name === E2E_LIFECYCLE_APP || d.name === E2E_LIFECYCLE_APP; });
if (!mine.length) mine = json(listed.body).deployments;
var deployment = mine[0];
var headers = { Authorization: 'Bearer ' + E2E_SECOND_TOKEN, 'Content-Type': 'application/json' };
var paused = http.request(E2E_RUNTIMES_URL + '/api/ai-agents/v1/apps/deployments/' + deployment.uid, {
  method: 'PATCH', headers: headers, body: JSON.stringify({ version: deployment.version, state: 'paused' })
});
if (paused.status !== 403 && paused.status !== 404) throw new Error('A second account paused the owner\'s deployment: ' + paused.status);
var reset = http.post(E2E_RUNTIMES_URL + '/api/ai-agents/v1/apps/deployments/' + deployment.uid + '/reset', {
  headers: headers, body: JSON.stringify({})
});
if (reset.status !== 403 && reset.status !== 404) throw new Error('A second account reset the owner\'s deployment: ' + reset.status);
output.refused = paused.status + ' ' + reset.status;
