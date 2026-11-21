import { useEffect, useState } from "react";
import { Page, SectionTitle } from "../components/Chrome";

const FEATURES = [
  {
    id: "cards",
    title: "Custom Lit message cards",
    where: "packages/nc-lit-cards/src · apps/web/src/lib/nexconn-boot.ts",
    calls: ["NCChatUIApplication.initialize({ hooks })", "app.registerCustomMessages([...])  // before ready()", "app.ready()"],
    body: "Four Lit 3 web components render escrow, translation, assay and tribunal messages. Actions leave the Shadow DOM as a composed mudra-deal-action event that React handles once.",
  },
  {
    id: "stream",
    title: "Server stream messages",
    where: "services/nexconn-bridge-node/src/nexconn",
    calls: ["MessageManagementApi.sendGroupChannelStreamMessage({ fromUserId, toChannelId, messageType, content })", "MessageManagementApi.sendDirectChannelStreamMessage(...)"],
    body: "Translations and the tribunal verdict stream into the Group channel; the bargain arena streams into a Direct channel. Every outbound prompt is scrubbed of Aadhaar, PAN, phone and UPI handles first.",
  },
  {
    id: "freeze",
    title: "Channel freeze on dispute",
    where: "services/deal-engine-go (API-09) to bridge /internal/nc/moderation/freeze",
    calls: ["GroupChannelModerationApi.addGroupChannelFreezeList({ channelIds })", "GroupChannelModerationApi.removeGroupChannelFreezeList({ channelIds })"],
    body: "Raising a dispute moves the escrow FSM to DISPUTED_FROZEN, freezes the Group channel for a 90-second window and asks the tribunal model for a split.",
  },
  {
    id: "fsm",
    title: "Escrow state machine",
    where: "services/deal-engine-go/internal/fsm",
    calls: ["POST /api/v1/deals/:id/escrow/transition { action, expected_version }", "409 ERR_FSM_CONFLICT on stale version"],
    body: "Eight states, seven actions, optimistic version locking and idempotency keys. Each transition signs a hash-chained Ed25519 voucher.",
  },
  {
    id: "assay",
    title: "Live video assay",
    where: "apps/web/src/components/AssayLoupe.tsx · services/assay-verifier-rs",
    calls: ["POST /api/v1/deals/:id/assay/start", "POST /api/v1/deals/:id/assay/verify-frame", "Rust: 64-bit DCT pHash + 4096-point FFT motor RPM"],
    body: "The draggable loupe captures a frame and a slice of motor audio from the camera or the simulated HD stream; the verifier hashes the frame and measures RPM.",
  },
  {
    id: "open",
    title: "Open and Community channels",
    where: "API-12, API-13, API-14",
    calls: ["OpenChannelManagementApi.createOpenChannel({ channelId })", "OpenChannelPriorityControlsApi.addOpenChannelPrioritySenderList(...)", "CommunityChannelManagementApi.createCommunitySubchannel({ channelId, subchannelId })"],
    body: "Flash lots broadcast on an Open channel with priority senders; vertical marketplaces live in Community subchannels. ChatUI only renders Direct, Group and System, so these show in the sidebar via the Chat SDK.",
  },
];

const SETUP = [
  "Create an application at console.nexconn.ai and copy the App Key and Secret Key",
  "Put your Nexconn app key and secret key in the repo-root .env (the secret stays server-side, never in VITE_ variables)",
  "Enable Direct, Group, System, Community and Open channels, server stream messages and group freeze lists",
  "Add http://localhost:5173 to allowed origins",
  "Restart pnpm dev. The bridge health check switches from simulated to live",
];

export default function Guide() {
  const [sel, setSel] = useState(FEATURES[0].id);
  const [health, setHealth] = useState<string>("checking");
  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((j) => setHealth(JSON.stringify(j, null, 2)))
      .catch(() => setHealth("Deal engine unreachable on :4002"));
  }, []);
  const f = FEATURES.find((x) => x.id === sel)!;

  return (
    <Page>
      <SectionTitle title="SDK guide" sub="Every screen element mapped to the code and the Nexconn call behind it." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Features" className="space-y-1">
          {FEATURES.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`press block w-full rounded-md px-3 py-2 text-left text-[14px] ${sel === x.id ? "bg-paper text-ink" : "text-ink-2 hover:bg-paper"}`}>
              {x.title}
            </button>
          ))}
        </nav>
        <div className="space-y-6">
          <section className="rounded-xl border hairline bg-paper p-6">
            <h2 className="text-[20px] font-medium text-ink">{f.title}</h2>
            <p className="mt-2 max-w-[70ch] text-[15px] text-ink-2">{f.body}</p>
            <div className="num mt-4 text-[12.5px] text-ink-3">{f.where}</div>
            <pre className="num mt-3 overflow-x-auto rounded-lg bg-well p-4 text-[12.5px] text-ink">{f.calls.join("\n")}</pre>
          </section>
          <section className="rounded-xl border hairline bg-paper p-6">
            <h2 className="text-[17px] font-medium text-ink">Go live on Nexconn</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14.5px] text-ink-2">
              {SETUP.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </section>
          <section className="rounded-xl border hairline bg-paper p-6">
            <h2 className="text-[17px] font-medium text-ink">Service health</h2>
            <pre className="num mt-3 overflow-x-auto rounded-lg bg-well p-4 text-[12px] text-ink-2">{health}</pre>
          </section>
        </div>
      </div>
    </Page>
  );
}
