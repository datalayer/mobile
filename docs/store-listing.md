# Store listing and review answers (draft)

What the App Store Connect and Google Play Console records of Datalayer
say, drafted from the app as it is. The records, the ownership of the app, the
signing and submit credentials, the review account and the screenshots are the
account holders'.
Read Apple's and Google's live requirements again on the day of submission and
correct this file with what changed. Privacy and Data safety answers are in
[`privacy-and-store.md`](privacy-and-store.md). The process is in the README's
*Publish* section.

Drafted 16 October 2026. On 19 October 2026 the app's name became **Datalayer**, on the phone and in both stores, which is what the store records were already titled, so no listing is renamed.

## Identity

| Field | Value | Status |
|---|---|---|
| Name (App Store Connect *Name*, 30 characters at most; Play *App name*, 30 characters at most) | Datalayer | The name on the phone (`app.config.ts`) and in both stores; _Datalayer Dev_ and _Datalayer Preview_ for the side-by-side builds, which are never listed |
| iOS bundle id / Android package | `ai.datalayer.mobile` | Decided in `app.config.ts`; kept once a store record exists |
| Category | Productivity (Apple and Google) | Draft |
| Age rating | 4+ (Apple), Everyone / PEGI 3 (Google, from the questionnaire below) | Draft |
| Support URL | `https://datalayer.ai/support` | Live for browsers; see the status note below |
| Privacy policy URL | `https://datalayer.ai/privacy` | Live for browsers; see the status note below |
| Account deletion URL | `https://datalayer.ai/settings/profile/danger` (the web's *Delete account*; the app has *Settings → Delete account*) | Live for browsers (IAM 1.1.82 on prod1 since 16 October 2026); see the status note below |
| Marketing URL | `https://datalayer.ai` | Live |

**The URLs' HTTP status (checked 16 October 2026).** datalayer.ai is a single-page site on S3 behind CloudFront. Its viewer-request function serves the page with **200** only to a request whose `Accept` names `text/html`, as browsers and Googlebot send. Any other request — `curl` with its `Accept: */*`, a link checker, a crawler without `text/html` — gets S3's **404** (`NoSuchKey`) for `/support`, `/privacy`, `/settings/profile/danger` and `/docs/mobile-app`. Google Play's privacy-policy check and App Review open the pages as browsers, but a check that reads the status code with `*/*` would fail the submission. Before submitting, either the function also serves the page to extensionless paths outside `/.well-known/` (which must keep serving `apple-app-site-association` and `assetlinks.json` as files), or each URL is confirmed 200 with the store's own checker. That change to the production distribution is a website deploy, the website owner's.

## Words

**Apple subtitle (30 characters at most):** Your agents, in your pocket

**Google short description (80 characters at most):** Answer your agents' approvals and follow your running applications from your phone.

**Apple promotional text (170 characters at most):** Approve or reject what your Datalayer agents ask, the whole request in view. Follow your applications' activity, and talk to them, wherever you are.

**Apple keywords (100 characters at most):** agents,AI,approvals,automation,workflow,notebooks,Jupyter,MCP,assistant,runtime

**Description (Apple and Google; 4,000 characters at most):**

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
- Android phone, 2 to 8, 16:9 or 9:16; a 1024 × 500 feature graphic.

Suggested set: Inbox with one approval; the full approval with *Approve*/*Reject*; Agents; an application's Activity; a conversation streaming; *In your name*; Settings with notifications.

**Taken by CI.** The `store-screenshots` job of the Check workflow runs `.maestro/store/screenshots.yaml` on the e2e build, on a 1080 × 1920 (9:16) emulator with the status bar in demo mode, as the test account, on every push to `main` and when Check is dispatched. It shows the sign-in, the Inbox with a waiting mail, the complete request, the confirmation, Agents, Activity, an application, a conversation streaming and answered, and Settings; the approval it creates is rejected before it ends. The PNGs alone, through the token scrub, are the run's `store-screenshots` artifact (`gh run download <run> -n store-screenshots`). The e2e build offers the token sign-in a store build does not: the sign-in screenshot shows *Use an API token instead* under the handle-and-password form and above the three providers. Check each image before it goes to a store.

## Left with the account holders

- the records themselves (App Store Connect app, Play Console app), ownership and the team members; both are titled *Datalayer*, which stays;
- signing and submit credentials in EAS (the Android upload key the first versions were signed with, the iOS distribution certificate and profile, the App Store Connect API key, the Play service account), and the App Store Connect app id and Apple Team id in `eas.json` (placeholders until then);
- the review account's handle and password in both consoles, and a waiting approval on the day of review (a new one when the last reviewer answered it; the account and its application exist);
- the screenshots on real builds, and the submission;
- confirming the in-app **Report** above as Google's AI-generated content answer; and, for Apple 4.8, *Sign in with Apple* or no third-party provider on iOS (see the Apple answers).
