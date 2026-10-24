# Datalayer: the deployed contracts

The server contracts the phone calls, as deployed on **r1** (IAM is shared and
served from prod1's address), with the versions running when they were
exercised and the result of each exercise.

Exercised on **16 October 2026** as `@datalayer-demo`, a non-production
account, by a drill script run from a workstation (each step records its status code
and the shape of the answer, never a key, token or runtime pod name). Three
model requests in all; the agent runtime the drill started was stopped and is
gone at the runtimes service and in Kubernetes.

## Versions

Read from the running deployments' images (`kubectl get deploy … -o
jsonpath='{.spec.template.spec.containers[0].image}'`) and from what each
image was built with (its pin commit in `k8s/services`).

| Service | Address the phone uses | Image running | Built with |
|---|---|---|---|
| IAM | `https://prod1.datalayer.run/api/iam/v1` | `iam:1.1.77` (prod1) | services `4722c3dd` |
| Runtimes | `https://r1.datalayer.run/api/runtimes/v1` | `runtimes:1.0.47` (r1) | services `13109a62` |
| AI Agents | `https://r1.datalayer.run/api/ai-agents/v1` | `ai-agents:0.0.71` (r1) | services `e848c78b`; Agent Runtimes 1.5.44 |
| Agent Runtimes (in each runtime) | `https://r1.datalayer.run/agent-runtimes/<pool>/<runtime uid>` | `agent-runtimes:0.0.49`, launched by `operator:1.0.99` | Agent Runtimes 1.5.44, agentspecs 0.0.107, agent-shield 0.2.2 (services `47de4d45`) |

The phone's own client is `@datalayer/agent-runtimes` `^1.5.66` and
`@datalayer/core` `^1.2.20` (`package.json`).

## Two planes

IAM, the spaces and telemetry are served by the control plane
(`https://prod1.datalayer.run`); ai-agents, runtimes, the scheduler, contents,
inference and the ai-agents WebSocket by the runtimes plane
(`https://r1.datalayer.run`), as Core's `config/planes` places them. Neither
host serves the other's routes — on 16 October 2026, `GET /api/iam/v1/me` was
404 at r1 and `GET /api/ai-agents/v1/apps/deployments` and
`GET /api/runtimes/v1/runtimes` 404 at prod1. The drill found the phone sending
every route to one host; it now sends each route to its plane
(`EXPO_PUBLIC_DATALAYER_RUNTIMES_URL`, `serviceUrlOf`, `src/test/planes.test.ts`,
which also holds the phone's table to Core's).

## Contracts and results

Every route is called with `Authorization: Bearer <token>` unless it says
otherwise. *Result* is what the drill got.

### Sign-in

| Contract | Route | Result, 16 October 2026 |
|---|---|---|
| A token belongs to a person (the token sign-in of development builds, and every start) | `GET /api/iam/v1/me` | 200, `me.handle_s` = `datalayer-demo`, a uid |
| OAuth discovery (no token) | `GET /api/iam/v1/oauth/.well-known/openid-configuration` | 200: authorization, token, revocation, userinfo and registration endpoints; PKCE `S256` only |
| The phone's client document (no token) | `GET /api/iam/v1/oauth/clients/datalayer-mobile.json` | 200: its `client_id` is that URL; redirects `ai.datalayer.mobile://oauth`, `ai.datalayer.mobile.preview://oauth`, `ai.datalayer.mobile.dev://oauth` |
| Credits before anything metered | `GET /api/iam/v1/usage/credits` | 200, `credits.credits` read |

The OAuth sign-in (code exchange, refresh rotation, revocation) needs a
device or a browser: it is held by IAM's `test_oauth_mobile_client.py` and the
phone's `oauth.test.ts`, and is drilled on a physical device, which is outside
this round. Since 24 October 2026 the phone signs in inside the app
(`app/sign-in.tsx`): a handle or email and password posted to
`POST /api/iam/v1/oauth2/mobile/password`, or GitHub, Google and LinkedIn in a
browser tab opened at `GET /api/iam/v1/oauth2/mobile/{provider}/authorize`;
both answer a code for the mobile client, redeemed at the token endpoint
(IAM's `test_oauth_mobile_in_app_sign_in.py`). *Sign in with Datalayer* (the
web's sign-in through `/oauth/authorize`) is gone from the app. Not exercised
against a deployed IAM yet: the routes ship with the next IAM image.

### Agents

| Contract | Route | Result, 16 October 2026 |
|---|---|---|
| The person's deployments, each with what it speaks | `GET /api/ai-agents/v1/apps/deployments` | 200, 5 hosted deployments, each `speaks.known: true`, 4 kept running |
| One application's, its identity checked now | `GET /api/ai-agents/v1/apps/deployments?app_uid=…&identity=true` | 200, `speaks.registry` and `speaks.identity` (probed the same day as the owner account) |
| Shared with the person | `GET /api/ai-agents/v1/apps/deployments/shared` | 200, none |
| Standalone runtimes | `GET /api/runtimes/v1/runtimes` | 200; the drill's agent runtime listed while it ran (`agent_spec_id: example-simple`, environment `ai-agents-env`), absent after |
| The person's conversations | `GET /api/ai-agents/v1/apps/conversations/mine/threads?limit=50` | 200, 50 threads |

### Approvals

The approval was asked as Agent Runtimes asks one (`POST /api/ai-agents/v1/tool-approvals`
with the person's token, a tool named `drill_noop` that nothing runs), then
answered as the phone answers it.

| Contract | Route | Result, 16 October 2026 |
|---|---|---|
| Pending list | `GET /api/ai-agents/v1/tool-approvals?status=pending&limit=200` | 200, the drill's approval listed |
| Pending count | `GET /api/ai-agents/v1/tool-approvals/pending/count` | 200, 1 |
| Detail | `GET /api/ai-agents/v1/tool-approvals/{id}` | 200, `status: pending`, `tool_name`, `tool_args`, `expires_at`, `read`, … |
| Mark read | `POST /api/ai-agents/v1/tool-approvals/{id}/mark-read` | 200, `read: true` |
| Decision | `POST /api/ai-agents/v1/tool-approvals/{id}/reject` with `{note}` | 200, `status: rejected`, the note kept |
| Decided elsewhere first | `POST /api/ai-agents/v1/tool-approvals/{id}/approve` after it | 409, `Approval is already 'rejected'` |
| Not the person's, or unknown | `POST /api/ai-agents/v1/tool-approvals/{unknown}/approve` | 404 |

### Activity

| Contract | Route | Result, 16 October 2026 |
|---|---|---|
| In progress, scheduled, completed | `GET /api/ai-agents/v1/apps/activity?limit=20&offset=0` | 200: `in_progress`, `scheduled`, `scheduled_problem`, `completed`, `next_offset` |

### An application's session (streamed)

On the *Accounting* deployment, kept running.

| Contract | Route | Result, 16 October 2026 |
|---|---|---|
| Where it continues | `GET /api/ai-agents/v1/apps/conversations/mine/deployments/{uid}/reach` | 200, `reach: kept`, the runtime's agent-runtimes address and agent |
| Start with the first message | `POST {runtime}/api/v1/apps/sessions` (`text/event-stream`) | 200: `RUN_STARTED`, `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT` ×10, `TEXT_MESSAGE_END`, `RUN_FINISHED`, `CUSTOM`, `usage`; one model request |
| What it is | `GET {runtime}/api/v1/apps/sessions/{uid}` | 200, `state: open` |
| Its conversation | `GET {runtime}/api/v1/apps/sessions/{uid}/messages` | 200, 2 messages |
| End it | `POST {runtime}/api/v1/apps/sessions/{uid}/end` | 200; the session then answers 404 |

### A standalone agent (AG-UI, streamed)

A runtime of the person's own, launched with Agent Runtimes' own launcher
(`agent_runtimes.loop.launch.launch_cloud`, as `loop --cloud` does: 10 minutes,
`example-simple`), reached directly at its agent-runtimes address with the
person's token, as the phone reaches it (`agentRuntimesUrlOf`).

| Contract | Route | Result, 16 October 2026 |
|---|---|---|
| A run with the conversation so far | `POST {runtime}/api/v1/ag-ui/default/` (`text/event-stream`) | 200: `RUN_STARTED`, a tool call (`TOOL_CALL_START`, `_ARGS` ×7, `_END`, `_RESULT`), `TEXT_MESSAGE_CONTENT` ×5, `RUN_FINISHED`, `usage`; two model requests (the tool call and the answer) |
| Stop | `POST {runtime}/api/v1/ag-ui/terminate` with `{thread_id}` | 200; the finished run said `not found or already completed` |
| Stop the runtime | the runtimes service | stopped; not listed by `GET /api/runtimes/v1/runtimes`; no pod refers to it in Kubernetes |

`GET {runtime}/api/v1/health` answers 404 at the runtime's public address: the
phone does not use it.

## Not exercised here

A device push, a physical notification deep link and the browser sign-in are
physical-device drills. Pause, resume and reset are held by their own
route tests and were not run against the demo account's deployments.
