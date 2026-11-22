/**
 * Live Nexconn boot (only when the bridge issued a real token, i.e. `mode === "live"`).
 *
 * Order matters. Verified against the real SDK surface of
 * @nexconn/chat 26.2.1 / @nexconn/chatui 26.2.5 / @nexconn/call 26.2.1:
 *   1. NCEngine.initialize({ appKey })                 - must run first: NCChatUIApplication.initialize
 *                                                        returns null if the engine is not initialized yet
 *   2. NCChatUIApplication.initialize({ hooks })
 *   3. app.registerCustomMessages([...MUDRA cards])    - must happen before ready()
 *   4. app.ready()                                     - defines the custom elements
 *   5. NCEngine.addMessageHandler / addConnectionStatusHandler
 *   6. await NCEngine.connect({ token })               - opens the Nexconn WebSocket
 *   0. NCCallEngine.install()                          - before NCEngine.initialize (Call SDK requirement)
 *   7. NCCallEngine.initialize(...)                    - only after connect resolves
 *
 * The SDKs are dynamically imported so simulated mode never downloads them.
 */
import { MUDRA_MESSAGE_TYPES, defineMudraCards } from "@mudra/nc-lit-cards";
import type { NCCallEngine } from "@nexconn/call";

export type NexconnStatus = "simulated" | "connecting" | "connected" | "error";

/** One event observed on the client SDK, for on-screen proof (session log, badges). */
export type NexconnEvent =
  | { kind: "connected"; userId: string }
  | { kind: "message"; messageId: string; messageType: string; senderUserId: string }
  | { kind: "stream"; messageId: string; phase: "init" | "complete"; code?: number }
  | { kind: "status"; status: string; code?: number }
  | { kind: "call"; phase: "ringing" | "incoming" | "connected" | "ended" | "failed"; callId?: string; detail?: string }
  | { kind: "error"; message: string };

type Listener = (e: NexconnEvent) => void;
const listeners = new Set<Listener>();
const history: NexconnEvent[] = [];
const emit = (e: NexconnEvent) => {
  history.push(e);
  if (history.length > 50) history.shift();
  for (const l of listeners) l(e);
};

/** Subscribe to client-SDK events. Replays the latest connect/error so late subscribers see the current state. */
export function onNexconnEvent(cb: Listener): () => void {
  const last = [...history].reverse().find((e) => e.kind === "connected" || e.kind === "error");
  if (last) cb(last);
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let boot: Promise<NexconnStatus> | null = null;
let bootToken: string | null = null;
let engineRef: Engine | null = null;
let connectedUserId: string | null = null;
export const nexconnUserId = () => connectedUserId;
let callEngineRef: NCCallEngine | null = null;
/** The live NCCallEngine, or null when the Call SDK isn't booted (simulated mode, boot error). */
export const getCallEngine = () => callEngineRef;
export const emitNexconnEvent = (e: NexconnEvent) => emit(e);

type Engine = {
  initialize(p: { appKey: string }): void;
  disconnect?(): Promise<void>;
  connect(p: { token: string }): Promise<{ code?: number; isOk?: boolean; msg?: string; data?: { userId?: string } }>;
  addMessageHandler?(id: string, handler: unknown): void;
  addConnectionStatusHandler?(id: string, handler: unknown): void;
};
type HandlerCtor = new (params: Record<string, unknown>) => unknown;

export function bootNexconn(params: { appKey?: string; token?: string; mode?: string; userName?: string }): Promise<NexconnStatus> {
  // A new live token (another user, e.g. after "Reset deal") reconnects the already-initialized engine.
  if (boot && params.mode === "live" && params.token && bootToken && params.token !== bootToken) {
    const token = params.token;
    bootToken = token;
    boot = boot.then(async (prev) => {
      if (prev !== "connected" || !engineRef) return prev;
      try {
        await engineRef.disconnect?.();
        return await connectWith(engineRef, token);
      } catch (e) {
        emit({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        return "error" as const;
      }
    });
    return boot;
  }
  if (boot) return boot;
  if (params.mode !== "live" || !params.appKey || !params.token) {
    defineMudraCards();
    boot = Promise.resolve("simulated");
    return boot;
  }
  bootToken = params.token;
  boot = (async () => {
    try {
      const [{ NCChatUIApplication }, chat, callSdk] = await Promise.all([
        import("@nexconn/chatui"),
        import("@nexconn/chat"),
        import("@nexconn/call").catch(() => null),
      ]);
      const sdk = chat as unknown as { NCEngine: Engine; MessageHandler?: HandlerCtor; ConnectionStatusHandler?: HandlerCtor };
      const NCEngine = sdk.NCEngine;
      engineRef = NCEngine;

      // 0. Call SDK plumbing must be installed before NCEngine.initialize.
      try {
        callSdk?.NCCallEngine.install();
      } catch (e) {
        console.warn("[nexconn] NCCallEngine.install failed", e);
      }

      // 1. Engine first.
      NCEngine.initialize({ appKey: params.appKey! });

      // 2–4. Chat UI with the four Mudra Lit cards registered before ready().
      const app = NCChatUIApplication.initialize({
        language: "en_US",
        hooks: {
          reqUserProfiles: async (ids: string[]) => ids.map((id) => ({ userId: id, name: id, portraitUri: "" })) as never,
          reqGroupProfiles: async (ids: string[]) => ids.map((id) => ({ groupId: id, name: id, portraitUri: "" })) as never,
          reqSystemProfiles: async (ids: string[]) => ids.map((id) => ({ targetId: id, name: "MUDRA vault", portraitUri: "" })) as never,
        } as never,
      });
      if (!app) throw new Error("NCChatUIApplication.initialize returned null");
      app.registerCustomMessages(
        MUDRA_MESSAGE_TYPES.map((t) => {
          // Pages may already have defined the cards (main.tsx does in simulated mode). A constructor can only be
          // defined once, so Chat UI gets a subclass under an alias tag; both render the same Lit card.
          const taken = Boolean(customElements.get(t.tagName));
          const component = taken
            ? { tagName: `${t.tagName}-ncui`, elementClass: class extends (t.elementClass as unknown as CustomElementConstructor) {} as unknown as typeof t.elementClass }
            : { tagName: t.tagName, elementClass: t.elementClass };
          return { messageType: t.messageType, isPersisted: true, isCounted: true, digest: () => t.digest, component };
        }),
      );
      app.ready();

      // 5. Listen for what arrives over the Nexconn WebSocket (shown in the sandbox session log).
      if (sdk.MessageHandler && NCEngine.addMessageHandler) {
        NCEngine.addMessageHandler(
          "mudra-proof",
          new sdk.MessageHandler({
            onMessageReceived: ({ messages }: { messages: { messageId: string; messageType: string; senderUserId: string }[] }) => {
              for (const m of messages) emit({ kind: "message", messageId: m.messageId, messageType: m.messageType, senderUserId: m.senderUserId });
            },
            onStreamMessageRequestInit: ({ messageId }: { messageId: string }) => emit({ kind: "stream", messageId, phase: "init" }),
            onStreamMessageRequestComplete: ({ messageId, code }: { messageId: string; code: number }) => emit({ kind: "stream", messageId, phase: "complete", code }),
          }),
        );
      }
      if (sdk.ConnectionStatusHandler && NCEngine.addConnectionStatusHandler) {
        NCEngine.addConnectionStatusHandler(
          "mudra-proof",
          new sdk.ConnectionStatusHandler({
            onConnectionStatusChanged: ({ status, code }: { status: unknown; code?: number }) => emit({ kind: "status", status: String(status), code }),
          }),
        );
      }

      // 6. Connect.
      await connectWith(NCEngine, params.token!);

      // 7. Call SDK on top of the live engine session, used for the 1:1 inspection call.
      try {
        if (callSdk) callEngineRef = callSdk.NCCallEngine.initialize({});
      } catch (e) {
        console.warn("[nexconn] Call SDK unavailable; video assay falls back to local capture", e);
      }
      return "connected" as const;
    } catch (e) {
      console.error("[nexconn] live boot failed, falling back to simulated rendering", e);
      emit({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      defineMudraCards();
      return "error" as const;
    }
  })();
  return boot;
}

/**
 * Reads the latest messages of a Group channel through the browser Chat SDK
 * (BaseChannel.createMessagesQuery). Used as on-screen proof that deal messages live in Nexconn.
 * Returns [] when not connected.
 */
export async function readGroupHistory(channelId: string, pageSize = 20): Promise<{ messageId: string; messageType: string; senderUserId: string }[]> {
  if (!engineRef || !connectedUserId) return [];
  const chat = (await import("@nexconn/chat")) as unknown as {
    BaseChannel: { createMessagesQuery(p: Record<string, unknown>): { loadNextPage(): Promise<{ isOk?: boolean; data?: unknown }> } };
    GroupChannelIdentifier: new (id: string) => unknown;
  };
  const query = chat.BaseChannel.createMessagesQuery({ channelIdentifier: new chat.GroupChannelIdentifier(channelId), pageSize });
  const res = await query.loadNextPage();
  if (!res?.isOk) return [];
  const raw = res.data as { data?: unknown[] } | unknown[] | undefined;
  const list = (Array.isArray(raw) ? raw : raw?.data ?? []) as { messageId: string; messageType: string; senderUserId: string }[];
  return list.map((m) => ({ messageId: m.messageId, messageType: m.messageType, senderUserId: m.senderUserId }));
}

async function connectWith(engine: Engine, token: string): Promise<NexconnStatus> {
  const res = await engine.connect({ token });
  if (res && typeof res.code === "number" && res.code !== 0) throw new Error(`NCEngine.connect failed with code ${res.code}${res.msg ? ` (${res.msg})` : ""}`);
  connectedUserId = res?.data?.userId ?? null;
  emit({ kind: "connected", userId: connectedUserId ?? "unknown" });
  return "connected";
}
