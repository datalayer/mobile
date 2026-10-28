# Store listing and review answers

What the App Store Connect and Google Play Console records of Datalayer
say, drafted from the app as it is. The records, the ownership of the app, the
signing and submit credentials, the review account and the screenshots are the
account holders'.
Read Apple's and Google's live requirements again on the day of submission and
correct this file with what changed. Privacy and Data safety answers are in
[`privacy-and-store.md`](privacy-and-store.md). The process is in the README's
*Publish* section.

Drafted 16 October 2026. On 19 October 2026 the app's name became **Datalayer**, on the phone and in both stores, which is what the store records were already titled, so no listing is renamed. **28 October 2026:** the app was tested on a real Android phone and goes to production on Google Play; the section below is the console's own order, with the value to type in each field. iOS stays off (the Apple answers remain drafts).

## Google Play Console — the values to fill (28 October 2026)

The app `ai.datalayer.mobile` is already in Play Console, on the **internal testing** track as a completed release (v0.0.3, submitted by the tag `v0.0.3` on 26 October 2026). Going to production is: fill every field below, then promote the internal release to Production and send it for review. The fields are listed as the console groups them; *where* is the console's path.

### Dashboard → Set up your app

| Field | Value |
|---|---|
| App name | `Datalayer` |
| Default language | English (United States) — `en-US` |
| App or game | App |
| Free or paid | Free (there is nothing to buy in the app) |

### Grow users → Store presence → Main store listing

| Field | Value |
|---|---|
| App name (30) | `Datalayer` |
| Short description (80) | `Answer your agents' approvals and follow your applications from your phone.` (75 characters; the earlier wording with *running* was 83, over the limit) |
| Full description (4,000) | The plain text in *Full description* right below this table (2,592 characters, written 28 October 2026): paste it whole; the console takes no Markdown, and the block has none |
| App icon (512 × 512 PNG, under 1 MB) | `visuals/app-icon-512.png` — the Datalayer mark on white (the Play icon is square; Google rounds it) |
| Feature graphic (1024 × 500 PNG or JPEG, under 15 MB) | `visuals/feature-graphic-1024x500.png` |
| Phone screenshots (2 to 8; 16:9 or 9:16; 320–3840 px) | The five framed visuals in `visuals/screenshots/` (01-inbox, 02-approval, 03-decide, 04-agents, 05-settings; 1080 × 1920 PNG, under 300 kB each; every side ≥ 1,080 px, so the listing is eligible for promotion). Upload them in that order. Made 28 October 2026 by `scripts/store-visuals.py` from the `store-screenshots` artifact of the Check run of 26 October 2026 (40282980922): a caption on the app's green over the capture, the Agents capture with the e2e account's test application cut out; the sign-in, activity, application and conversation captures were left out (they show the test account's prompts, a development-build line or an error of the test run) |
| 7-inch tablet screenshots (up to 8; 16:9 or 9:16; 320–3,840 px) | The five in `visuals/screenshots/tablet-7/` (1920 × 1080 PNG, landscape): the same captions and captures as the phone's, the words at the left and the phone's screen at the right, since the app is a phone app and a tablet shows it the same (`android.supportsTablet` is not set). Upload in the same order |
| 10-inch tablet screenshots (up to 8; 16:9 or 9:16; 1,080–7,680 px) | The five in `visuals/screenshots/tablet-10/` (2560 × 1440 PNG, landscape), the same five at a larger size |
| Video | None |

#### Full description

Plain text for the console's *Full description* field (2,592 of 4,000 characters). The capitalised lines are the section titles (the console has no headings); every claim is shipped in v0.0.3 — remove any a later release drops.

```text
Datalayer puts the agents and applications you run on Datalayer in your pocket.

Your agents work for you on Datalayer: they read your documents, call tools, talk to the companies and services you connected, and run the applications you built in the Studio. Some of what they do needs your word first. Datalayer asks you on your phone, shows you the whole request, and lets you answer in one tap - wherever you are.

APPROVALS, THE WHOLE REQUEST IN VIEW
When an agent needs your consent - to send an email, run a tool, reach a company in your name - the request lands in your Inbox, oldest first. You see who asks, what it will do, with which arguments, and for which application, before you answer. Approve or Reject, and the agent carries on or stops. Nothing runs on your behalf without you.

YOUR AGENTS AND APPLICATIONS, LIVE
The Agents tab lists the applications and agents you keep running on Datalayer, live or paused, with what each one is doing right now. Open one to read its details, the protocols it may speak, and the conversations it has had.

ACTIVITY, WITH THE TIMES
The Activity tab tells you what each application did, is doing, and has scheduled, with the time of every step - the tools it called, the answers it gave, the approvals it asked for.

CONVERSATIONS YOU CAN FOLLOW AND STOP
Talk to an application or an agent from your phone. Follow its answer as it streams, stop it when you have read enough, and pick a conversation up where you left it. Under every complete answer, Report lets you say when an answer is offensive, harmful, wrong or misleading.

IN YOUR NAME
See the companies and services your applications act for you at, and end that at any time from Settings.

NOTIFICATIONS, OPTIONAL AND PRIVATE
Turn notifications on to hear about a new approval or a finished run. A notification carries no content: tapping it opens the item in the app and reads it again, signed in as you.

YOUR ACCOUNT, YOUR DATA
Datalayer works with a Datalayer account: sign in with your handle or email and password, or continue with GitHub, Google or LinkedIn. Your applications and conversations are private to your account and the people you share them with. You can delete your account from Settings; the request is honored after a 30-day grace period.

Building applications stays on the web, at datalayer.ai: compose agents with tools, data and rules in the Studio, ship them, and follow them from this app.

Datalayer is free to download and contains no ads and no in-app purchases. Learn more at https://datalayer.ai/docs/mobile-app and reach us at support@datalayer.ai.
```

### Grow users → Store presence → Store settings

| Field | Value |
|---|---|
| App category | Productivity |
| Tags | Up to five of Google's: *Productivity*, *Tools*, *Business* |
| Store listing contact details — Email | `support@datalayer.ai` (shown on the store page; the same address the app's error boxes name) |
| Store listing contact details — Phone | Optional; leave empty |
| Store listing contact details — Website | `https://datalayer.ai` |
| External marketing | On (the default: Google may feature the app outside Play) |

### Monitor and improve → Policy and programs → App content

| Declaration | Value |
|---|---|
| Privacy policy | `https://datalayer.ai/privacy` (answers 200 to any request since the website's function change; checked 28 October 2026) |
| Ads | **No**, the app contains no ads |
| App access | **All or some functionality is restricted** → *Add new instructions*: name `Review account`, the review account's username and password (in the console only; see *Review notes* below), and the text of *Review notes* pasted in *Any other instructions* |
| Content ratings | Start the questionnaire: email `support@datalayer.ai`; category **Utility, Productivity, Communication, or Other**; then **No** to every question (violence, sexuality, language, controlled substances, gambling, user-generated content of a sexual nature, user interaction with *does the app allow users to interact or exchange content* **No** — a person's conversations are with their own applications, and sharing is by invitation, not public —, location sharing **No**, personal information **No**, purchases **No**). Expected result: **Everyone** (ESRB), **PEGI 3**, and their equivalents |
| Target audience and content — Target age | **18 and over** only; the app is not designed for children; **No** to *Could your app unintentionally appeal to children* |
| News app | No |
| COVID-19 contact tracing and status apps | No |
| Data safety | Fill the form from `privacy-and-store.md` → *Google Play Data safety answers*. In short: **collects data: Yes**; **encrypted in transit: Yes**; **a way to request deletion: Yes** (`https://datalayer.ai/settings/profile/danger`, and *Settings → Delete account* in the app). Types: *Personal info → User IDs* (collected, required, app functionality and account management); *App activity → App interactions* (collected, required, app functionality) and *Other user-generated content* (collected, optional, app functionality); *Device or other IDs* (collected, optional — only with notifications on — app functionality); *App info and performance → Diagnostics* (collected, required while signed in, app functionality and analytics). Nothing is shared with third parties for their own use (Expo's push service is a service provider acting for Datalayer); nothing is sold; no data is collected for advertising |
| Government apps | No |
| Financial features | None: *My app doesn't provide any financial features* |
| Health | None of the listed health features |
| Advertising ID | **No**, the app does not use the advertising ID (no ads SDK; the generated manifest has no `AD_ID` permission, see `privacy-and-store.md` → *Permissions*) |
| Generative AI: does the app generate content with AI? | **Yes.** How users can report: *Under every complete answer of an application or an agent, **Report** asks why (Offensive or harmful; Wrong or misleading) and sends the report to Datalayer support.* |

### Test and release → Production (when promoting)

| Field | Value |
|---|---|
| Release to promote | The internal testing release of **v0.0.3** (the build tested on the phone, 28 October 2026). If a newer tag was cut since, promote that one |
| Countries / regions | All countries and regions (the app sells nothing; its services run in the EU and are reached from anywhere) |
| Release name | `0.0.3` (the console proposes the version) |
| Release notes (`en-US`) | `Datalayer puts your agents in your pocket: answer the approvals they ask for, follow your running applications and their activity, and talk to them wherever you are.` |
| Rollout | Full rollout (or a staged 20% first, raised to 100% from *Releases overview* once no crash is reported) |
| App signing | Play App Signing is on (the upload key is EAS's; Google holds the app signing key) — nothing to change |
| Target API level | 36 (Android 16), `minSdk` 24 — meets the 2026 requirement for new apps |

### Then

1. *Publishing overview* → **Send for review**. The first review of a new app usually takes a few days; the status is on the Dashboard.
2. If the developer account is a personal one created after November 2023, Production is unlocked only after a closed test of 14 days with 12 testers; the Dashboard says so, and the same release is then promoted to *Closed testing* first.
3. After approval, every later tag reaches internal testing by itself (`release.yaml`), and is promoted to Production the same way; the store listing changes with the app only when *Send for review* is pressed again.


## Identity

| Field | Value | Status |
|---|---|---|
| Name (App Store Connect *Name*, 30 characters at most; Play *App name*, 30 characters at most) | Datalayer | The name on the phone (`app.config.ts`) and in both stores; _Datalayer Dev_ and _Datalayer Preview_ for the side-by-side builds, which are never listed |
| iOS bundle id / Android package | `ai.datalayer.mobile` | Decided in `app.config.ts`; kept once a store record exists |
| Category | Productivity (Apple and Google) | Decided (Google: 28 October 2026) |
| Age rating | 4+ (Apple), Everyone / PEGI 3 (Google, from the questionnaire below) | Google: expected from the questionnaire's answers above |
| Support URL | `https://datalayer.ai/support` | Live for browsers; see the status note below |
| Privacy policy URL | `https://datalayer.ai/privacy` | Live for browsers; see the status note below |
| Account deletion URL | `https://datalayer.ai/settings/profile/danger` (the web's *Delete account*; the app has *Settings → Delete account*) | Live for browsers (IAM 1.1.82 on prod1 since 16 October 2026); see the status note below |
| Marketing URL | `https://datalayer.ai` | Live |

**The URLs' HTTP status (checked 28 October 2026).** `/support`, `/privacy`, `/settings/profile/danger`, `/docs/mobile-app` and `/terms` on datalayer.ai answer **200** to a browser's request and to one with `Accept: */*` alike (on 16 October the CloudFront function answered 404 to the latter; it no longer does), so a store checker that reads the status code passes.

## Words

**Apple subtitle (30 characters at most):** Your agents, in your pocket

**Google short description (80 characters at most):** Answer your agents' approvals and follow your applications from your phone. (75 characters; the earlier wording, with *running*, was 83 and over the limit)

**Apple promotional text (170 characters at most):** Approve or reject what your Datalayer agents ask, the whole request in view. Follow your applications' activity, and talk to them, wherever you are.

**Apple keywords (100 characters at most):** agents,AI,approvals,automation,workflow,notebooks,Jupyter,MCP,assistant,runtime

**Description (Apple and Google; 4,000 characters at most).** Google's full description is the longer plain text under *Google Play Console → Main store listing → Full description* above (28 October 2026); the short form below is Apple's, and the same claims:

> Datalayer puts the agents and applications you run on Datalayer in your pocket.
>
> When an agent needs your consent — to send an email, run a tool, reach a company in your name — Datalayer asks you on your phone. You see the whole request before you answer: who asks, what it will do, with which arguments. A notification never approves anything by itself, and an answer given elsewhere is never overwritten.
>
> - **Inbox.** Every approval waiting for you, oldest first, with the full request.
> - **Agents.** Your running applications and agents, live or paused, with what they are doing.
> - **Activity.** What each application did, is doing and has scheduled, with the times.
> - **Conversations.** Talk to an application or agent, follow its answer as it streams, and stop it.
> - **In your name.** The companies your applications act for you at, and a way to end that.
> - **Notifications.** Optional, and they carry no content: tapping one opens the item and reads it again.
>
> Datalayer works with a Datalayer account. Building applications stays on the web.

Each claim above is shipped in the app on the day of drafting; remove any that a release does not carry.

**In the consoles.** The account holders paste the words above:

1. Play Console → the app → *Grow users → Store presence → Main store listing*: *App name* `Datalayer` (unchanged), *Short description* and *Full description* as above; save, then send the change for review from *Publishing overview*.
2. App Store Connect → the app → *App Information*: *Name* `Datalayer` (unchanged) and *Subtitle*; then the version being prepared: *Promotional Text*, *Description* and *Keywords* as above. The name and subtitle change only with a version submitted for review; promotional text can change at any time.

## Review notes (Apple *App Review Information*, Google *App access*)

All functionality is behind sign-in with a Datalayer account. The review account exists (created 20 October 2026): a dedicated Datalayer account on an address the company owns, with a password, no customer data and no billing card. Its handle and password are entered in the consoles only, never in this repository. It holds credits granted by Datalayer for the review weeks, and:

- one application, *Mail assistant*, kept always on (a daily spend limit, so its computer runs the whole day), to see Agents, Activity and a conversation. Its only tool sends a mail with a fake sender: nothing is ever delivered, whatever the reviewer approves;
- one approval waiting: *Mail assistant* asks to send a mail to `team@example.com`, subject *Weekly update*, body *The review build is ready.* It stays pending until it is answered, so a new one is created before each submission if the last reviewer answered it.

Datalayer charges nothing in the app: there are no in-app purchases, subscriptions or external payment links.

**Text for the consoles** (Play Console → *App content → App access* → *All or some functionality is restricted* → add the instructions with the username and password; App Store Connect → the version → *App Review Information* → *Sign-in required*, username and password, and the same text in *Notes*):

> Sign in:
> 1. Open the app. The sign-in screen is the app's own.
> 2. Enter the username (handle) and password given with these notes in **Handle or email** and **Password**, and press **Sign in**. Do not use *Continue with GitHub*, *Google* or *LinkedIn*: the review account signs in with its username and password only.
> 3. The app opens on the Inbox, signed in.
>
> What you will see:
> - **Inbox**: one approval waiting. *Mail assistant* asks to send a mail to team@example.com ("Weekly update"). Open it to see the whole request: who asks, the tool and its arguments. **Approve** and **Reject** both work. The mail sender is a fake one: nothing is sent, whichever you choose. Once answered, the approval leaves the Inbox.
> - **Agents**: the application *Mail assistant*, kept running on Datalayer, with what it is doing.
> - **Activity**: what *Mail assistant* did and is doing, with the times.
> - **Conversations**: the conversation that asked for the approval. Open it, or start a new one with *Mail assistant* (for example "What can you do?") and follow its answer as it streams; **Stop** ends an answer. Asking it to send a mail creates a new approval in the Inbox.
> - **Settings**: notifications, *In your name* and *Delete account*. Please do not delete the review account.
>
> Notifications are optional: you may decline the system prompt, and everything above works without them. A notification carries no content; tapping one opens the item.

## Apple answers

| Question | Draft answer | Why |
|---|---|---|
| Export compliance: does the app use encryption? | It uses only encryption exempt from export documentation (HTTPS through the operating system); `ITSAppUsesNonExemptEncryption` is `false` | `app.config.ts`: `ios.config.usesNonExemptEncryption: false`; the app implements no cryptography of its own |
| Sign-in (Guideline 4.8) | **Open again (24 October 2026).** The user decided that day that the app signs in inside itself, with a Datalayer handle or email and password and with *Continue with GitHub*, *Google* and *LinkedIn*; the 19 October answer (Datalayer-only, one *Sign in with Datalayer* button) no longer holds. An app that offers a third-party or social login must also offer an equivalent privacy-preserving login (in practice *Sign in with Apple*), unless an exception applies. To decide before any iOS submission: add *Sign in with Apple*, or hide the three providers on iOS | iOS is off for now (Android only); Google Play has no such rule. |
| Account deletion (Guideline 5.1.1(v)) | In the app: *Settings → Delete account*, a request to IAM with a 30-day grace period, also on the web | Decided by the user 16 October 2026 |
| User-generated content (Guideline 1.2) | No public content; a person's applications and conversations are private to their account and the people it is shared with | — |
| Content rights | No third-party content is shown outside what the person's own applications produce | — |
| Generative AI | Applications answer with model-generated text; the app shows it as the application's answer | Confirm Apple's current disclosure questions at submission |

## Google answers

| Question | Draft answer | Why |
|---|---|---|
| App access | All functionality restricted: give the review account (above) and the steps in *Review notes* | Sign-in required |
| Ads | No ads | — |
| Content rating questionnaire | Category: utility/productivity. No violence, sexual content, profanity, drugs, gambling or simulated gambling. Users interact: no public interaction between users; sharing is by invitation. Shares location: no. Digital purchases: no | Expected rating: Everyone / PEGI 3 |
| Target audience | 18 and over; not designed for children | A Datalayer account is a work account |
| AI-generated content policy | Yes: under every complete answer of an application or an agent, **Report** asks why (*Offensive or harmful*, *Wrong or misleading*), then whether the answer's words go too, and sends the report to Datalayer support (`POST /api/support/v1/support/request`, signed in as the person) with where the answer was given: application, deployment and conversation, or agent and runtime. Its words are sent only when the person includes them | Proposed default, built; the product owner confirms it before production |
| Target API level | `targetSdk` 36 (Android 16), from React Native 0.86 under Expo SDK 57; `minSdk` 24 | Meets Play's requirement for new apps in 2026; check the requirement on the day |
| Data safety | See `privacy-and-store.md` | — |
| Account deletion | In the app and at the URL above | Decided 16 October 2026 |
| Government, financial, health features | None | — |

## Screenshots

Taken on real release builds, with the review account, never with customer data:

- iPhone 6.9" (Apple requires the largest size and scales it down) and iPad 13" (the app ships for iPad: `ios.supportsTablet` is `true` in `app.config.ts`);
- Android phone, 2 to 8, 16:9 or 9:16; the 1024 × 500 feature graphic is `visuals/feature-graphic-1024x500.png` and the 512 × 512 icon `visuals/app-icon-512.png` (both made 28 October 2026 from the Datalayer mark).

Suggested set: Inbox with one approval; the full approval with *Approve*/*Reject*; Agents; an application's Activity; a conversation streaming; *In your name*; Settings with notifications.

**Framed for the store (28 October 2026).** `scripts/store-visuals.py <artifact dir>` (Pillow, Debian's Roboto) writes `visuals/screenshots/0N-*.png`, and the tablet fields' landscape versions in `tablet-7/` (1920 × 1080) and `tablet-10/` (2560 × 1440) — the caption at the left, the capture at the right: a two-line caption and a sentence on the app's green (`--bgColor-accent-emphasis`), the capture scaled under them with rounded corners, running off the bottom edge, 1080 × 1920. The captions and which capture each uses are the `SHOTS` table in the script; regenerate after a new green Check run (`gh run download <run> -n store-screenshots -D <dir>`), look at each, and replace the files.

**Taken by CI.** The `store-screenshots` job of the Check workflow runs `.maestro/store/screenshots.yaml` on the e2e build, on a 1080 × 1920 (9:16) emulator with the status bar in demo mode, as the test account, on every push to `main` and when Check is dispatched. It shows the sign-in, the Inbox with a waiting mail, the complete request, the confirmation, Agents, Activity, an application, a conversation streaming and answered, and Settings; the approval it creates is rejected before it ends. The PNGs alone, through the token scrub, are the run's `store-screenshots` artifact (`gh run download <run> -n store-screenshots`). The e2e build offers the token sign-in a store build does not: the sign-in screenshot shows *Use an API token instead* under the handle-and-password form and above the three providers. Check each image before it goes to a store.

## Left with the account holders

- the records themselves (App Store Connect app, Play Console app), ownership and the team members; both are titled *Datalayer*, which stays;
- signing and submit credentials in EAS (the Android upload key the first versions were signed with, the iOS distribution certificate and profile, the App Store Connect API key, the Play service account), and the App Store Connect app id and Apple Team id in `eas.json` (placeholders until then);
- the review account's handle and password in both consoles, and a waiting approval on the day of review (a new one when the last reviewer answered it; the account and its application exist);
- the screenshots on real builds, and the submission;
- confirming the in-app **Report** above as Google's AI-generated content answer; and, for Apple 4.8, *Sign in with Apple* or no third-party provider on iOS (see the Apple answers).
