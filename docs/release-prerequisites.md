# Mobile release prerequisites

This is the ownership and custody checklist for creating Datalayer Agents'
cloud projects and store records. It records the proposed values without
creating a production release or placing a credential in Git.

## Identifiers and ownership

| Item | Proposed value | Human owner needed before use |
|---|---|---|
| Expo account | `datalayer-mobile` (created) | Datalayer Expo account owner |
| Expo project/slug | `@datalayer-mobile/datalayer-mobile`, id `1dfb9069-9ef4-4d8c-8a47-804376fa9d5e` (created; in `app.config.ts`) | Mobile release owner |
| Production iOS bundle id / Android application id | `ai.datalayer.mobile` | Apple Account Holder and Play Console account owner |
| Development id | `ai.datalayer.mobile.dev` | Mobile release owner |
| Preview id | `ai.datalayer.mobile.preview` | Mobile release owner |
| Production URL scheme | `datalayer` and `ai.datalayer.mobile` | IAM and mobile security owners |
| Development URL scheme | `datalayer-dev` and `ai.datalayer.mobile.dev` | IAM and mobile security owners |
| Preview URL scheme | `datalayer-preview` and `ai.datalayer.mobile.preview` | IAM and mobile security owners |
| Apple universal-link domain | `applinks:datalayer.ai` | Web/DNS owner and Apple Account Holder |
| Android app-link host | `datalayer.ai/mobile` | Web/DNS owner and Play release owner |

`app.config.ts` derives every installed name, id, scheme and icon from
`APP_VARIANT`; tests must keep this table and the config aligned. The Expo
project id is configuration, not a secret: `app.config.ts` holds it with the
owner and slug, so no environment variable names the project. The app's name
is **Datalayer Agents** on every platform (_Datalayer Agents Dev_ and
_Datalayer Agents Preview_ for the side-by-side variants).

## Accounts, costs and dependencies

| Account | Cost baseline | Required human action |
|---|---:|---|
| Expo | Free tier (the `datalayer-mobile` account's plan on 19 October 2026) covers a limited number of builds a month; a custom `staging` environment and signed updates may need a paid plan | Organization owner invites the release owner and creates a least-privilege robot token for CI |
| Apple Developer Program | US$99/year in the US; verify the local price when enrolling | Account Holder accepts agreements, registers the bundle id and grants App Manager/Developer roles |
| App Store Connect | Included with the Apple program | App Manager creates the app record, review account and TestFlight groups |
| Google Play Console | US$25 one-time registration fee; verify the local price when enrolling | Account owner completes verification, creates the app and grants the release manager least privilege |

These services are controlled by people and cannot be completed in source
code. Before the first staging build, record the named primary and recovery
owner for every row in the private release register. Do not put names, phone
numbers, recovery codes or billing details in this repository.

## Credential custody

| Material | Custodian | Repository value |
|---|---|---|
| Expo robot access token | GitHub Actions secret `EXPO_TOKEN`; recovery by an Expo organization owner | Never committed |
| iOS distribution certificate and provisioning profiles | EAS Credentials, under the Datalayer Expo project | Never committed |
| App Store Connect API key | EAS Submit credential; recovery by Apple Account Holder | Never committed |
| Android upload keystore | EAS Credentials; encrypted recovery copy under company credential policy | Never committed |
| Google Play service-account JSON | EAS Submit credential; recovery/rotation by Play account owner | Never committed |
| APNs key and FCM service-account material | EAS notification credentials; recovery by platform account owner | Never committed |
| EAS environment values | Expo `development`, `preview` and `production` environments | Names only in Git; values in EAS |

For each credential, the private release register records its platform key
id (not its secret), primary owner, recovery owner, creation and rotation
date, and the last successful drill. A departing owner triggers rotation.
The push-specific leak response is in `privacy-and-store.md`.

## Readiness gate

Before `staging` is allowed, a second person verifies:

1. Datalayer—not an individual's account—owns the Expo, Apple and Play assets.
2. Primary and recovery owners are named in the private release register.
3. Agreements and billing are current and the least-privilege roles work.
4. `eas project:info` matches the `owner`, `slug` and project id in `app.config.ts`.
5. Both app-link association files name exactly the production application.
6. The credentials can build and submit from CI without exporting a secret.
7. Recovery owners can rotate or revoke each credential without the primary.

Until that evidence exists, development remains possible, but store staging
and production release tasks remain open.
