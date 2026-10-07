[![Datalayer](https://images.datalayer.io/legacy/datalayer-25.svg)](https://datalayer.ai)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# ☰ 📱 Datalayer Mobile

The running agents and LOOP applications of Datalayer, in your pocket: what needs you, the approvals to read in full before deciding, and the conversations to continue. Expo (SDK 57) and React Native, iOS and Android. The plan is `landings/datalayer/ui/plans/MOBILE.md`.

## Develop

The package is a workspace of the monorepo: install from the monorepo root (`npm install` in `src/`), never here. It pins `react` to the version React Native's renderer is built with, which npm keeps under this package's `node_modules`; `metro.config.js` resolves React and React Native from there.

Expo Go is not supported: sign-in storage, notifications and links need a development build.

```bash
cp .env.example .env            # EXPO_PUBLIC_DATALAYER_RUN_URL, EXPO_PUBLIC_BUILD_PROFILE
APP_VARIANT=development npx expo run:android   # or run:ios on macOS
npm start                       # Metro, for the installed development build
```

Development, `e2e` and `preview` builds sign in with a handle and password or a Datalayer API token; store builds will sign in with Datalayer through the system browser.

## Check

```bash
npm run check            # typecheck, lint, forbidden imports, tests
npm run check:imports    # no Jupyter, JupyterLab, Lumino, React DOM, Primer web or browser global
npm run doctor           # expo-doctor
```

## Build

`eas.json` has six profiles: `development`, `development-simulator`, `e2e`, `preview`, `staging` and `production`. `APP_VARIANT` gives development and preview builds their own name and identifier (`ai.datalayer.mobile.dev`, `.preview`) so they install beside the store app.
