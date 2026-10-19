# Store listing and review answers (draft)

What the App Store Connect and Google Play Console records of Datalayer Agents
say, drafted from the app as it is. The records, the ownership of the app, the
signing and submit credentials, the review account and the screenshots are the
account holders'.
Read Apple's and Google's live requirements again on the day of submission and
correct this file with what changed. Privacy and Data safety answers are in
[`privacy-and-store.md`](privacy-and-store.md). The process is in the README's
*Publish* section.

Drafted 16 October 2026; the app renamed **Datalayer Agents** on 19 October 2026.

## Identity

| Field | Value | Status |
|---|---|---|
| Name | Datalayer Agents | The name on the phone (`app.config.ts`) and in both stores |
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

> Datalayer Agents puts the agents and applications you run on Datalayer in your pocket.
>
> When an agent needs your consent — to send an email, run a tool, reach a company in your name — Datalayer Agents asks you on your phone. You see the whole request before you answer: who asks, what it will do, with which arguments. A notification never approves anything by itself, and an answer given elsewhere is never overwritten.
>
> - **Inbox.** Every approval waiting for you, oldest first, with the full request.
> - **Agents.** Your running applications and agents, live or paused, with what they are doing.
> - **Activity.** What each application did, is doing and has scheduled, with the times.
> - **Conversations.** Talk to an application or agent, follow its answer as it streams, and stop it.
> - **In your name.** The companies your applications act for you at, and a way to end that.
> - **Notifications.** Optional, and they carry no content: tapping one opens the item and reads it again.
>
> Datalayer Agents works with a Datalayer account. Building applications stays on the web.

Each claim above is shipped in the app on the day of drafting; remove any that a release does not carry.

## Review notes (Apple *App Review Information*, Google *App access*)

All functionality is behind sign-in with a Datalayer account. The reviewer signs in with *Sign in with Datalayer* using the review account below, which has no customer data and holds:

- one application kept running, to see Agents, Activity and a conversation;
- one approval waiting, created just before review, to see Inbox and the full request (*Approve* or *Reject* both work);
- notifications are optional; the reviewer may decline the system prompt.

Review account: **to be created by the account holders** (handle and password entered in the consoles, never in this repository). It must be a dedicated account with no real customer data and no billing card. Datalayer Agents charges nothing: there are no in-app purchases, subscriptions or external payment links in the app.

## Apple answers

| Question | Draft answer | Why |
|---|---|---|
| Export compliance: does the app use encryption? | It uses only encryption exempt from export documentation (HTTPS through the operating system); `ITSAppUsesNonExemptEncryption` is `false` | `app.config.ts`: `ios.config.usesNonExemptEncryption: false`; the app implements no cryptography of its own |
| Sign-in (Guideline 4.8) | **Open — needs a decision** | The app signs in through Datalayer's own web sign-in, which also offers third-party providers (GitHub, Google, LinkedIn and others). Guideline 4.8 asks for an equivalent privacy-preserving login option when an app's primary account uses a third-party login. Either IAM offers *Sign in with Apple* (or an equivalent meeting 4.8), or the phone's sign-in is shown as the Datalayer account only. Added to the open decisions. |
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
| AI-generated content policy | **Open:** the policy asks generative AI apps to let people report or flag offensive generated content from inside the app. The app has no report action yet | Needs a decision on where a report goes (support or an in-app *Report* on an answer) before production |
| Target API level | `targetSdk` 36 (Android 16), from React Native 0.86 under Expo SDK 57; `minSdk` 24 | Meets Play's requirement for new apps in 2026; check the requirement on the day |
| Data safety | See `privacy-and-store.md` | — |
| Account deletion | In the app and at the URL above | Decided 16 October 2026 |
| Government, financial, health features | None | — |

## Screenshots

Taken on real release builds, with the review account, never with customer data:

- iPhone 6.9" (Apple requires the largest size and scales it down) and iPad 13" (the app ships for iPad: `ios.supportsTablet` is `true` in `app.config.ts`);
- Android phone, 2 to 8, 16:9 or 9:16; a 1024 × 500 feature graphic.

Suggested set: Inbox with one approval; the full approval with *Approve*/*Reject*; Agents; an application's Activity; a conversation streaming; *In your name*; Settings with notifications.

## Left with the account holders

- the records themselves (App Store Connect app, Play Console app), ownership and the team members;
- signing and submit credentials in EAS, and the `staging` environment of the EAS project (`@datalayer-mobile/datalayer-mobile`);
- the review account, its application and a waiting approval on the day of review;
- the screenshots on real builds, and the submission;
- the two open answers above: Apple 4.8 sign-in, Google's in-app report of generated content.
