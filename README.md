[![Datalayer](https://images.datalayer.io/legacy/datalayer-25.svg)](https://datalayer.ai)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# ☰ 📱 Datalayer Mobile

The running agents and LOOP applications of Datalayer, in your pocket: what needs you, the approvals to read in full before deciding, and the conversations to continue. Expo (SDK 57) and React Native, iOS and Android. The plan is `landings/datalayer/ui/plans/MOBILE.md`.

## Develop

The package is a workspace of the monorepo: install from the monorepo root (`npm install` in `src/`), never here. It pins `react` and the native modules (`react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`) to the versions Expo SDK 57 links, which npm keeps under this package's `node_modules` when the workspace holds newer ones; `metro.config.js` resolves them from there. `expo-doctor` reports those as duplicates: that is the monorepo, not a defect, as long as the versions under this package are the ones `expo install --check` expects.

Expo Go is not supported: sign-in storage, notifications, links and the native controls of `@expo/ui` need a development build.

### Prerequisites

`make setup` installs what is missing and keeps what is there: a JDK 17 as the system Java (`openjdk-17-jdk` with apt on Ubuntu, replacing an older one; Homebrew on macOS), the Android command-line tools under `ANDROID_HOME` (`~/Android/Sdk` by default), `platform-tools` (adb), SDK platform 36 with build-tools 36.0.0 and the NDK React Native 0.86 wants, the emulator with one Pixel 8 API 36 virtual device, EAS CLI, and on macOS the Xcode Command Line Tools and CocoaPods. It ends by printing the `export` lines (`ANDROID_HOME`, `PATH`) to add to your shell profile; the Makefile sets them for its own targets, so `make dev-android` works before that. `make tools` shows what is found.

- Node 20.19, 22.13 or 24.3 and later (`engines` in `package.json`); npm 10.
- Android: what `make setup` installs, or Android Studio with the same SDK components. A device needs USB debugging on.
- iOS (macOS only): Xcode 16 or later installed from the App Store and opened once (`make setup` cannot do that), with an iOS Simulator runtime. A physical iPhone needs Developer Mode on and, for EAS development builds, its UDID registered (`eas device:create`).
- EAS: see *Accounts* below.
- A physical iPhone and an Android phone for anything about push, links, background behaviour or the keychain; simulators do not establish them.

### Accounts

What each way of running the app needs:

| You want to | Expo account | Apple Developer Program ($99/year) | Google Play Console ($25 once) | Mac with Xcode |
|---|---|---|---|---|
| `make dev-web` in a browser | no | no | no | no |
| `make dev-android` / `make dev-device-android`, built on this machine | no | no | no | no |
| `make dev-ios` / `make dev-device-ios`, built on this machine | no | free Apple ID on your own iPhone, re-signed every 7 days; the program otherwise | no | **yes** |
| `make build-dev-android`, built by EAS, installed from a link | **yes** | no | no | no |
| `make build-dev-simulator`, built by EAS | **yes** | no | no | to run the Simulator |
| `make build-dev-ios`, built by EAS for a real iPhone | **yes** | **yes** (the iPhone registered with `eas device:create`) | no | no |
| `make build-preview` / `build-staging` | **yes** | **yes** for iOS | for the staging track | no |
| `make publish-ios` / `publish-android` | **yes** | **yes** | **yes** | no |

- **Expo account**: free at expo.dev. The free plan gives a limited number of cloud builds a month in a slower queue; paid plans give more and faster ones (see expo.dev/pricing). Then `eas login`.
- **This project on Expo**: `app.config.ts` names the owner `datalayer`, so your account must be a member of the Datalayer organization on Expo, or build under your own account with `EXPO_OWNER=<your-username>`. Run `eas init` once; it creates the project and gives its id, which `app.config.ts` reads from `EAS_PROJECT_ID` (put it in `.env`).
- **Signing**: EAS creates and keeps the Android keystore and, with an Apple Developer account, the iOS certificates and profiles. Nothing is committed here.
- **Without any account**: a plugged Android phone (`make dev-device-android`) or the browser (`make dev-web`).

### Dev mode

The first time, and after every native change, build and install the development build; then only Metro runs. `make help` lists every target; the `npm run` scripts underneath are shown here.

```bash
cp .env.example .env            # EXPO_PUBLIC_DATALAYER_RUN_URL, EXPO_PUBLIC_BUILD_PROFILE=development

make dev-android                # boot the first emulator (or AVD=<name>), build the dev app on it, start Metro
make dev-ios                    # boot the Simulator (SIMULATOR="iPhone 16"), build the dev app on it, start Metro (macOS)
make dev-device-android         # same, on a plugged Android phone with USB debugging on
make dev-device-ios             # same, on a plugged iPhone with Developer Mode on (macOS)
make dev-web                    # in a browser, no emulator or phone (see Web preview)

make start                      # Metro only, for a development build already installed
npm run start:clear             # Metro with its cache cleared
make start-tunnel               # Metro over a tunnel, for a phone that cannot reach this machine
```

Every `dev:*` and `start*` script sets `APP_VARIANT=development`, so the app installs as *Datalayer Dev* (`ai.datalayer.mobile.dev`, scheme `datalayer-dev`) beside a store build. Once Metro is up, press `a` or `i` to open the installed development build, `r` to reload, `j` to open the debugger, `m` for the dev menu. Shake the phone (or `Cmd+D` / `Cmd+M` in a simulator) for the same menu on the device.

Against a local server: set `EXPO_PUBLIC_DATALAYER_RUN_URL=http://localhost:8080` for the iOS Simulator or `http://10.0.2.2:8080` for the Android emulator; a phone needs an HTTPS URL or `npm run start:tunnel` plus a tunnel to the server. `EXPO_PUBLIC_*` values are read when Metro starts: restart it after changing `.env`.

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

`EXPO_PUBLIC_DATALAYER_RUN_URL` names the services, HTTPS except for `localhost`, `127.0.0.1` and `10.0.2.2` (the Android emulator's host). A phone reaches a local server only through an HTTPS development URL or a tunnel. `EXPO_PUBLIC_BUILD_PROFILE` is one of `development`, `development-simulator`, `e2e`, `preview`, `staging`, `production`; it decides whether the interim sign-in is offered.

Development, `e2e` and `preview` builds sign in with a handle and password or a Datalayer API token; store builds will sign in with Datalayer through the system browser.

## Check

```bash
npm run check            # typecheck, lint, forbidden imports, tests
npm run test:watch       # tests while editing
npm run check:imports    # no Jupyter, JupyterLab, Lumino, React DOM, Primer web or browser global
npm run doctor           # expo-doctor
npm run export           # both bundles into dist/, to prove the Metro graph resolves
```

## Build

`eas.json` has six profiles: `development`, `development-simulator`, `e2e`, `preview`, `staging` and `production`. `APP_VARIANT` gives development and preview builds their own name and identifier (`ai.datalayer.mobile.dev`, `.preview`) so they install beside the store app.

## Publish

One promotion pipeline, from a committed and checked state to the stores. The Makefile runs it: `make build-preview`, `make build-staging` and `make submit-staging` for the rings before release; `make publish-ios`, `make publish-android` or `make publish` for the stores. `publish-*` refuse a dirty or unpushed tree, run `make check`, build with EAS and submit the artifact (`--auto-submit`); the console steps that follow are the release owner's.

```text
commit → npm run check → preview build → staging (TestFlight, Play internal)
       → release candidate approved → production build → EAS Submit → store review → staged release
```

Before any store build:

- `version` in `app.config.ts` is the user-facing version; Android `versionCode` and iOS `buildNumber` are managed by EAS (`appVersionSource: remote`) and only ever increase.
- The build is made from a clean, pushed commit by EAS, never from a working tree. Record the commit, the EAS build id, the runtime version and the lockfile.
- Signing and submit credentials live in EAS and the platform consoles, with named owners. Nothing is committed here.
- Store listing, screenshots, privacy and data-safety answers, support and privacy-policy URLs, the account-deletion route and a review account without real customer data are current.
- No over-the-air update reaches `production` before the same update was verified on `staging` on the same runtime; a native, permission or config change always means a new store binary.

Apple (`make publish-ios`):

1. `eas build --platform ios --profile production --auto-submit` produces the store `.ipa` and uploads it to App Store Connect.
2. Internal TestFlight testers first, external testers after Beta App Review when needed.
3. Complete App Privacy, export compliance, sign-in and account-deletion answers as Apple requires on the submission date.
4. Select the tested build for App Review. Release manually or phased; keep the server-side minimum-version switch ready to stop a defective client.

Google (`make publish-android`):

1. `eas build --platform android --profile production --auto-submit` produces the `.aab` (an APK is never the store artifact) and uploads it as a draft to the internal track with the least-privilege service account.
2. Internal testing track first, then closed testing as needed. Complete Data safety, content rating, target audience, app access and target-API requirements.
3. Promote the tested artifact to production with a staged rollout; monitor each ring and halt on auth, approval, push or crash regression.

`staging` is a store track of the production application, with the same signing and entitlements, pointed at staging services; it is not a differently signed approximation. The release owner does the final console review, chooses the rollout and records the store version URLs and review result. Manual upload with Transporter or the Play Console is the documented recovery path, with the same artifact.
