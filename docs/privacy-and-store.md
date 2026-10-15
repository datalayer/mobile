# Mobile privacy, store declarations and push incident runbook

This is the review source for MOBILE M-052. It describes the current application; it is not evidence that Apple or Google forms have been submitted. Reconcile it with the release binary's generated manifests and dependency privacy reports before every store submission.

## Public destinations

| Purpose          | URL                            | Current behavior                                                      |
| ---------------- | ------------------------------ | --------------------------------------------------------------------- |
| Privacy policy   | `https://datalayer.ai/privacy` | Public policy                                                         |
| Support          | `https://datalayer.ai/support` | Public support entry; a signed-in request may follow                  |
| Account deletion | `https://datalayer.ai/support` | Request path only; the current web profile delete control is disabled |

All three are visible in mobile Settings and open in the system browser. Account deletion must not be described in store metadata as self-service until the web/IAM flow actually deletes an account. Before review, confirm that support can authenticate the requester, explain subscription consequences, delete or retain each data class under policy, and report completion.

## Data inventory

The app does not track a person across other companies' apps or websites and has no tracking domain. These data are linked to the signed-in account and used only for application functionality:

| Store data type     | Why the app handles it                                                  | Leaves the device?                     | Retention/source of truth                                               |
| ------------------- | ----------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| User ID             | Authenticate and authorize the Datalayer account                        | Yes, in authenticated service requests | IAM policy; the app does not copy it into analytics                     |
| Device ID           | Expo push token and opaque installation id                              | Yes, only after notification consent   | Push installation; remove on sign-out/disable and invalid-token receipt |
| Product interaction | Approval decisions, deployment controls and protocol connection actions | Yes, through audited APIs              | Service audit/operation policy                                          |
| Other user content  | Optional approval note and, when conversations ship, prompts/answers    | Yes, only when the person submits it   | Owning service policy; never push or mobile analytics                   |
| Performance data    | Conversation health (M-036): time to first token, to the complete answer, Stop latency, failed-stream category, lost streams read back | Yes, by tens and when the app goes to the background, to the platform's metrics ingest as the signed-in account | The platform's metrics retention; never a prompt, an answer, an argument or an id |

Authentication/access/refresh tokens remain in platform secure storage. Prompt, answer, approval arguments, mail content, protocol credentials, signing keys and raw provider receipts are not analytics. The Query cache is memory-only and is rebuilt from the server after process death.

The iOS app manifest declares the first four linked, non-tracking data types above for `App Functionality`, and performance data — linked, not tracking — for `App Functionality` and `Analytics` (decided by the user, 15 October 2026). Expo/native dependencies contribute their own required-reason API manifests. A release owner must inspect the merged `PrivacyInfo.xcprivacy`; do not copy a dependency's required-reason API into the app manifest without verifying that the app itself calls it.

## Apple App Privacy answers

Use the inventory above to prepare App Store Connect. Confirm against the built binary and live privacy policy:

- tracking: **No**;
- linked to identity: **Yes** for the five listed types;
- purpose: **App Functionality**; performance data: **App Functionality** and **Analytics**;
- advertising, third-party advertising, marketing and data-broker use: **No**;
- precise/coarse location, contacts, photos, health, financial/payment information and browsing/search history: **Not collected by this app** unless a later feature changes the code and this document first;
- diagnostics: no mobile crash/analytics SDK. Conversation health (above) is sent by the app's own code to Datalayer's metrics ingest, never to a third party; add the exact data here before adding anything else.

Apple's questionnaire is separate from `PrivacyInfo.xcprivacy`; both must agree.

## Google Play Data safety answers

Treat transmission to Datalayer services and Expo Push Service as collection. In Play Console, map the same four rows to account management/app functionality, encrypted in transit, not sold, and not shared for advertising. Declare **App info and performance → Diagnostics** (conversation health: durations, counts, failure categories, never content) as collected, linked to the account, for **App functionality** and **Analytics**, not shared, encrypted in transit, required while signed in (decided 15 October 2026). Verify whether Google's current form classifies Expo as a service provider rather than a declared third-party share. State accurately whether each type is required or optional: the push installation/device identifier is optional because notifications are opt-in; authentication and ordinary service interactions are required for the signed-in app.

The production manifest requests notification permission only. Inspect the merged Android manifest for every release and explain or remove any permission contributed by a dependency before submission.

## Push credential incident runbook

Owner names and provider-console locations belong in the private release record, not this repository.

1. **Detect and bound.** Record discovery time, affected Expo project/build profiles, credential kind and last known legitimate use. Do not paste the credential, device tokens or notification bodies into the incident record.
2. **Contain.** Disable the push sender/worker or its production secret injection. Revoke the exposed Expo/APNs/FCM credential in its provider console. Keep Inbox and WebSocket events working.
3. **Rotate.** Create the replacement under the release owner's account, store it in the approved secret manager/EAS environment, redeploy the sender and prove the old credential fails. Never commit it or put it in an `EXPO_PUBLIC_*` value.
4. **Assess.** Query coarse delivery/audit records for unexpected volume, accounts, installations, categories and times. Provider ticket ids are operational data; do not retrieve notification content because payload templates are generic.
5. **Recover.** Send one generic canary to controlled iOS and Android installations, verify ticket and receipt, and re-enable delivery gradually. Disable device tokens rejected by the provider.
6. **Notify and record.** Security decides whether affected people, Apple, Google or authorities must be notified. Record credential fingerprint, revocation/rotation times, deployment ids, evidence and follow-up without secrets.
7. **Prevent recurrence.** Review console membership, least privilege, secret scanning, log redaction, rotation interval and the physical-device drill. Add a regression check for the specific leak path.

## Release evidence still required

- generated iOS privacy report and merged `PrivacyInfo.xcprivacy` from the production archive;
- merged Android manifest and Play SDK Index/dependency review;
- screenshots/exports of completed Apple privacy and Google Data safety forms;
- live support, privacy and authenticated deletion-request checks;
- named private owners for store records, support response and push credential recovery;
- a tabletop rotation of the production-like push credential and a physical-device canary.

M-052 stays open until this evidence exists and the deletion request is operationally verified.
