# Shared inventory (MOBILE.md M-002)

Every v1 screen against what Datalayer Core, Agent Runtimes and Primer Addons
already own, classified as MOBILE.md §4.1 asks: **reuse unchanged** (a portable
export the phone and the web both read), **split** (one controller or contract
in the owning repository, a native renderer here and the web's there) or
**mobile-only** (navigation, device and push concerns, or a strict projection
adapter §4.5 allows). Jupyter/web-only surfaces are listed last: the phone never
imports them.

## The approved boundary

Three entries, and nothing else of those packages, reach the phone:

| Entry | Owner | What it holds |
|---|---|---|
| `@datalayer/core/lib/portable` | Core (≥ 1.2.20) | `personOf`; loading, empty and problem states (`Problem`, `PROBLEM_WORDS`, `STATE_WORDS`, `problemOf`, `retries`, `kindOfStatus`, `detailOf`) |
| `@datalayer/agent-runtimes/lib/portable` | Agent Runtimes (≥ 1.5.44) | approvals and the approval card, the AG-UI stream, the conversation reducer and its views, presence, protocol displays, Direct Conversations, sign-in status and protected input, run measures, Session and agent clients, Activity, the deployment lifecycle, agent runtimes and the agent summary |
| `@datalayer/primer-addons/lib/theme/portable` | Primer Addons (≥ 1.0.40) | theme tokens as CSS-variable maps, colours, indicators, font stacks, the LOOP eyes' geometry |

How each is held there:

- **Source gate** (`scripts/check-forbidden-imports.js`, in `npm run check`):
  the app imports no other path of those packages, and no Jupyter, JupyterLab,
  Lumino or Datalayer Jupyter package.
- **Resolved-bundle gate** (`scripts/check-bundle.js`, `npm run check:bundle`):
  what Metro put in the iOS and Android bundles, read from their source maps.
- **The owners' own tests**: Agent Runtimes' `portable.unit.test.ts` refuses a
  module of `src/portable` reaching anything outside its folder or any package
  at run time; Core's refuses any import but its folder and the pure `Person`
  model.
- **The Expo/Hermes proof** (CI job `hermes` in `.github/workflows/check.yaml`):
  `scripts/hermes-proof/index.ts` imports only the three entries; this app's
  Metro bundles it for iOS and Android (`expo export:embed`, no alias, shim or
  polyfill in `metro.config.js`), the bundle gate reads its source maps, the
  `hermesc` React Native ships compiles it, and the Hermes VM built from the
  tag React Native pins (`sdks/.hermesv1version`) runs it with no React Native
  runtime. Each entry's pure functions are called and checked
  (`scripts/hermes-proof/proof.ts`; the same checks run under Jest). First held
  in run 38842503111 (16 October 2026). `hermesc` warns of the host globals
  some portable functions use when called — `fetch`, `URL`,
  `URLSearchParams`, `Promise` — which React Native provides; none is used
  while a module loads.

## Screens

| Screen | Core | Agent Runtimes | Primer Addons | Mobile-only |
|---|---|---|---|---|
| Sign-in (`app/sign-in.tsx`) | **reuse**: `personOf` (IAM's `me`), `isProblem` | — | **reuse**: theme, LOOP eyes | OAuth PKCE (`src/auth`), secure token store, the private-scheme redirect |
| Inbox (`(tabs)/inbox.tsx`) | **reuse**: states | **reuse**: `actionOf`, `messageOfApproval`, `whyAsked`; **split**: approval card (`approvalCardOf` / `ApprovalCardProps`, a native renderer) | **reuse**: theme | the realtime socket's query invalidation, badge |
| Approval detail (`approvals/[approvalId].tsx`) | **reuse**: `Problem`, `problemOf` | **split**: approval card; **reuse**: `argumentsShown` (raw fallback) | — | the refetch-before-decision flow (`features/approvals/decision.ts`), typed PAP/UCP/ACP proposal codecs (`src/protocols`, §4.5) |
| Agents (`(tabs)/agents.tsx`) | **reuse**: states | **reuse**: `agentRuntimesOf`, `runtimeOf`, `isAgentRuntime`, `AgentRuntime`; `AgentSummaryData`/`isCreatingAgent` as the web's `AgentSummary` reads them | **reuse**: theme | applications grouped from ai-agents' deployments (`applicationsOf`), *Shared with you* |
| Application detail (`apps/[appUid]/index.tsx`) | **reuse**: `Problem` | **reuse**: lifecycle (`stateChangeBody`, `stoppedWorkLine`, `resetCountsOf`, `resetLines`, `resetBody`, `notDeletedOf`, `deploymentEventOf`/`Line`); the person's threads (`askedOf`) | **reuse**: eyes (`AppFace`) | the confirmation sheets; Rules and Permissions of the exact Appspec (`api/appPermissions.ts`, a strict projection) |
| Application → Protocols (`apps/[appUid]/protocols.tsx`) | **reuse**: `Problem` | — | — | strict codec of ai-agents' `speaks` (registry entries and the identity check are the server's, M-045b), protocol connections and activity projections (§4.5) |
| Activity (`(tabs)/activity.tsx`) | **reuse**: states | **reuse**: `activityOf`, `mergeActivityPages`, `entrySaid`, `scheduledSays`, `ACTIVITY_WORDS`, `activityFixture` | — | localised time (`src/i18n/time.ts`), the faces of the applications listed |
| A thread reopened (`apps/[appUid]/sessions/[sessionUid].tsx`) | **reuse**: states | **reuse**: the thread projection (`askedOf`, `RUN_END_WORDS`) and the conversation below | — | where the thread continues, as ai-agents locates it (`/reach`), never a remembered runtime |
| Conversation (`agents/[runtimeName]/conversation.tsx`, app threads) | **reuse**: `Problem` | **reuse**: `reduceConversation`, `emptyConversation`, `readRunStream`, `agentRunClient`, `appSessionsClient`, `agentRuntimesUrlOf`, `RunMeter`, `otlpMetricsOf`; **split**: views (`composerOf`, `messageLabel`, `toolLabel`, `presenceLine`, `ConversationViewProps` and the row props, rendered natively; `conversationFixture` shared), protocol displays (`protocolDisplayOf`, `displayLine`, `unifiedDiffLines`), Direct Conversations (`directClient`), sign-in status and protected input | **reuse**: theme | the in-memory conversation registry, app-state pause/resume, the Markdown subset, QR rendering, mediated form inputs |
| Settings, notifications, In your name (`settings/*`) | **reuse**: states | — | **reuse**: theme | push registration, categories and quiet hours over the ai-agents WebSocket, privacy links; In your name is a strict IAM projection (§4.5) |

The web reads the same contracts: the Studio's Activity, the record and a
deployment's pause, reset and events (`landings/datalayer/ui` `appRecords.ts`,
`appDeployments.ts`), Agent Runtimes' `ChatBase`, `useChat` and `ChatInline`
(`reduceConversation`), `AgentSummary` (`isCreatingAgent`) and the approval
helpers.

## Web/Jupyter only, never imported

Notebooks, cells and kernels; Lumino widgets; the sandbox `ServiceManager`;
notebook tool surfaces; `ChatHeader`'s kernel integration; `useAgentRuntimes`
in its Jupyter-dependent form; Reactor UI (`@datalayer/reactor/ui`) — a phone
renders displays from `portable/displays`, not Reactor's components; the
landing's Primer web components. A file question in a conversation is sent to
the web.
