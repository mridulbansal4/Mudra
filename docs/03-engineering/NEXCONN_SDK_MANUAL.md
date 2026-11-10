# Official Nexconn SDK Integration Manual & Console Guide — SAMADHAN-OS (`SamvadDeal`)
> Project: **SAMADHAN-OS (`SamvadDeal`)** · Owner: Team `Chanakya` (Nexconn SDK Lead — Dev 1) · Status: Draft v0.1 · Last updated: 2026-11-10
> Related: [Project Brief](../00-overview/PROJECT_BRIEF.md) · [Architecture](./ARCHITECTURE.md) · [Integrations](./INTEGRATIONS.md) · [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md)

---

## 1. Purpose of This Manual

Nexconn SDK Integration accounts for **25% of the official judging rubric** (plus **15% for verified MAU traction** on `console.nexconn.ai`), and failing to genuinely integrate `@nexconn/chat` or `@nexconn/chatui` is a **hard disqualification gate**.

This manual provides the **exact, copy-paste-ready manual instructions and code patterns** derived from the official `NexconnAI-Dev` repositories (`nexconn-skills`, `nexconn-chatui-web`, `nexconn-call-sample-web`, `nexconn-server-sdk-node`) so our team and any AI coding agent never hallucinate Sendbird/Stream/Socket.io APIs.

---

## 2. Step-by-Step Manual Instructions for `https://console.nexconn.ai`

Before running `apps/web` or `services/nexconn-bridge-node`, perform these exact 7 manual steps in the Nexconn Developer Console:

### Step 1: Create Account & Application
1. Open [https://console.nexconn.ai](https://console.nexconn.ai) and sign in with the Team `Chanakya` master developer account.
2. Click **"Create Application"**:
   - **Application Name**: `SAMADHAN-OS-Production`
   - **Region / Data Center**: `Singapore (ap-southeast-1)` (closest edge to both Singapore's RCLOUD GLOBAL PTE. LTD. and India).
3. Once created, open **Application Overview → Credentials** and copy:
   - **`App Key`** → Paste into `.env` as `NEXCONN_APP_KEY` and `VITE_NEXCONN_APP_KEY` (and save for the Reskilll submission form!).
   - **`Secret Key`** → Paste **ONLY** into backend `.env` (`services/nexconn-bridge-node`) as `NEXCONN_SECRET_KEY`. **NEVER** expose `Secret Key` in `apps/web` or `VITE_*` variables!

### Step 2: Enable All 5 Channel Types in Chat Settings
1. In `console.nexconn.ai`, navigate to **Chat Service → Channel Settings**.
2. Verify all 5 channel types are toggled **ON**:
   - `[x] Direct Channel` (1-on-1 buyer-seller chat & `/arena` AI Shopkeeper)
   - `[x] Group Channel` (≤3,000 members; used for multi-party deal rooms + arbitrator dispatch + channel freeze)
   - `[x] System Channel` (Read-only user audit ledger for Ed25519 escrow/DPDP receipts)
   - `[x] Community Channel` (Unlimited members + category subchannels via `createCommunitySubchannel`)
   - `[x] Open Channel` (Unlimited concurrent online viewers for live flash-lot broadcasts + `OpenChannelPriorityControlsApi`)

### Step 3: Enable Server-Side Stream Messages & Moderation Freeze
1. Navigate to **Chat Service → Advanced Features / API Permissions**.
2. Enable **Server Stream Messages** (`/v4/direct-channel/message/stream/send` and `/v4/group-channel/message/stream/send`).
3. Enable **Group Moderation & Freeze Lists** (`/v4/group-channel/moderation/freeze/add`) and **Open Channel Priority Controls**.

### Step 4: Activate the 10,000 Free `@nexconn/call` Minutes (Credit Card Gate `Qx`)
1. As documented in `index-Dr3TP1Ui.js` (`Qx`), activating the Call SDK (`@nexconn/call@^26.2.0`) requires completing billing verification on `console.nexconn.ai`.
2. Navigate to **Billing / Credits → Claim Hackathon Credits** (or **Call Service → Activate**), add the verification card ($0 charge for the 10,000 free Call SDK minutes + 10,000 free Chat MAUs), and confirm **Audio & Video Call Service (`RTC`)** status shows **`Active (Green)`**.

### Step 5: Configure Domain Allowlist & WebRTC TURN
1. Navigate to **Security → CORS / Allowed Origins** and add:
   - `http://localhost:5173` (Local Vite Dev)
   - `https://samadhan-os.vercel.app` / `https://samadhan-os.dev` (Production Live App URL)

---

## 3. Package Matrix & Exact Installation Commands

### 3.1 Frontend (`apps/web/package.json` & `packages/nc-lit-cards/package.json`)
```bash
# Install inside apps/web
pnpm add @nexconn/chatui@^26.2.5 @nexconn/chat@^26.2.1 @nexconn/engine@^26.2.1 @nexconn/call@^26.2.0 lit@^3.3.2
```

| Package | Version | Supported Channels | What It Does in SAMADHAN-OS |
|---|---|---|---|
| `@nexconn/chatui` | `^26.2.5` | **ONLY** `Direct`, `Group`, `System` (`❌` No `Open`, `❌` No `Community`, `❌` No voice recording) | Renders `<nc-chat-ui-app-provider>` and hosts our 4 custom Lit `BaseMessageContent` cards (`registerMessageType`). |
| `@nexconn/chat` & `@nexconn/engine` | `^26.2.1` | **ALL 5**: `Direct`, `Group`, `System`, `Community`, `Open` | Powers `NCEngine.initialize` & `NCEngine.connect`, `Open` channel live flash-lot ticker, `Community` category subchannels (`createCommunitySubchannel`), and browser voice recording. |
| `@nexconn/call` | `^26.2.0` | Rides over active `NCEngine` connection | Powers `NCCallEngine` 1:1 audio calls, live escalation to HD video via `requestChangeMediaType(NCCallMediaType.VIDEO)`, and `onServerCallLogReceived`. |

### 3.2 Backend (`services/nexconn-bridge-node/package.json`)
```bash
# Install inside services/nexconn-bridge-node from official GitHub tag v0.1.2
pnpm add "git+https://github.com/NexconnAI-Dev/nexconn-server-sdk-node.git#v0.1.2"
```

---

## 4. The 5 Golden Boot & Lifecycle Rules (`nexconn-skills` Law)

Breaking any of these 5 rules causes silent failures. Every developer must follow them verbatim:

### Rule 1: Register Custom Lit Message Types BEFORE `app.ready()`
In `@nexconn/chatui@^26.2.5`, custom message components must subclass `BaseMessageContent` from `@nexconn/chatui` (using `lit@^3.3.2`) and MUST be registered inside `NCChatUIApplication.initialize({ hooks })` **before** `app.ready()` resolves:

```ts
// packages/nc-lit-cards/src/escrow-deal-card.ts
import { html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BaseMessageContent } from "@nexconn/chatui";

@customElement("nc-escrow-deal-card")
export class SamadhanEscrowCard extends BaseMessageContent {
  static styles = css`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
    }
    .vault-card {
      border: 1px solid rgba(28, 30, 38, 0.12);
      border-radius: 12px;
      padding: 20px;
      background: #FCFBF9;
    }
    .amount {
      font-family: var(--font-mono, monospace);
      font-variant-numeric: tabular-nums;
      font-size: 20px;
      font-weight: 600;
    }
    .sys-strip {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(28, 30, 38, 0.08);
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: #64687A;
    }
  `;

  @property({ type: Object }) accessor message: any;

  private dispatchDealAction(action: string) {
    this.dispatchEvent(
      new CustomEvent("samadhan-deal-action", {
        detail: { action, dealId: this.message?.customExtras?.dealId },
        bubbles: true,
        composed: true, // Crosses Lit Shadow DOM boundary into React 19!
      })
    );
  }

  render() {
    const extras = this.message?.customExtras ?? {};
    return html`
      <div class="vault-card" role="region" aria-label="Escrow milestone contract">
        <div class="header">
          <span>${extras.title ?? "Juki MO-6814S Overlock Machine"}</span>
          <span class="amount">₹${Number(extras.amountInr ?? 145000).toLocaleString("en-IN")}</span>
        </div>
        <div class="actions">
          <button @click=${() => this.dispatchDealAction("LOCK_ESCROW")}>Lock escrow</button>
          <button @click=${() => this.dispatchDealAction("VERIFY_VIDEO")}>Verify on live video</button>
          <button @click=${() => this.dispatchDealAction("RAISE_DISPUTE")}>Raise dispute</button>
        </div>
        <div class="sys-strip">
          [SYS-VOUCHER · STATE:${extras.fsmState ?? "LOCKED"} · ED25519:${extras.sigShort ?? "8f9a...2c1b"}]
        </div>
      </div>
    `;
  }
}
```

And register all 4 cards during boot in `apps/web/src/lib/nexconn-boot.ts`:
```ts
// apps/web/src/lib/nexconn-boot.ts
import { NCChatUIApplication, registerMessageType } from "@nexconn/chatui";
import { NCEngine } from "@nexconn/engine";
import { NCCallEngine, NCCallMediaType } from "@nexconn/call";
import {
  SamadhanEscrowCard,
  SamadhanBilingualBubble,
  SamadhanAssayReceipt,
  SamadhanTribunalVerdict,
} from "@samadhan/nc-lit-cards";

let bootPromise: Promise<void> | null = null;

export async function initializeSamadhanNexconnStack(params: {
  appKey: string;
  token: string;
  locale?: "en_US" | "zh_CN";
}): Promise<void> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    // STEP 1: Initialize ChatUI & register custom Lit cards BEFORE app.ready()
    const chatUIApp = NCChatUIApplication.initialize({
      language: params.locale ?? "en_US",
      hooks: {
        beforeReady() {
          registerMessageType("x-samadhan-escrow-card", SamadhanEscrowCard);
          registerMessageType("x-samadhan-bilingual-bubble", SamadhanBilingualBubble);
          registerMessageType("x-samadhan-assay-receipt", SamadhanAssayReceipt);
          registerMessageType("x-samadhan-tribunal-verdict", SamadhanTribunalVerdict);
        },
      },
    });
    await chatUIApp.ready();

    // STEP 2: Initialize & connect NCEngine FIRST (Mandatory prerequisite for Call SDK!)
    NCEngine.initialize({ appKey: params.appKey });
    await NCEngine.connect({ token: params.token });

    // STEP 3: Initialize NCCallEngine ONLY AFTER await NCEngine.connect({ token }) resolves
    const callEngine = NCCallEngine.getInstance();
    callEngine.onServerCallLogReceived((callLog) => {
      window.dispatchEvent(new CustomEvent("samadhan-call-log", { detail: callLog }));
    });
  })();

  return bootPromise;
}
```

### Rule 2: Await `NCEngine.connect({ token })` Before Touching `NCCallEngine`
As shown in Step 2 & Step 3 above, `@nexconn/call@^26.2.0` signals WebRTC SDP offers and ICE candidates over the active `NCEngine` IM socket. Calling `NCCallEngine.getInstance().startCall(...)` before `await NCEngine.connect({ token })` resolves will fail silently.

### Rule 3: Escalating Audio to Live Video Inspection (`requestChangeMediaType`)
When the user clicks **"Verify on live video"** inside `<nc-escrow-deal-card>`:
```ts
// apps/web/src/lib/call-assay.ts
import { NCCallEngine, NCCallMediaType, NCCallType } from "@nexconn/call";

export async function startLiveVideoInspection(counterpartyNexconnUserId: string) {
  const callEngine = NCCallEngine.getInstance();

  // Start 1:1 call with counterparty
  await callEngine.startCall({
    callType: NCCallType.SINGLE,
    mediaType: NCCallMediaType.AUDIO,
    targetId: counterpartyNexconnUserId,
  });

  // Escalate to HD Video for serial-number & defect inspection
  await callEngine.requestChangeMediaType(NCCallMediaType.VIDEO);
}
```

### Rule 4: Hybrid `<nc-chat-ui-app-provider>` + `NCEngine` (`Open` & `Community` Channels)
Never pass an `Open` or `Community` channel ID as the active channel to `<nc-chat-ui-app-provider>` (it only supports `Direct`, `Group`, and `System`). Instead, subscribe to `Open` flash-lot tickers and `Community` category subchannels using `@nexconn/chat` (`NCEngine`) directly and render them in our HeroUI v3 sidebar.

### Rule 5: Backend `@nexconn/server-sdk@0.1.2` Complete Reference Implementation
Here is the exact server-side TypeScript module in `services/nexconn-bridge-node/src/nexconn-sdk.ts`:

```ts
// services/nexconn-bridge-node/src/nexconn-sdk.ts
import {
  Configuration,
  UserManagementApi,
  MessageManagementApi,
  GroupChannelManagementApi,
  GroupChannelModerationApi,
  CommunityChannelManagementApi,
  OpenChannelManagementApi,
  OpenChannelPriorityControlsApi,
  SystemMessagesApi,
  ModerationApi,
} from "@nexconn/server-sdk";

const config = new Configuration({
  basePath: process.env.NEXCONN_API_BASE_URL ?? "https://api.nexconn.ai",
  headers: {
    appKey: process.env.NEXCONN_APP_KEY!,
    secretKey: process.env.NEXCONN_SECRET_KEY!,
  },
});

export const ncUserApi = new UserManagementApi(config);
export const ncMessageApi = new MessageManagementApi(config);
export const ncGroupApi = new GroupChannelManagementApi(config);
export const ncGroupModApi = new GroupChannelModerationApi(config);
export const ncCommunityApi = new CommunityChannelManagementApi(config);
export const ncOpenApi = new OpenChannelManagementApi(config);
export const ncOpenPriorityApi = new OpenChannelPriorityControlsApi(config);
export const ncSystemMsgApi = new SystemMessagesApi(config);
export const ncModerationApi = new ModerationApi(config);

// 1. Issue Real Access Token (POST /v4/auth/access-token/issue) -> Counts toward console.nexconn.ai MAU!
export async function issueNexconnToken(userId: string, name: string, portraitUri?: string) {
  return await ncUserApi.issueAccessToken({
    issueAccessTokenRequest: {
      userId,
      name,
      portrait: portraitUri ?? "https://api.samadhan-os.dev/avatars/default.png",
    },
  });
}

// 2. Stream Bilingual Translation or AI Tribunal Verdict into Group Channel
// (POST /v4/group-channel/message/stream/send)
export async function streamGroupDealMessage(params: {
  channelId: string;
  senderId: string;
  messageType: string; // e.g., "x-samadhan-bilingual-bubble" or "x-samadhan-tribunal-verdict"
  contentStream: string;
  customExtras: Record<string, unknown>;
}) {
  return await ncMessageApi.sendGroupChannelStreamMessage({
    sendGroupChannelStreamMessageRequest: {
      channelId: params.channelId,
      fromUserId: params.senderId,
      objectName: params.messageType,
      content: JSON.stringify({
        text: params.contentStream,
        customExtras: params.customExtras,
      }),
    },
  });
}

// 3. Stream Chanakya AI Shopkeeper Bargain Reply in Direct Channel (/arena)
// (POST /v4/direct-channel/message/stream/send)
export async function streamDirectArenaMessage(params: {
  fromUserId: string;
  targetUserId: string;
  text: string;
  customExtras: Record<string, unknown>;
}) {
  return await ncMessageApi.sendDirectChannelStreamMessage({
    sendDirectChannelStreamMessageRequest: {
      fromUserId: params.fromUserId,
      targetId: params.targetUserId,
      objectName: "RC:TxtMsg",
      content: JSON.stringify({ content: params.text, extra: params.customExtras }),
    },
  });
}

// 4. Freeze Group Channel Instantly on Dispute (POST /v4/group-channel/moderation/freeze/add)
export async function freezeDisputedDealChannel(channelId: string, frozenUserIds: string[]) {
  return await ncGroupModApi.addGroupChannelFreezeList({
    addGroupChannelFreezeListRequest: {
      channelId,
      userIds: frozenUserIds,
    },
  });
}
```
