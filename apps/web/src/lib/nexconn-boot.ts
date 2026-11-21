/**
 * Live Nexconn boot (only when the bridge issued a real token, i.e. `mode === "live"`).
 *
 * Order matters (NEXCONN_SDK_MANUAL golden rules, adjusted to the real SDK surface of
 * @nexconn/chatui 26.2.5 / @nexconn/chat 26.2.1 / @nexconn/call 26.2.1):
 *   1. NCChatUIApplication.initialize({ hooks })
 *   2. app.registerCustomMessages([...MUDRA cards])   - must happen before ready()
 *   3. app.ready()                                        - defines the custom elements
 *   4. NCEngine.initialize({ appKey }) + await NCEngine.connect({ token })
 *   5. NCCallEngine.initialize(...)                       - only after connect resolves
 *
 * The SDKs are dynamically imported so simulated mode never downloads them.
 */
import { MUDRA_MESSAGE_TYPES, defineMudraCards } from "@mudra/nc-lit-cards";

export type NexconnStatus = "simulated" | "connecting" | "connected" | "error";

let boot: Promise<NexconnStatus> | null = null;

export function bootNexconn(params: { appKey?: string; token?: string; mode?: string; userName?: string }): Promise<NexconnStatus> {
  if (boot) return boot;
  if (params.mode !== "live" || !params.appKey || !params.token) {
    defineMudraCards();
    boot = Promise.resolve("simulated");
    return boot;
  }
  boot = (async () => {
    try {
      const [{ NCChatUIApplication }, chat] = await Promise.all([import("@nexconn/chatui"), import("@nexconn/chat")]);
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
        MUDRA_MESSAGE_TYPES.map((t) => ({
          messageType: t.messageType,
          isPersisted: true,
          isCounted: true,
          digest: () => t.digest,
          component: { tagName: t.tagName, elementClass: t.elementClass },
        })),
      );
      app.ready();

      const NCEngine = (chat as unknown as { NCEngine: { initialize(p: { appKey: string }): void; connect(p: { token: string }): Promise<{ code?: number }> } }).NCEngine;
      NCEngine.initialize({ appKey: params.appKey! });
      const res = await NCEngine.connect({ token: params.token! });
      if (res && typeof res.code === "number" && res.code !== 0) throw new Error(`NCEngine.connect failed with code ${res.code}`);

      try {
        const call = await import("@nexconn/call");
        (call as unknown as { NCCallEngine: { initialize(p: Record<string, unknown>): unknown } }).NCCallEngine.initialize({});
      } catch (e) {
        console.warn("[nexconn] Call SDK unavailable; video assay falls back to local capture", e);
      }
      return "connected" as const;
    } catch (e) {
      console.error("[nexconn] live boot failed, falling back to simulated rendering", e);
      defineMudraCards();
      return "error" as const;
    }
  })();
  return boot;
}
