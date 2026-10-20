[![Datalayer](https://images.datalayer.io/legacy/datalayer-25.svg)](https://datalayer.ai)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# ☰ 📱 Datalayer

**Datalayer** is the mobile app for the agents and applications you run on Datalayer, in your pocket: what needs you, the approvals to read in full before deciding, and the conversations to continue. Expo (SDK 57) and React Native, iOS and Android. The person-facing guide is [datalayer.ai/docs/mobile-app](https://datalayer.ai/docs/mobile-app).

The notification payload allowlist, event matrix and security-review/device gates are in [`docs/push-data-classification.md`](docs/push-data-classification.md). Privacy/store declarations and the push-credential incident procedure are in [`docs/privacy-and-store.md`](docs/privacy-and-store.md). The store listing's words, review notes and the Apple and Google review answers, drafted, are in [`docs/store-listing.md`](docs/store-listing.md). Account ownership, identifiers and credential custody are in [`docs/release-prerequisites.md`](docs/release-prerequisites.md). The deployed server contracts, their versions and the dated result of exercising each are in [`docs/contracts.md`](docs/contracts.md). The public, person-facing guide is [datalayer.ai/docs/mobile-app](https://datalayer.ai/docs/mobile-app).

## Develop

The package is a workspace of the monorepo: install from the monorepo root (`npm install` in `src/`), never here. It pins `react` and the native modules (`react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`) to the versions Expo SDK 57 links, which npm keeps under this package's `node_modules` when the workspace holds newer ones; `metro.config.js` resolves them from there. `expo-doctor` reports those as duplicates: that is the monorepo, not a defect, as long as the versions under this package are the ones `expo install --check` expects.

Expo Go is not supported: sign-in storage, notifications, links and the native controls of `@expo/ui` need a development build.

### Prerequisites

`make setup` installs what is missing and keeps what is there: a JDK 17 as the system Java (`openjdk-17-jdk` with apt on Ubuntu, replacing an older one; Homebrew on macOS), the Android command-line tools under `ANDROID_HOME` (`~/Android/Sdk` by default), `platform-tools` (adb), SDK platform 36 with build-tools 36.0.0 and the NDK React Native 0.86 wants, the emulator with one Pixel 8 API 36 virtual device, EAS CLI, and on macOS the Xcode Command Line Tools and CocoaPods. It ends by printing the `export` lines (`ANDROID_HOME`, `PATH`) to add to your shell profile; the Makefile sets them for its own targets, so `make dev-android` works before that. `make tools` shows what is found.

- Node 20.19, 22.13 or 24.3 and later (`engines` in `package.json`); npm 10.
- Android: what `make setup` installs, or Android Studio with the same SDK components. A device needs USB debugging on.
- iOS (macOS only): Xcode 16 or later installed from the App Store and opened once (`make setup` cannot do that), with an iOS Simulator runtime. A physical iPhone needs Developer Mode on and, for EAS development builds, its UDID registered (`eas device:create`).
- EAS: see _Accounts_ below.
- A physical iPhone and an Android phone for anything about push, links, background behaviour or the keychain; simulators do not establish them.

### Accounts

What each way of running the app needs:

| You want to                                                           | Expo account | Apple Developer Program ($99/year)                                              | Google Play Console ($25 once) | Mac with Xcode       |
| --------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- | ------------------------------ | -------------------- |
| `make dev-web` in a browser                                           | no           | no                                                                              | no                             | no                   |
| `make dev-android` / `make dev-device-android`, built on this machine | no           | no                                                                              | no                             | no                   |
| `make dev-ios` / `make dev-device-ios`, built on this machine         | no           | free Apple ID on your own iPhone, re-signed every 7 days; the program otherwise | no                             | **yes**              |
| `make build-dev-android`, built by EAS, installed from a link         | **yes**      | no                                                                              | no                             | no                   |
| `make build-dev-simulator`, built by EAS                              | **yes**      | no                                                                              | no                             | to run the Simulator |
| `make build-dev-ios`, built by EAS for a real iPhone                  | **yes**      | **yes** (the iPhone registered with `eas device:create`)                        | no                             | no                   |
| `make build-preview` / `build-staging`                                | **yes**      | **yes** for iOS                                                                 | for the staging track          | no                   |
| `make publish-ios` / `publish-android`                                | **yes**      | **yes**                                                                         | **yes**                        | no                   |

- **Expo account**: free at expo.dev. The free plan gives a limited number of cloud builds a month in a slower queue; paid plans give more and faster ones (see expo.dev/pricing). Then `eas login`.
- **This project on Expo**: [`@datalayer/datalayer`](https://expo.dev/accounts/datalayer/projects/datalayer). `app.config.ts` names its owner (`datalayer`), slug and project id (`extra.eas.projectId`), so a cloud build needs your Expo account to be a member of the `datalayer` account; `eas init` is not needed. `npx eas-cli project:info` shows the project.
- **Signing**: EAS keeps the signing credentials; nothing is committed here. The first store versions were built locally (Xcode and Android Studio), so a store build from EAS needs the Android **upload key** those versions were signed with uploaded to EAS (`eas credentials --platform android`), or Play App Signing's upload key reset to one EAS holds; EAS must never generate a new keystore for `ai.datalayer.mobile`: the workflows build with `--freeze-credentials`, and a keystore EAS generated for it before that (the first staging build, 19 October 2026) is replaced by the upload key, never used for Play. On iOS, `eas credentials --platform ios` (signed in with the Apple account) creates or reuses the distribution certificate and provisioning profile. Development and preview builds (`.dev`, `.preview`) are other apps and may use keystores EAS generates.
- **Without any account**: a plugged Android phone (`make dev-device-android`) or the browser (`make dev-web`).

### Dev mode

The first time, and after every native change, build and install the development build; then only Metro runs. `make help` lists every target; the `npm run` scripts underneath are shown here.

```bash
cp .env.example .env            # done by every dev and start target when .env is missing

make dev-simulator              # no phone: Android Emulator on Linux, iOS Simulator on macOS
make dev-android                # boot the first emulator (or AVD=<name>), build the dev app on it, start Metro
make dev-ios                    # boot the Simulator (SIMULATOR="iPhone 16"), build the dev app on it, start Metro (macOS)
make dev-device-android         # same, on a plugged Android phone with USB debugging on
make dev-device-ios             # same, on a plugged iPhone with Developer Mode on (macOS)
make dev-web                    # in a browser, no emulator or phone (see Web preview)

make start                      # Metro only, for a development build already installed
npm run start:clear             # Metro with its cache cleared
make start-tunnel               # Metro over a tunnel, for a phone that cannot reach this machine
```

#### Simulator-only development, without a phone

On Linux, the supported native loop is the Android Emulator. On macOS it is
the iOS Simulator. One target selects the available platform:

```bash
make setup                                      # first time: SDK, emulator and default virtual device
make dev-simulator                              # build, install and start Metro
make dev-simulator AVD=Pixel_8_API_36           # Linux: choose an Android virtual device
make dev-simulator SIMULATOR="iPhone 16 Pro"    # macOS: choose an iOS Simulator
```

No Expo, Apple or Google account and no physical phone are needed for this
local development loop. On Linux, `make setup` creates an Android virtual
device and `make dev-simulator` checks `/dev/kvm`, boots it, installs the
development build and starts Metro. On macOS the same target boots the named
iOS Simulator and builds with local Xcode. The first native build takes the
longest; while it remains installed, `make start` is enough for TypeScript and
asset changes. Re-run `make dev-simulator` after changing a native dependency,
config plugin, identifier, permission or scheme.

The simulator is suitable for screens, navigation, API contracts, streaming,
approval races and the automated Maestro journeys. It is not release evidence
for APNs/FCM delivery, secure hardware/keychain behavior, background networking,
VoiceOver/TalkBack on representative phones, thermals or device memory. Those
physical-device gates remain open release gates.

Every `dev:*` and `start*` script sets `APP_VARIANT=development`, so the app installs as _Datalayer Dev_ (`ai.datalayer.mobile.dev`, scheme `datalayer-dev`) beside a store build. Once Metro is up, press `a` or `i` to open the installed development build, `r` to reload, `j` to open the debugger, `m` for the dev menu. Shake the phone (or `Cmd+D` / `Cmd+M` in a simulator) for the same menu on the device.

Against a local server: set `EXPO_PUBLIC_DATALAYER_RUN_URL=http://localhost:8080` and `EXPO_PUBLIC_DATALAYER_RUNTIMES_URL` to the same or the local runtimes plane (and `EXPO_PUBLIC_DATALAYER_MCP_URL` to the local MCP gateway) for the iOS Simulator or `http://10.0.2.2:8080` for the Android emulator; a phone needs an HTTPS URL or `npm run start:tunnel` plus a tunnel to the server. `EXPO_PUBLIC_*` values are read when Metro starts: restart it after changing `.env`.

Without a local native toolchain, make the development build in the cloud and install it from the link:

```bash
make build-dev-android          # eas build --profile development
make build-dev-ios              # registered iPhones (eas device:create first)
make build-dev-simulator        # iOS Simulator
make start                      # then connect the installed build to Metro
```

`npm run prebuild` regenerates the `ios/` and `android/` folders (ignored by git) when a plugin or identifier changes; `run:*` does it on its own when they are missing.

The iOS targets need macOS and Xcode; elsewhere they stop and point to `make build-dev-ios` or the web preview. The Android emulator needs hardware virtualization (`/dev/kvm` on Linux); when the firmware has it off, `make dev-android` says so.

### Web preview

With neither an emulator nor a phone, `make dev-web` runs the app in a browser at http://localhost:8081, for screens and logic. It is a development aid, not a target: the app ships on iOS and Android only.

- The token is kept in the tab's session storage (`src/storage/deviceStore.web.ts`) and gone when the tab closes; on a phone it is in the keychain/keystore.
- No live updates: a browser WebSocket cannot send the `Authorization` header and the token is never put in a URL, so lists refresh by pull.
- Controls are `@expo/ui`'s web versions, not SwiftUI or Compose; no push, no deep links, no biometrics.
- The services must allow the `http://localhost:8081` origin (CORS); `prod1.datalayer.run` does.

Browser globals and React DOM stay out of the native code: the import gate refuses them everywhere except `*.web.ts` files, which Metro loads only for the web preview.

### Loops

1. **Local native toolchain**: `npm run dev:android` or `dev:ios` once, then `npm start` and fast refresh for TypeScript and assets.
2. **Shared EAS development client**: `npm run build:dev:*`, installed from the build link and connected to a local Metro.
3. **EAS build failure reproduced locally**: `eas build --platform android|ios --profile <profile> --local`.
4. **Pull request**: `npm run check`, then `npm run export`; `e2e` builds for Maestro when that suite exists.

Rebuild the development build (`npm run prebuild`, then `dev:*` or an EAS build) whenever a native dependency, a config plugin, an identifier, a permission or a scheme changes. Everything else is a Metro refresh.

### Environments

`EXPO_PUBLIC_DATALAYER_RUN_URL` names the control plane (IAM, the spaces, telemetry; production `https://prod1.datalayer.run`) and `EXPO_PUBLIC_DATALAYER_RUNTIMES_URL` the runtimes plane (ai-agents, runtimes, the scheduler, contents, inference and the ai-agents WebSocket; production `https://r1.datalayer.run`), as Core's `config/planes` places each service — neither host serves the other's routes ([`docs/contracts.md`](docs/contracts.md)); both HTTPS except for `localhost`, `127.0.0.1` and `10.0.2.2` (the Android emulator's host). `EXPO_PUBLIC_DATALAYER_MCP_URL` names the MCP gateway, which is published on its own host (production `https://mcp.datalayer.run`; a trailing `/mcp` is accepted): the protocol audit, a sign-in under way and Direct Conversations are read there. All three are required, with the same HTTPS rule; a build without any of them is refused at start. A phone reaches a local server only through an HTTPS development URL or a tunnel. `EXPO_PUBLIC_BUILD_PROFILE` is one of `development`, `development-simulator`, `e2e`, `preview`, `staging`, `production`; it decides whether the interim sign-in is offered.

Development, `e2e` and `preview` builds sign in with a handle and password or a Datalayer API token; store builds will sign in with Datalayer through the system browser.

## Check

```bash
npm run check            # typecheck, lint, forbidden imports, tests
npm run test:watch       # tests while editing
npm run check:imports    # no Jupyter, JupyterLab, Lumino, React DOM, Primer web or browser global
npm run check:bundle     # the same, on what Metro resolved into the iOS and Android bundles (source maps)
npm run doctor           # Expo Doctor: a job of Check in CI, outside the monorepo (below)
npm run export           # both bundles into dist/, to prove the Metro graph resolves
```

Expo Doctor runs in CI (the `doctor` job of Check: a failure turns Check red), where the
repository installs on its own: there `package.json`'s `overrides` hold every
dependency's `react` and `react-dom` to the app's own (Core, Agent Runtimes,
Jupyter UI and Loro depend on 19.2.8 exactly, the Jupyter packages on 18.3.1),
so the app has one React, and all 21 checks pass (online ones included). Inside
the monorepo, npm ignores a member's `overrides` and the root keeps the web's
React beside Expo's: `metro.config.js` and Jest's `moduleNameMapper` hold the
app's own, and Doctor there reports that duplicate; read CI's run instead.

### Maestro smoke flows

`.maestro/` holds the smoke flows — sign-in, an approval answered
elsewhere while it is open, the route a tapped notification opens, a prompt
streamed and stopped, and pause/reset with a second account refused. CI runs
them (`e2e-android` on every run, `e2e-ios` on main, on `macos-15`) on an `e2e`
build it makes itself: `expo prebuild`, then Gradle or `xcodebuild`; nothing is
built on a laptop. Maestro may run the five flows in any order on the one
shared emulator or simulator, so every flow prepares authentication itself;
that setup accepts an existing authenticated E2E session because the iOS
keychain can outlive cleared app state. They act as a test account on the r1 runtimes plane and need
the repository secrets `DATALAYER_MOBILE_E2E_TOKEN` (the test account's API token) and
`DATALAYER_MOBILE_E2E_SECOND_TOKEN` (a second account's), and the secrets
`DATALAYER_MOBILE_E2E_CHAT_APP` (an application of the test account kept running; the
prompt flow makes two model requests) and `DATALAYER_MOBILE_E2E_LIFECYCLE_APP` (one the
flow pauses and resumes). Without them the jobs stop after the build and say
which is missing.

## Build

`eas.json` has six profiles: `development`, `development-simulator`, `e2e`, `preview`, `staging` and `production`. `APP_VARIANT` gives development and preview builds their own name and identifier (`ai.datalayer.mobile.dev`, `.preview`) so they install beside the store app.

## Publish

One promotion pipeline, from a committed and checked state to the stores. The Makefile runs it: `make build-preview`, `make build-staging` and `make submit-staging` for the rings before release; `make publish-ios`, `make publish-android` or `make publish` for the stores. `publish-*` refuse a dirty or unpushed tree, run `make check`, build with EAS and submit the artifact (`--auto-submit`); the console steps that follow are the release owner's.

In CI, a release is a tag. Set `version` in `app.config.ts`, commit, then tag and push it:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

`.github/workflows/release.yaml` checks that the tag names that version, runs `npm run check` and `npm run check:bundle`, has EAS build the `.ipa` and `.aab` and submit them (TestFlight, Google Play internal track as a draft), and creates the GitHub release with the build ids. It needs the repository secret `EXPO_TOKEN` (an Expo robot token) and the signing and submit credentials kept in EAS (`eas credentials`: the App Store Connect API key, the Google Play service account). `.github/workflows/eas-build.yaml` is started by hand (Actions → *EAS build* → *Run workflow*): a `preview` or `staging` build of a commit whose Check is green, and for `staging` optionally its submission to TestFlight and the Play internal track (as a draft); it never runs on a push. `.github/workflows/check.yaml` runs the checks on every pull request and push to `main`. A failed job turns Check red; it does not block merging, as `main` has no branch protection yet (a repository administrator may require the Check jobs). A release does require it: `release.yaml` refuses a tag whose commit's Check run is not green, every job included. The repository commits no lockfile; `release.yaml` keeps the `package-lock.json` its install resolved as the `release-lockfile` artifact and writes its checksum into the GitHub release. It pins the EAS CLI (`eas-version`); raise it deliberately.

### What is needed to publish

Development happens on Linux. That is enough to create and submit both store
artifacts with EAS: the iOS build runs on EAS's macOS workers, and EAS Submit
works from Linux. Local iOS builds, Simulator runs, Xcode archives and the
Transporter fallback still require macOS. Store publication does not replace
testing on physical iOS and Android phones; those release gates are currently
postponed until the devices and testers are available.

Common preparation:

1. The Expo project is `@datalayer/datalayer`; its id is in
   `app.config.ts`. Give a primary and recovery owner access to the
   `datalayer` Expo account and
   keep a least-privilege robot `EXPO_TOKEN` in GitHub Actions.
2. Keep the final application identity: **Datalayer**, Expo slug
   `datalayer` (the Expo project's name only), iOS bundle id and Android package
   `ai.datalayer.mobile`. Store identifiers cannot be casually replaced after
   publication.
3. Complete [`docs/store-listing.md`](docs/store-listing.md) and verify every
   answer against the release binary and the live store forms. Supply current
   icons, phone/tablet screenshots, description, category, support and privacy
   contacts, privacy policy, account-deletion URL and a review account that
   contains no customer data.
4. Name the release, incident and recovery owners in the private release
   register. Keep signing keys, API keys, service-account JSON and tester
   credentials out of Git. Run the credential-recovery drill before tagging.
5. Obtain the postponed physical-device evidence (streaming, push delivery,
   accessibility services, performance) before any external rollout. Simulator CI is useful evidence, but is
   not evidence for APNs/FCM delivery, keychain/keystore behavior, background
   networking, accessibility services, thermal behavior or device memory.

Apple App Store:

1. Enrol the organization in the [Apple Developer
   Program](https://developer.apple.com/programs/) and accept the current
   agreements. In Certificates, Identifiers & Profiles, register
   `ai.datalayer.mobile` and its associated-domain and push capabilities.
2. In [App Store Connect](https://appstoreconnect.apple.com/), create the app
   record before the first upload, assign least-privilege Account Holder/Admin,
   App Manager and Developer roles, and complete any applicable agreements,
   tax and banking setup.
3. Let `eas credentials --platform ios` manage the distribution certificate,
   provisioning profile and APNs key. Add an App Store Connect API key to EAS
   for non-interactive submission; keep a recovery owner for every credential.
   `eas.json` names the App Store Connect app id and the Apple Team id for
   submission (`submit.staging.ios`, `submit.production.ios`); until they are
   filled in, `ASC_APP_ID_PLACEHOLDER` and `APPLE_TEAM_ID_PLACEHOLDER` stand
   there and an iOS submission must not be started.
4. Complete the product page, age rating, App Privacy, accessibility,
   encryption/export, content-rights, sign-in and account-deletion answers.
   Put working demo credentials and the exact review journey in App Review
   Information. The draft answers live in `docs/store-listing.md`.
5. Build and submit the production `.ipa`, wait for processing, exercise that
   exact build with internal TestFlight and then any required external Beta App
   Review. Select the tested build in the version record, add it for review,
   submit it, and use manual or phased release only after the release gate.

Google Play:

1. Register and verify the organization in [Play
   Console](https://play.google.com/console/), accept the Developer
   Distribution Agreement and pay the registration fee. Create the app with
   package `ai.datalayer.mobile`, accept Play App Signing and keep the package
   name and signing ownership in the private register.
2. Create a least-privilege Google service account for this app, link it in
   Play Console and upload its JSON key to EAS with
   `eas credentials --platform android`. EAS stores the submit key; it is never
   committed. Confirm the upload keystore and Play App Signing recovery path.
3. Complete the main store listing and App content: contact details, privacy
   policy, Data safety, ads, content rating, target audience, app access and
   review credentials, account deletion and every declaration currently shown
   by Play Console. Confirm the release meets the live target-API requirement.
4. Build a production `.aab` (not the preview APK) and submit it as a draft to
   internal testing. Test the exact bundle, then meet any closed-testing or
   production-access requirement Play Console shows for this organization and
   account type. Promote the same artifact through a staged production rollout.

The store consoles and policies change. At every submission, reconcile this
runbook with the live [App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow),
[Apple submission steps](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app),
[Google app setup](https://support.google.com/googleplay/android-developer/answer/9859152),
[Google review declarations](https://support.google.com/googleplay/android-developer/answer/9859455),
and [EAS Submit](https://docs.expo.dev/deploy/submit-to-app-stores/).

### Environments and credentials

The names below are the interface between Git, EAS and the stores. Values and
credential files never belong in the repository.

| Profile                                       | EAS environment                                                                                                            | Non-secret configuration                                                                                                                                           | Credential source                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `development`, `development-simulator`, `e2e` | `development`                                                                                                              | `EXPO_PUBLIC_DATALAYER_RUN_URL`, `EXPO_PUBLIC_DATALAYER_RUNTIMES_URL`, `EXPO_PUBLIC_DATALAYER_MCP_URL` from `.env`; profile and variant come from `eas.json` | EAS development signing credentials                |
| `preview`                                     | `preview`                                                                                                                  | `EXPO_PUBLIC_DATALAYER_RUN_URL`, `EXPO_PUBLIC_DATALAYER_RUNTIMES_URL`, `EXPO_PUBLIC_DATALAYER_MCP_URL` (production services, in `eas.json`)                       | EAS internal-distribution credentials              |
| `staging`                                     | `preview` (Expo's built-in environment, shared with the `preview` profile)                                                  | `EXPO_PUBLIC_DATALAYER_RUN_URL`, `EXPO_PUBLIC_DATALAYER_RUNTIMES_URL` and `EXPO_PUBLIC_DATALAYER_MCP_URL` (production services, in `eas.json`)                     | The production app's EAS/store signing credentials |
| `production`                                  | `production`                                                                                                               | production `EXPO_PUBLIC_DATALAYER_RUN_URL`, `EXPO_PUBLIC_DATALAYER_RUNTIMES_URL` and `EXPO_PUBLIC_DATALAYER_MCP_URL` (in `eas.json`)                              | The production app's EAS/store signing credentials |
| GitHub `release.yaml`, `eas-build.yaml`       | repository Actions secrets                                                                                                 | none                                                                                                                                                               | `EXPO_TOKEN`, scoped to the Datalayer Expo project |

EAS owns the iOS distribution/provisioning material and Android keystore.
EAS Submit owns the App Store Connect API key and Google Play service-account
JSON. APNs and FCM credentials are configured in the same Datalayer-owned
project. Named primary and recovery owners are recorded outside Git according
to [`docs/release-prerequisites.md`](docs/release-prerequisites.md).

```text
commit → npm run check → preview build → staging (TestFlight, Play internal)
       → release candidate approved → production build → EAS Submit → store review → staged release
```

Before any store build:

- `version` in `app.config.ts` is the user-facing version; Android `versionCode` and iOS `buildNumber` are managed by EAS (`appVersionSource: remote`, `autoIncrement` on `staging` and `production`) and only ever increase. The first store versions were built locally, outside EAS: before the first EAS store build, set EAS's numbers to the highest ones already uploaded to each store (`eas build:version:set --platform android` and `--platform ios`, read from Play Console → *App bundle explorer* and App Store Connect → *TestFlight*), so the next build is above them.
- The build is made from a clean, pushed commit by EAS, never from a working tree. Record the commit, the EAS build id, the runtime version and the lockfile the release resolved (the `release-lockfile` artifact and its checksum; no lockfile is committed).
- Signing and submit credentials live in EAS and the platform consoles, with named owners. Nothing is committed here.
- Store listing, screenshots, privacy and data-safety answers, support and privacy-policy URLs, the account-deletion route and a review account without real customer data are current.
- No over-the-air updates in v1: `updates.enabled` is `false` in `app.config.ts` for every build, and no profile has an update channel. The app changes only through a new store version, reviewed by Apple and Google. `expo-updates` stays installed and disabled; turning updates on later takes a configuration change, channels and a store release that carries them.

Apple (`make publish-ios`):

1. `eas build --platform ios --profile production --auto-submit` produces the store `.ipa` and uploads it to App Store Connect.
2. Internal TestFlight testers first, external testers after Beta App Review when needed.
3. Complete App Privacy, export compliance, sign-in and account-deletion answers as Apple requires on the submission date.
4. Select the tested build for App Review. Release manually or phased; keep the minimum-version kill switch (below) ready to stop a defective client.

Google (`make publish-android`):

1. `eas build --platform android --profile production --auto-submit` produces the `.aab` (an APK is never the store artifact) and uploads it as a draft to the internal track with the least-privilege service account.
2. Internal testing track first, then closed testing as needed. Complete Data safety, content rating, target audience, app access and target-API requirements.
3. Promote the tested artifact to production with a staged rollout; monitor each ring and halt on auth, approval, push or crash regression.

`staging` is a store track of the production application, with the same signing and entitlements, pointed at staging services; it is not a differently signed approximation. The release owner does the final console review, chooses the rollout and records the store version URLs and review result. Manual upload with Transporter or the Play Console is the documented recovery path, with the same artifact.

### Release-owner checklist

Before tagging:

- confirm the release commit is reviewed, clean, pushed and green in CI;
- run `npm run check` and `npm run check:bundle`, and see the release commit's Check green (`release.yaml` refuses the tag otherwise), its `doctor` and `manifests` jobs included (`manifests` holds the generated privacy manifest, `Info.plist` and merged Android permissions to `docs/privacy-and-store.md`; its `release-manifests` artifact goes to the release record);
- bump `version`, verify the remote iOS build number and Android version code will increase;
- verify staging against the same backend contract and run the sign-in, approval race/stale state, notification tap, stream/stop and pause/reset smoke journeys;
- verify store copy, screenshots, privacy/data-safety answers, support/privacy/deletion links and the non-customer review account;
- nominate the release owner, incident owner and explicit go/no-go approver.

After the workflow submits:

- compare EAS build ids and checksums with the GitHub release and select only those artifacts in the consoles;
- pass TestFlight/internal and required external/closed testing before review;
- start the phased/staged rollout, watch auth, push, approval, crash and stream health, and record the checkpoints;
- close the release record only after the store URLs, review results and rollback evidence are attached.

### The minimum-version kill switch

IAM serves the oldest version of the app still supported on each platform at
`GET /api/iam/v1/oauth/clients/datalayer-mobile/minimum-version.json`
(`{"success": true, "minimum": {"ios": "1.2.0", "android": "1.2.0"}}`, public,
cached for a minute). The app reads it at launch and every time it comes back
to the foreground (`src/release/`). Below its platform's minimum it stops at
_Update Datalayer_, naming the version to install; an answer it cannot read — a
503, a missing or malformed version, no network — stops it at _Datalayer could
not be reached_ with _Try again_: an unreadable switch is never taken as off.

To stop an unsafe installed binary, the release owner raises the minimum in the
control plane's rc and redeploys IAM (the values go through `up.sh`, never by
hand into the cluster):

```bash
export DATALAYER_MOBILE_MINIMUM_VERSION_IOS=1.2.0
export DATALAYER_MOBILE_MINIMUM_VERSION_ANDROID=1.2.0
p reup datalayer-iam
```

Both are `major.minor.patch`, as `version` in `app.config.ts`; unset, `up.sh`
serves `0.0.1`. Raise them only once the fixed build is live in both stores,
or people are left with nothing to update to.

### Halt, rollback and recovery

Halt a rollout for wrong-account data, incomplete or stale approval context,
an authorization bypass, credential leakage, unusable sign-in, elevated crash
rate or material push/stream failure. Stop the phased/staged rollout in both
store consoles, disable the affected server capability and raise the minimum-supported-version
policy (the kill switch above) when an installed binary is unsafe.

There are no over-the-air updates to roll back to: every fix is a new,
incremented store binary.
If EAS Submit fails after a successful build, download that exact artifact
from EAS and upload the `.ipa` with Transporter or the `.aab` in Play Console;
do not rebuild it. If signing or submission credentials fail, stop, rotate or
recover them with their recovery owner, then retry the same recorded commit.

Every release record contains: version and tag; commit and lockfile checksum;
release/go-no-go/incident owners; EAS project, build and submit ids; iOS build
number and Android version code; artifact checksums; backend environment and
contract versions; test evidence; store review ids/results/URLs; rollout
percentages and timestamps; metrics and incidents; halt/rollback decisions;
and final completion time. A second person must be able to perform a staging
release from this section alone before this runbook is considered verified.
