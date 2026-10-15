# Mobile push data classification and event matrix

This is the data contract for Datalayer Mobile push notifications (MOBILE M-005 and M-029). It is intentionally narrower than an Inbox item. A push is an unreliable hint carrying an opaque id and a safe route; the authenticated destination fetches current server truth and checks access again.

Status: implementation contract awaiting security review and physical-device drill. It does not authorize a production push credential.

## Classification

| Class                            | May appear in title/body? |                                 May appear in data? | Examples                                                                      |
| -------------------------------- | ------------------------: | --------------------------------------------------: | ----------------------------------------------------------------------------- |
| Public product words             |                       Yes |                                                  No | “Something needs you”, “Work finished”                                        |
| Account/application display name |                 **Never** |                                           **Never** | “Inbox Triage”                                                                |
| Opaque server identifier         |                        No | Yes, only as `id` or inside the allowlisted `route` | notification id, approval id, application uid                                 |
| User content                     |                 **Never** |                                           **Never** | prompt, answer, company reply, mail subject/body, filename                    |
| Proposed action detail           |                 **Never** |                                           **Never** | tool arguments, recipients, terms, cart lines, amount/currency                |
| Identity/authentication material |                 **Never** |                                           **Never** | handle/email, token, code, ticket, cookie, assertion, proof, DPoP/signing key |
| Network/protocol detail          |                 **Never** |                                           **Never** | issuer, counterpart URL, full path/query, request/response headers or body    |
| Diagnostics                      |                 **Never** |                                           **Never** | trace id, stack, internal reason, provider receipt                            |

Notification content is not analytics data. The push installation token is a credential: it is encrypted server-side, omitted from responses and logs, limited per account and removed when Expo reports the device gone.

## Payload envelope

The only client payload read by version 1 is:

```json
{
  "v": 1,
  "kind": "approval.requested",
  "id": "opaque-notification-id",
  "route": "/approvals/opaque-approval-id"
}
```

- `v` is the integer payload version. A newer or missing version opens Inbox.
- `kind` is the server notification kind that selected the generic template. Version 1 currently emits `approval.requested`, `app.paused_by_organization`, `kept`, `app.input_required`, `app.run_failed`, `app.run_completed`, `run.blocked`, `reproduction.failed`, `budget.reached` or `run.completed`. Quiet hours (M-043) hold everything but approvals unless the person said approvals wait too. The client does not trust it for navigation or authorization.
- `id` is the opaque Inbox-notification id. The server uses it to deduplicate one delivery per installation; it is not a trace id.
- `route` is exactly `/`, `/approvals/{id}`, `/apps/{id}` or `/apps/{id}/protocols`, with a 1–128 character URL-safe destination id where present. Anything else opens Inbox.
- No notification action decides an approval. A tap only opens the app.

The delivery record also has a server-side category—`approvals`, `attention`, `failures` or `completions`—which selects installations by preference. It is not sent in `data` and does not grant access. Android presentation currently uses the app's `needs-attention` channel; category-specific channels are future work.

The server must omit a push rather than add a field to explain an event. A new field or destination requires a payload-version change, mobile allowlist/test change, this matrix, the public guide and security review.

## Event matrix

TTL is measured from the notification's server `created_at`, falling back to queue time. The current outbox deduplicates by notification id and installation. It does not yet set an Expo collapse key; proposed semantic keys below are requirements for future producers, not implemented payload fields.

| Event                                                                | Producer/state                                         | Recipient                                            | Category/default          | Safe title                      | Safe body                                                             |                             TTL | Collapse/dedup                   | Destination                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- | ------------------------- | ------------------------------- | --------------------------------------------------------------------- | ------------------------------: | -------------------------------- | ------------------------------------------------------------------ |
| Approval requested, including PAP Operation or UCP/ACP test purchase | Tool approval producer; implemented                    | Approval owner                                       | `approvals` / on          | “Waiting for your approval”     | “An agent has paused until you answer.”                               |                            24 h | notification id + installation   | `/approvals/{id}`                                                  |
| Input required | `app.input_required` from the record's `asked` entry (`loop.ask`); implemented | Whoever opened the session; the owner for a session nobody opened | `attention` / on | “An application needs an answer” | “It asked you something and waits.” | 24 h | one item per session + asked moment (`create_notification_once`); notification id + installation | `/apps/{appUid}/sessions/{sessionUid}` (located again on opening) |
| Run failed or blocked | `app.run_failed` from the record's `output` (stopped with an error, or stopping a session nobody was there for); evals `run.blocked`, `reproduction.failed`, `budget.reached` | Opener of the session, else the application owner; evals: the notification's person | `failures` / on | “Something needs you” | “A run stopped before it answered.” / “A run stopped and is waiting for you.” | 24 h | one item per session + end moment; notification id + installation | `/apps/{appUid}` (evals: `/`) |
| Paused by organization owner                                         | `app.paused_by_organization`; implemented              | Person who owns the notification                     | `attention` / on          | “An application was paused”     | “An owner of your organization paused one of your applications.”      |                            24 h | notification id + installation   | `/apps/{appUid}`                                                   |
| Kept application stopped or near daily spend                         | `kept`; implemented                                    | Person who owns the notification                     | `attention` / on          | “An application needs you”      | “One of your applications stopped, or nears what it may spend today.” |                            24 h | notification id + installation   | `/apps/{appUid}`                                                   |
| Run completed | `app.run_completed` (a session nobody was there for answered) and evals `run.completed`; opt-in | Application owner; evals: the notification's person | `completions` / off | “Work finished” | “A run has finished.” / “A run you started has finished.” | 6 h | one item per session + end moment; notification id + installation | `/apps/{appUid}` (evals: `/`) |
| PAP/PACT consent expiring                                            | **No producer or push kind yet**                       | The person whose consent expires                     | proposed `attention` / on | Proposed: “Something needs you” | Proposed: “Access in your name needs attention.”                      |       Earlier of expiry or 24 h | proposed `consent:{id}:expiring` | `/apps/{appUid}/protocols`                                         |
| Counterpart identity/profile changed and held                        | **No producer or push kind yet**                       | People with affected held consent; application owner | proposed `attention` / on | Proposed: “Something needs you” | Proposed: “A connection needs review.”                                |                            24 h | proposed `counterpart:{id}:held` | `/apps/{appUid}/protocols`                                         |
| Signed request repeatedly failed                                     | **No producer or push kind yet**; threshold required   | Application owner                                    | proposed `failures` / on  | Proposed: “Something needs you” | Proposed: “Signed requests need attention.”                           |                            24 h | proposed app + protocol key      | `/apps/{appUid}/protocols`                                         |
| Consent disconnected/revoked                                         | No push in v1                                          | —                                                    | —                         | —                               | —                                                                     |                               — | Reconcile through WebSocket/REST | —                                                                  |
| Routine protocol receipt or successful signed request                | No push                                                | —                                                    | —                         | —                               | —                                                                     |                               — | Activity only                    | —                                                                  |

Protocol events deliberately reuse the application and approval destinations. A push never names a company, business, merchant, protocol, operation, scope, price or failure reason.

## Delivery behavior

- Current Android delivery uses `needs-attention`; approval, attention and failure messages are high priority, while completion is normal priority. Category-specific channels remain future work.
- Quiet hours are server-side presentation policy. They may delay non-urgent push delivery but never the Inbox event. Approval pushes bypass quiet hours by default only after M-043 adds the explicit per-user choice.
- Foreground delivery shows a restrained native banner and invalidates REST queries. It does not make a second Inbox entity beside the server event.
- A reconnect and a push may both announce one event; query reconciliation and the server notification `id` keep one server entity.
- A tap after sign-out, access withdrawal, expiry or deletion authenticates and refetches. It shows signed out, forbidden, expired or gone; it never uses payload text as a fallback record.
- Badge is the uncapped authenticated pending-approval count, recomputed from the server and cleared on sign-out.

## Retention and telemetry

- Expo ticket ids and receipts are retained only for delivery operations and aggregate health according to the server retention policy.
- Future open telemetry may record the notification `id`, app version, platform and coarse outcome (`opened`, `gone`, `forbidden`, `expired`), never the fetched entity or route query. The mobile client does not emit this telemetry today.
- Provider errors are normalized to coarse categories. Raw provider responses and device tokens never enter analytics or crash breadcrumbs.
- Invalid-token receipt disables that installation; sign-out requests removal before clearing local account state.

## Review and drill gates

Before a production credential exists, security reviews:

1. every row and template above;
2. server payload construction and logging/redaction tests;
3. account/installation ownership and cross-account reuse tests;
4. TTL, collapse, dedup and receipt retention;
5. Expo project access, token ownership, rotation and incident response;
6. terminated/background/foreground delivery on physical iOS and Android devices;
7. arrival after sign-out, access withdrawal, approval expiry and application deletion;
8. screenshots and device logs proving no forbidden class appears.

Approval of this document, the server-side producer tests and the M-027 device evidence are separate gates. Completing the document alone does not tick M-005 or M-029.
